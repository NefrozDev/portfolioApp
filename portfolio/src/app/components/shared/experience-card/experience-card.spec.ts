import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Experience } from '../../../../../../Common/models/experience.model';
import { provideTestI18n } from '../../../testing/provide-test-i18n';
import { ExperienceCard } from './experience-card';

const experience: Experience = {
  id: 'exp-1',
  company: 'Company',
  role: 'Developer',
  status: 'employee',
  period: '2024 - Present',
  technologies: [{ name: 'Angular', version: '12' }, { name: 'Docker' }],
  highlights: ['Built UI'],
  isExpanded: true
};

describe('ExperienceCard', () => {
  let component: ExperienceCard;
  let fixture: ComponentFixture<ExperienceCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExperienceCard],
      providers: [...provideTestI18n()]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ExperienceCard);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('experience', experience);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show information for the Docker technology tag', () => {
    const infoTerms = Array.from(
      fixture.nativeElement.querySelectorAll('app-info-term') as NodeListOf<HTMLElement>
    );
    const dockerTerm = infoTerms.find((term) =>
      term.textContent?.includes('Docker')
    );

    expect(dockerTerm?.textContent).toContain('keeping the environment consistent');
  });

  it('should display a technology version when provided', () => {
    const tags = Array.from(
      fixture.nativeElement.querySelectorAll('.experience-card__tags .tag') as NodeListOf<HTMLElement>
    );

    expect(tags.some((tag) => tag.textContent?.includes('Angular 12'))).toBeTrue();
  });

  it('should apply the expanded state class when open', () => {
    const card = fixture.nativeElement.querySelector('.experience-card') as HTMLElement;

    expect(card.classList.contains('experience-card--expanded')).toBeTrue();
  });

  it('should combine the translated position status with the company name', () => {
    const company = fixture.nativeElement.querySelector(
      '.experience-card__company'
    ) as HTMLElement;

    expect(company.textContent?.trim()).toBe('Employee at Company');
    expect(company.querySelector('.experience-card__status')).toBeNull();
  });

  it('should remove the expanded state class when closed', () => {
    fixture.componentRef.setInput('experience', { ...experience, isExpanded: false });
    fixture.detectChanges();

    const card = fixture.nativeElement.querySelector('.experience-card') as HTMLElement;

    expect(card.classList.contains('experience-card--expanded')).toBeFalse();
  });

  it('should keep the details region mounted so closing can animate', () => {
    fixture.componentRef.setInput('experience', { ...experience, isExpanded: false });
    fixture.detectChanges();

    const content = fixture.nativeElement.querySelector('.experience-card__content') as HTMLElement;

    expect(content).not.toBeNull();
    expect(content.getAttribute('aria-hidden')).toBe('true');
  });

  it('should hide the recommendation action when no letter is configured', () => {
    const button = fixture.nativeElement.querySelector(
      '.experience-card__recommendation'
    ) as HTMLButtonElement | null;

    expect(button).toBeNull();
  });

  it('should open a recommendation letter in a dialog when configured', () => {
    const recommendationLetterUrl = '/documents/recommendations/ic-green.pdf';

    fixture.componentRef.setInput('experience', {
      ...experience,
      recommendationLetterUrl
    });
    fixture.detectChanges();

    const dialog = fixture.nativeElement.querySelector(
      '.recommendation-dialog'
    ) as HTMLDialogElement;
    const showModal = spyOn(dialog, 'showModal');
    const button = fixture.nativeElement.querySelector(
      '.experience-card__recommendation'
    ) as HTMLButtonElement;

    button.click();

    expect(showModal).toHaveBeenCalled();
    expect(button.textContent?.trim()).toBe('Recommendation');
    expect(
      button.querySelector('.experience-card__recommendation-icon')
        ?.getAttribute('aria-hidden')
    ).toBe('true');
    expect(dialog.querySelector('iframe')?.getAttribute('src')).toBe(recommendationLetterUrl);
  });

  it('should emit the experience id when toggled', () => {
    const toggledIds: string[] = [];
    component.toggle.subscribe((id) => toggledIds.push(id));

    component.onToggle();

    expect(toggledIds).toEqual(['exp-1']);
  });

  it('should ignore a toggle when the experience id is missing', () => {
    spyOn(console, 'warn');
    const toggledIds: string[] = [];
    component.toggle.subscribe((id) => toggledIds.push(id));
    fixture.componentRef.setInput('experience', { ...experience, id: '' });

    component.onToggle();

    expect(toggledIds).toEqual([]);
    expect(console.warn).toHaveBeenCalled();
  });

  it('should replace a broken logo with a text placeholder', () => {
    const container = document.createElement('div');
    const image = document.createElement('img');
    container.appendChild(image);

    component.onLogoError({ target: image } as unknown as Event);

    expect(image.style.display).toBe('none');
    expect(container.querySelector('span')?.textContent).toBe('[Logo]');
  });

  it('should ignore the recommendation action when no letter is configured', () => {
    expect(() => component.openRecommendationLetter()).not.toThrow();
  });
});
