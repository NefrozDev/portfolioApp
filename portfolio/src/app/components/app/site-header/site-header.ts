import {
  AfterViewInit,
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  QueryList,
  ViewChild,
  PLATFORM_ID,
  ViewChildren,
  computed,
  inject,
  signal
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import {
  NavigationEnd,
  Router,
  RouterLink,
  RouterLinkActive
} from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslatePipe } from '@ngx-translate/core';
import { filter } from 'rxjs';
import { AppLanguage } from '../../../../../../Common/enums/app-language.enum';
import { getCvDownloadFilename } from '@common/constants/cv';
import { NAVIGATION_ITEMS } from '../../../../../../Common/constants/navigation-items';
import { LANGUAGE_OPTIONS } from '../../../../../../Common/constants/language-options';
import { NavItem } from '../../../../../../Common/models/nav-item.model';
import { LanguageOption } from '../../../../../../Common/models/language.model';
import { environment } from '../../../../environments/environment';
import { AppStateService } from '../../../services/app-state';
import { AccountMenu } from '../account-menu/account-menu';
import { LanguageService } from '../../../services/language';

@Component({
  selector: 'app-site-header',
  standalone: true,
  imports: [AccountMenu, RouterLink, RouterLinkActive, TranslatePipe],
  templateUrl: './site-header.html',
  styleUrls: ['./site-header.scss']
})
export class SiteHeader implements AfterViewInit {
  private readonly router = inject(Router);
  private readonly languageService = inject(LanguageService);
  private readonly elementRef = inject(ElementRef<HTMLElement>);
  private readonly appState = inject(AppStateService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private attentionAnimation?: Animation;
  private scheduledAnimationFrame?: number;
  private hasCompletedInitialNavigation = false;
  private hasPositionedAttentionDot = false;
  private currentNavigationIndex = -1;

  @ViewChild('attentionDot', { static: true })
  private readonly attentionDot!: ElementRef<HTMLElement>;

  @ViewChildren('navigationLink', { read: ElementRef })
  private readonly navigationLinks!: QueryList<ElementRef<HTMLElement>>;

  readonly navigationItems: NavItem[] = NAVIGATION_ITEMS;
  readonly languages: LanguageOption[] = LANGUAGE_OPTIONS;
  readonly isLanguageMenuOpen = signal(false);

  readonly currentLanguage = computed(() =>
    this.languageService.currentLanguage()
  );

  ngAfterViewInit(): void {
    // The attention dot is positioned with browser animation APIs.
    if (!this.isBrowser) {
      return;
    }

    this.currentNavigationIndex = this.getActiveNavigationIndex();
    this.hasCompletedInitialNavigation = this.router.navigated;

    if (this.router.navigated && this.appState.siteHeaderVisible()) {
      this.scheduleAttentionDotMove(false, this.currentNavigationIndex);
    }

    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => {
        const shouldAnimate = this.hasCompletedInitialNavigation;
        const previousNavigationIndex = this.currentNavigationIndex;

        this.hasCompletedInitialNavigation = true;
        this.currentNavigationIndex = this.getActiveNavigationIndex();

        if (this.appState.siteHeaderVisible()) {
          this.scheduleAttentionDotMove(
            shouldAnimate,
            previousNavigationIndex
          );
        } else {
          this.resetAttentionDotVisualPosition();
        }
      });

    this.destroyRef.onDestroy(() => {
      this.attentionAnimation?.cancel();

      if (this.scheduledAnimationFrame !== undefined) {
        cancelAnimationFrame(this.scheduledAnimationFrame);
      }
    });
  }

  toggleLanguageMenu(): void {
    this.isLanguageMenuOpen.update((isOpen) => !isOpen);
  }

  closeLanguageMenu(): void {
    this.isLanguageMenuOpen.set(false);
  }

  @HostListener('document:click', ['$event.target'])
  closeLanguageMenuOnOutsideClick(target: EventTarget | null): void {
    if (
      this.isLanguageMenuOpen() &&
      target instanceof Node &&
      !this.elementRef.nativeElement.contains(target)
    ) {
      this.closeLanguageMenu();
    }
  }

  @HostListener('document:keydown.escape')
  closeLanguageMenuOnEscape(): void {
    this.closeLanguageMenu();
  }

  @HostListener('document:keydown.w')
  enableWordCvDownload(): void {
    this.isWordCvDownload.set(true);
  }

  @HostListener('document:keyup.w')
  disableWordCvDownload(): void {
    this.isWordCvDownload.set(false);
  }

  @HostListener('window:blur')
  resetWordCvDownload(): void {
    this.isWordCvDownload.set(false);
  }

  getLink(route: string): string[] {
    const lang = this.currentLanguage();

    if (!route) {
      return ['/', lang];
    }

    return ['/', lang, route];
  }

