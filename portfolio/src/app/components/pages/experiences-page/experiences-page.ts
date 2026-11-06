import {
  Component,
  computed,
  DestroyRef,
  ElementRef,
  HostListener,
  inject,
  signal,
  viewChild
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { TranslatePipe } from '@ngx-translate/core';
import { Subscription, distinctUntilChanged, filter, take } from 'rxjs';
import { SectionHero } from '../../shared/section-hero/section-hero';
import { ExperienceCard } from '../../shared/experience-card/experience-card';
import { ExperienceLoader } from '../../shared/experience-loader/experience-loader';
import {
  FilterRail,
  FilterRailOption
} from '../../shared/filter-rail/filter-rail';
import { Experience } from '@common/models/experience.model';
import { getGlossaryInfoKey } from '@common/constants/glossary';
import { ExperiencesApi } from '../../../services/api/experiences-api';
import { AppStateService } from '../../../services/app-state';
import { PageSwipeService } from '../../../services/page-swipe';
import { LanguageService } from '../../../services/language';

@Component({
  selector: 'app-experiences-page',
  standalone: true,
  imports: [
    SectionHero,
    ExperienceCard,
    ExperienceLoader,
    FilterRail,
    TranslatePipe
  ],
  templateUrl: './experiences-page.html',
  styleUrls: ['./experiences-page.scss']
})
export class ExperiencesPage {
  private static readonly ENTRANCE_DURATION_MS = 2000;
  private static readonly CARD_SETTLE_DURATION_MS = 600;
  private static readonly FIRST_EXPERIENCE_OPEN_DELAY_MS = 1000;
  private static readonly WHEEL_LINE_HEIGHT_PX = 16;

  readonly appState = inject(AppStateService);
  private readonly pageSwipe = inject(PageSwipeService);
  private readonly swipeSettled$ = toObservable(this.pageSwipe.isSwiping).pipe(
    filter((isSwiping) => !isSwiping),
    take(1)
  );
  private swipeWait: Subscription | undefined;
  private readonly experienceList = viewChild<ElementRef<HTMLElement>>('experienceList');
  readonly experiences = signal<Experience[]>([]);
  readonly isLoading = signal<boolean>(true);
  readonly loadError = signal<string | null>(null);
  readonly isEntranceAnimating = signal<boolean>(false);

  readonly selectedTechnologyTags = signal<string[]>([]);
  private entranceTimer: ReturnType<typeof setTimeout> | undefined;
  private firstExperienceTimer: ReturnType<typeof setTimeout> | undefined;

  readonly availableTechnologyTags = computed(() => {
    const tags = this.experiences().flatMap((experience) =>
      experience.technologies.map((technology) => technology.name)
    );

    return [...new Set(tags)].sort((a, b) => a.localeCompare(b));
  });

  readonly technologyFilterOptions = computed<FilterRailOption[]>(() =>
    this.availableTechnologyTags().map((technology) => ({
      value: technology,
      label: technology,
      infoKey: getGlossaryInfoKey(technology)
    }))
  );

  readonly filteredExperiences = computed(() => {
    const selectedTags = this.selectedTechnologyTags();

    if (!selectedTags.length) {
      return this.experiences();
    }

    const selectedTagSet = new Set(selectedTags);

    return this.experiences().filter((experience) =>
      experience.technologies.some((technology) => selectedTagSet.has(technology.name))
    );
  });

  constructor(
    private readonly experiencesApi: ExperiencesApi,
    languageService: LanguageService,
    destroyRef: DestroyRef
  ) {
    destroyRef.onDestroy(() => this.cancelEntranceAnimation());

    toObservable(languageService.currentLanguage)
      .pipe(distinctUntilChanged(), takeUntilDestroyed())
      .subscribe(() => this.loadExperiences());
  }

  private loadExperiences(): void {
    this.isLoading.set(true);
    this.loadError.set(null);
    this.cancelEntranceAnimation();

    this.experiencesApi.getExperiences().subscribe({
      next: (experiences) => {
        const collapsedExperiences = experiences.map((experience) => ({
          ...experience,
          isExpanded: false
        }));

        this.experiences.set(collapsedExperiences);
        this.keepExistingTechnologyFilters(experiences);
        this.isLoading.set(false);

        if (experiences.length) {
          this.startEntranceAnimation();
        } else {
          console.warn('ExperiencesPage: no experiences available on load.');
        }
      },
      error: (error: unknown) => {
        this.cancelEntranceAnimation();
        console.error('ExperiencesPage: failed to load experiences.', error);
        this.experiences.set([]);
        this.selectedTechnologyTags.set([]);
        this.loadError.set('experiences.loadError');
        this.isLoading.set(false);
      }
    });
  }

  entranceAnimationDelay(index: number, total: number): string {
    if (total <= 1) {
      return '0ms';
    }

    const availableDelay =
      ExperiencesPage.ENTRANCE_DURATION_MS -
      ExperiencesPage.CARD_SETTLE_DURATION_MS;

    return `${Math.round((index / (total - 1)) * availableDelay)}ms`;
  }

  entranceAnimationDuration(total: number): string {
    const duration = total <= 1
      ? ExperiencesPage.ENTRANCE_DURATION_MS
      : ExperiencesPage.CARD_SETTLE_DURATION_MS;

    return `${duration}ms`;
  }

  // On desktop the page has a fixed height and only the list scrolls, so a
  // wheel over the hero, filters or margins is routed to the list. Wheels the
  // list or a nested scroller (e.g. the filter rail) already handle are left alone.
  @HostListener('wheel', ['$event'])
  onPageWheel(event: WheelEvent): void {
    const list = this.experienceList()?.nativeElement;

    if (
      !list ||
      event.defaultPrevented ||
      event.ctrlKey ||
      Math.abs(event.deltaY) <= Math.abs(event.deltaX) ||
      (event.target instanceof Node && list.contains(event.target)) ||
      list.scrollHeight <= list.clientHeight
    ) {
      return;
    }

    event.preventDefault();
    list.scrollBy({ top: this.wheelDeltaInPixels(event, list) });
  }

  toggleExperience(experienceId: string): void {
    if (!experienceId) {
      console.warn('ExperiencesPage: empty experienceId ignored.');
      return;
    }

    this.experiences.update((items) =>
      items.map((item) =>
        item.id === experienceId
          ? { ...item, isExpanded: !item.isExpanded }
          : item
      )
    );
  }

  toggleTechnologyFilter(technology: string): void {
    if (!technology) {
      return;
    }

    this.selectedTechnologyTags.update((selectedTags) =>
      selectedTags.includes(technology)
        ? selectedTags.filter((selectedTag) => selectedTag !== technology)
        : [...selectedTags, technology]
    );
  }

  clearTechnologyFilters(): void {
    this.selectedTechnologyTags.set([]);
  }

  private keepExistingTechnologyFilters(experiences: Experience[]): void {
    const availableTags = new Set(
      experiences.flatMap((experience) =>
        experience.technologies.map((technology) => technology.name)
      )
    );

    this.selectedTechnologyTags.update((selectedTags) =>
      selectedTags.filter((selectedTag) => availableTags.has(selectedTag))
    );
  }

  private startEntranceAnimation(): void {
    if (this.prefersReducedMotion()) {
      this.expandFirstExperience();
      return;
    }

    this.isEntranceAnimating.set(true);

    // While the page is still sliding in, the stack holds its first frame
    // (its CSS animation is paused) and the timers wait for the swipe to end.
    if (this.pageSwipe.isSwiping()) {
      this.swipeWait = this.swipeSettled$.subscribe(() => this.startEntranceTimers());
      return;
    }

    this.startEntranceTimers();
  }

  private startEntranceTimers(): void {
    this.swipeWait = undefined;
    this.firstExperienceTimer = setTimeout(
      () => this.openFirstExperience(),
      ExperiencesPage.FIRST_EXPERIENCE_OPEN_DELAY_MS
    );
    this.entranceTimer = setTimeout(
      () => this.finishEntranceAnimation(),
      ExperiencesPage.ENTRANCE_DURATION_MS
    );
  }

  private finishEntranceAnimation(): void {
    if (this.entranceTimer) {
      clearTimeout(this.entranceTimer);
      this.entranceTimer = undefined;
    }

    this.isEntranceAnimating.set(false);
  }

  private openFirstExperience(): void {
    if (this.firstExperienceTimer) {
      clearTimeout(this.firstExperienceTimer);
      this.firstExperienceTimer = undefined;
    }

    this.expandFirstExperience();
  }

  private cancelEntranceAnimation(): void {
    this.swipeWait?.unsubscribe();
    this.swipeWait = undefined;

    if (this.entranceTimer) {
      clearTimeout(this.entranceTimer);
      this.entranceTimer = undefined;
    }

    if (this.firstExperienceTimer) {
      clearTimeout(this.firstExperienceTimer);
      this.firstExperienceTimer = undefined;
    }

    this.isEntranceAnimating.set(false);
  }

  private expandFirstExperience(): void {
    this.experiences.update((items) =>
      items.map((item, index) =>
        index === 0 ? { ...item, isExpanded: true } : item
      )
    );
  }

  private wheelDeltaInPixels(event: WheelEvent, list: HTMLElement): number {
    switch (event.deltaMode) {
      case WheelEvent.DOM_DELTA_LINE:
        return event.deltaY * ExperiencesPage.WHEEL_LINE_HEIGHT_PX;
      case WheelEvent.DOM_DELTA_PAGE:
        return event.deltaY * list.clientHeight;
      default:
        return event.deltaY;
    }
  }

  private prefersReducedMotion(): boolean {
    return typeof window !== 'undefined'
      && typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

}
