import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { Experience } from '../../../../../../Common/models/experience.model';
import { ExperiencesApi } from '../../../services/api/experiences-api';
import { AppStateService } from '../../../services/app-state';
import { PageSwipeService } from '../../../services/page-swipe';
import { provideTestI18n } from '../../../testing/provide-test-i18n';
import { ExperiencesPage } from './experiences-page';

const experiences: Experience[] = [
  {
    id: 'exp-1',
    company: 'Company',
    role: 'Developer',
    status: 'employee',
    period: '2024 - Present',
    technologies: [{ name: 'Angular', version: '12' }, { name: 'TypeScript' }],
    highlights: ['Built UI'],
    isExpanded: true
  },
  {
    id: 'exp-2',
    company: 'Other Company',
    role: 'Backend Developer',
    status: 'employee',
    period: '2023 - 2024',
    technologies: [{ name: 'Node.js' }, { name: 'TypeScript' }, { name: 'Docker' }],
    highlights: ['Built API'],
    isExpanded: false
  }
];

describe('ExperiencesPage', () => {
  let component: ExperiencesPage;
  let fixture: ComponentFixture<ExperiencesPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExperiencesPage],
      providers: [
        ...provideTestI18n(),
        {
          provide: ExperiencesApi,
          useValue: {
            getExperiences: () => of(experiences)
          }
        }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ExperiencesPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should expand the first experience one second into the two-second stack animation', () => {
    expect(component.experiences().every((experience) => !experience.isExpanded)).toBeTrue();
    expect(component.isEntranceAnimating()).toBeTrue();
    expect(component.entranceAnimationDelay(0, 2)).toBe('0ms');
    expect(component.entranceAnimationDelay(1, 2)).toBe('1400ms');
    expect(component.entranceAnimationDuration(2)).toBe('600ms');

    (
      component as unknown as { cancelEntranceAnimation: () => void }
    ).cancelEntranceAnimation();
    jasmine.clock().install();

    try {
      (
        component as unknown as { startEntranceAnimation: () => void }
      ).startEntranceAnimation();

      jasmine.clock().tick(999);
      expect(component.experiences()[0].isExpanded).toBeFalse();

      jasmine.clock().tick(1);
      expect(component.experiences()[0].isExpanded).toBeTrue();
      expect(component.experiences()[1].isExpanded).toBeFalse();
      expect(component.isEntranceAnimating()).toBeTrue();

      jasmine.clock().tick(1000);
      expect(component.isEntranceAnimating()).toBeFalse();
    } finally {
      (
        component as unknown as { cancelEntranceAnimation: () => void }
      ).cancelEntranceAnimation();
      jasmine.clock().uninstall();
    }
  });

  it('should render an accessible skeleton while experiences are loading', () => {
    component.isLoading.set(true);
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    const loader = host.querySelector<HTMLElement>('.experience-loader');
    const skeletonCards = host.querySelectorAll('.experience-loader__card');

    expect(loader?.getAttribute('role')).toBe('status');
    expect(loader?.getAttribute('aria-busy')).toBe('true');
    expect(loader?.textContent).toContain('Loading experiences...');
    expect(skeletonCards.length).toBe(2);
    expect(host.querySelector('.experiences-page__toolbar')).toBeNull();
  });

  it('should expose sorted unique technology tags from the loaded experiences', () => {
    expect(component.availableTechnologyTags()).toEqual([
      'Angular',
      'Docker',
      'Node.js',
      'TypeScript'
    ]);
  });

  it('should filter experiences by selected technology tags', () => {
    component.toggleTechnologyFilter('Angular');

    expect(component.filteredExperiences().map((experience) => experience.id)).toEqual(['exp-1']);
  });

  it('should exclude versions from rail labels and filtering', () => {
    expect(component.availableTechnologyTags()).toContain('Angular');
    expect(component.availableTechnologyTags()).not.toContain('Angular 12');

    component.toggleTechnologyFilter('Angular');

    expect(component.filteredExperiences().map((experience) => experience.id)).toEqual(['exp-1']);
  });

  it('should show experiences matching any selected technology tag', () => {
    component.toggleTechnologyFilter('Angular');
    component.toggleTechnologyFilter('Node.js');

    expect(component.filteredExperiences().map((experience) => experience.id)).toEqual(['exp-1', 'exp-2']);
  });

  it('should clear technology filters', () => {
    component.toggleTechnologyFilter('Angular');
    component.clearTechnologyFilters();

    expect(component.selectedTechnologyTags()).toEqual([]);
    expect(
      component.filteredExperiences().map((experience) => experience.id)
    ).toEqual(['exp-1', 'exp-2']);
  });

  it('should render technology filtering through the shared rail', () => {
    const rail = fixture.nativeElement.querySelector('app-filter-rail') as HTMLElement;
    const filterChips = rail.querySelectorAll('.filter-rail__chip');

    expect(rail).not.toBeNull();
    expect(filterChips.length).toBe(5);
    expect(filterChips[0]?.textContent?.trim()).toBe('All');
    const terms = Array.from(rail.querySelectorAll('app-info-term')).map(
      (term) => term.textContent
    );

    expect(terms.some((term) => term?.includes('Docker'))).toBeTrue();
  });

  describe('wheel scrolling outside the list', () => {
    let host: HTMLElement;
    let list: HTMLElement;
    let hero: HTMLElement;
    let scrollBy: jasmine.Spy;

    const setListSize = (scrollHeight: number, clientHeight: number): void => {
      Object.defineProperty(list, 'scrollHeight', { configurable: true, value: scrollHeight });
      Object.defineProperty(list, 'clientHeight', { configurable: true, value: clientHeight });
    };

    const wheel = (target: HTMLElement, init: WheelEventInit): WheelEvent => {
      const event = new WheelEvent('wheel', { bubbles: true, cancelable: true, ...init });
      target.dispatchEvent(event);
      return event;
    };

    beforeEach(() => {
      host = fixture.nativeElement as HTMLElement;
      list = host.querySelector('.experiences-page__list') as HTMLElement;
      hero = host.querySelector('app-section-hero') as HTMLElement;
      scrollBy = spyOn(list, 'scrollBy');
      setListSize(1000, 300);
    });

    it('should scroll the list by the pixel delta and cancel the native scroll', () => {
      const event = wheel(hero, { deltaY: 120 });

      expect(scrollBy).toHaveBeenCalledOnceWith({ top: 120 });
      expect(event.defaultPrevented).toBeTrue();
    });

    it('should convert line and page wheel deltas to pixels', () => {
      wheel(hero, { deltaY: 3, deltaMode: WheelEvent.DOM_DELTA_LINE });
      wheel(hero, { deltaY: -1, deltaMode: WheelEvent.DOM_DELTA_PAGE });

      expect(scrollBy.calls.allArgs()).toEqual([[{ top: 48 }], [{ top: -300 }]]);
    });

    it('should leave wheels inside the list to native scrolling', () => {
      const card = list.querySelector('app-experience-card') as HTMLElement;
      const event = wheel(card, { deltaY: 120 });

      expect(scrollBy).not.toHaveBeenCalled();
      expect(event.defaultPrevented).toBeFalse();
    });

    it('should do nothing when the list cannot scroll, as in the mobile layout', () => {
      setListSize(300, 300);

      const event = wheel(hero, { deltaY: 120 });

      expect(scrollBy).not.toHaveBeenCalled();
      expect(event.defaultPrevented).toBeFalse();
    });

    it('should ignore horizontal gestures and ctrl + wheel zooming', () => {
      const horizontal = wheel(hero, { deltaX: 80, deltaY: 10 });
      const zoom = wheel(hero, { deltaY: 120, ctrlKey: true });

      expect(scrollBy).not.toHaveBeenCalled();
      expect(horizontal.defaultPrevented).toBeFalse();
      expect(zoom.defaultPrevented).toBeFalse();
    });

    it('should not take over wheels already handled by a nested scroller', () => {
      hero.addEventListener('wheel', (event) => event.preventDefault(), { once: true });

      wheel(hero, { deltaY: 120 });

      expect(scrollBy).not.toHaveBeenCalled();
    });
  });
});