  changeLanguage(language: AppLanguage): void {
    if (!language) {
      console.warn('SiteHeader: empty language ignored.');
      return;
    }

    this.closeLanguageMenu();
    this.languageService.setLanguage(language);

    const currentUrl = this.router.url;
    const segments = currentUrl.split('/').filter(Boolean);

    if (!segments.length) {
      void this.router.navigate(['/', language]);
      return;
    }

    const supportedLanguages = Object.values(AppLanguage);

    if (supportedLanguages.includes(segments[0] as AppLanguage)) {
      segments[0] = language;
      void this.router.navigate(['/', ...segments]);
      return;
    }

    void this.router.navigate(['/', language, ...segments]);
  }

  readonly isWordCvDownload = signal(false);

  getCvDownloadUrl(): string {
    const parameters = new URLSearchParams({ lang: this.currentLanguage() });

    if (this.isWordCvDownload()) {
      parameters.set('format', 'docx');
    }

    return `${environment.apiUrl}/cv?${parameters.toString()}`;
  }

  getCvDownloadFilename(): string {
    return getCvDownloadFilename(
      this.currentLanguage(),
      this.isWordCvDownload() ? 'docx' : 'pdf'
    );
  }

  private scheduleAttentionDotMove(
    shouldAnimate: boolean,
    previousNavigationIndex: number
  ): void {
    if (this.scheduledAnimationFrame !== undefined) {
      cancelAnimationFrame(this.scheduledAnimationFrame);
    }

    this.scheduledAnimationFrame = requestAnimationFrame(() => {
      this.scheduledAnimationFrame = undefined;
      this.moveAttentionDot(shouldAnimate, previousNavigationIndex);
    });
  }

  private resetAttentionDotVisualPosition(): void {
    if (this.scheduledAnimationFrame !== undefined) {
      cancelAnimationFrame(this.scheduledAnimationFrame);
      this.scheduledAnimationFrame = undefined;
    }

    this.attentionAnimation?.cancel();
    this.attentionAnimation = undefined;
    this.hasPositionedAttentionDot = false;
    this.attentionDot.nativeElement.classList.remove(
      'site-header__attention-dot--positioned'
    );
  }

  private moveAttentionDot(
    shouldAnimate: boolean,
    previousNavigationIndex: number
  ): void {
    const dot = this.attentionDot.nativeElement;
    const links = this.navigationLinks.toArray();
    const activeLinkIndex = this.currentNavigationIndex;

    if (activeLinkIndex < 0 || !links[activeLinkIndex]) {
      return;
    }

    const nav = dot.parentElement;

    if (!nav) {
      return;
    }

    const navRect = nav.getBoundingClientRect();
    const targetTransform = this.getAttentionDotTransform(
      activeLinkIndex,
      links,
      navRect,
      dot
    );

    if (!targetTransform) {
      return;
    }

    if (
      shouldAnimate &&
      !this.hasPositionedAttentionDot &&
      previousNavigationIndex >= 0 &&
      previousNavigationIndex !== activeLinkIndex
    ) {
      const previousTransform = this.getAttentionDotTransform(
        previousNavigationIndex,
        links,
        navRect,
        dot
      );

      if (previousTransform) {
        dot.style.transform = previousTransform;
        dot.classList.add('site-header__attention-dot--positioned');
        this.hasPositionedAttentionDot = true;
      }
    }

    if (
      !shouldAnimate ||
      !this.hasPositionedAttentionDot ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      this.attentionAnimation?.cancel();
      this.attentionAnimation = undefined;
      dot.style.transform = targetTransform;
      dot.classList.add('site-header__attention-dot--positioned');
      this.hasPositionedAttentionDot = true;
      return;
    }

    const currentTransform = getComputedStyle(dot).transform;
    this.attentionAnimation?.cancel();
    dot.style.transform =
      currentTransform === 'none' ? dot.style.transform : currentTransform;

    const animation = dot.animate(
      [{ transform: dot.style.transform }, { transform: targetTransform }],
      {
        duration: 500,
        easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
        fill: 'forwards'
      }
    );

    this.attentionAnimation = animation;
    animation.onfinish = () => {
      if (this.attentionAnimation !== animation) {
        return;
      }

      dot.style.transform = targetTransform;
      animation.cancel();
      this.attentionAnimation = undefined;
    };
  }

  private getAttentionDotTransform(
    navigationIndex: number,
    links: Array<ElementRef<HTMLElement>>,
    navRect: DOMRect,
    dot: HTMLElement
  ): string | null {
    const link = links[navigationIndex];

    if (!link) {
      return null;
    }

    const linkRect = link.nativeElement.getBoundingClientRect();
    const targetX = linkRect.left - navRect.left - dot.offsetWidth - 7;
    const targetY = (navRect.height - dot.offsetHeight) / 2;

    return `translate(${targetX}px, ${targetY}px)`;
  }

  private getActiveNavigationIndex(): number {
    const primarySegments = this.router.parseUrl(this.router.url).root
      .children['primary']?.segments;
    const activeRoute = primarySegments?.[1]?.path ?? '';

    return this.navigationItems.findIndex((item) => item.route === activeRoute);
  }
}