describe('ExperiencesPage during a page swipe', () => {
  it('should hold the card stack until the page has finished sliding in', async () => {
    const isSwiping = signal(true);
    await TestBed.configureTestingModule({
      imports: [ExperiencesPage],
      providers: [
        ...provideTestI18n(),
        { provide: ExperiencesApi, useValue: { getExperiences: () => of(experiences) } },
        { provide: PageSwipeService, useValue: { isSwiping } }
      ]
    }).compileComponents();
    jasmine.clock().install();

    try {
      const fixture = TestBed.createComponent(ExperiencesPage);
      const component = fixture.componentInstance;
      fixture.detectChanges();

      expect(component.isEntranceAnimating()).toBeTrue();
      jasmine.clock().tick(ExperiencesPage['FIRST_EXPERIENCE_OPEN_DELAY_MS']);
      expect(component.experiences()[0].isExpanded).toBeFalse();

      isSwiping.set(false);
      fixture.detectChanges();
      jasmine.clock().tick(999);
      expect(component.experiences()[0].isExpanded).toBeFalse();

      jasmine.clock().tick(1);
      expect(component.experiences()[0].isExpanded).toBeTrue();
    } finally {
      jasmine.clock().uninstall();
    }
  });
});

describe('ExperiencesPage arrival', () => {
  async function render(arrivedFromHome: boolean): Promise<HTMLElement> {
    await TestBed.configureTestingModule({
      imports: [ExperiencesPage],
      providers: [
        ...provideTestI18n(),
        { provide: ExperiencesApi, useValue: { getExperiences: () => of(experiences) } },
        { provide: AppStateService, useValue: { arrivedFromHome: signal(arrivedFromHome) } }
      ]
    }).compileComponents();

    const fixture = TestBed.createComponent(ExperiencesPage);
    fixture.detectChanges();

    return fixture.nativeElement.querySelector('.experiences-page');
  }

  it('should fade the page in after the home page exit', async () => {
    const page = await render(true);

    expect(page.classList).toContain('experiences-page--arriving');
    expect(getComputedStyle(page).animationName).toContain('experiences-page-arrive');
  });

  it('should not fade the page in for other navigations', async () => {
    const page = await render(false);

    expect(page.classList).not.toContain('experiences-page--arriving');
  });
});
