import { ComponentFixture, TestBed } from '@angular/core/testing';

import { getGlossaryInfoKey } from '@common/constants/glossary';
import { provideTestI18n } from '../../../testing/provide-test-i18n';
import { InfoTerm } from './info-term';

describe('InfoTerm', () => {
  let component: InfoTerm;
  let fixture: ComponentFixture<InfoTerm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InfoTerm],
      providers: [...provideTestI18n()]
    }).compileComponents();

    fixture = TestBed.createComponent(InfoTerm);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('label', 'Docker');
    fixture.componentRef.setInput(
      'descriptionKey',
      'app.glossary.docker'
    );
    fixture.detectChanges();
  });

  it('should render the translated information for the term', () => {
    const host = fixture.nativeElement as HTMLElement;
    const trigger = host.querySelector<HTMLButtonElement>('.info-term__trigger');
    const tooltip = host.querySelector<HTMLElement>('[role="tooltip"]');

    expect(trigger?.textContent).toContain('Docker');
    expect(trigger?.getAttribute('aria-label')).toBe('More information about Docker');
    expect(tooltip?.textContent).toContain('keeping the environment consistent');
    expect(host.querySelector('.info-term__icon')).toBeNull();
  });

  it('should underline the term without adding a layout-shifting border', () => {
    const label = fixture.nativeElement.querySelector(
      '.info-term__label'
    ) as HTMLElement;
    const styles = getComputedStyle(label);

    expect(styles.borderBottomWidth).toBe('0px');
    expect(styles.textDecorationLine).toContain('underline');
  });

  it('should toggle on click and close on Escape', () => {
    const trigger = fixture.nativeElement.querySelector(
      '.info-term__trigger'
    ) as HTMLButtonElement;

    trigger.click();
    fixture.detectChanges();
    expect(component.isOpen()).toBeTrue();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();
    expect(component.isOpen()).toBeFalse();
  });

  it('should place an embedded tooltip in the top layer', () => {
    fixture.componentRef.setInput('embedded', true);
    fixture.detectChanges();

    const trigger = fixture.nativeElement.querySelector(
      '.info-term__trigger'
    ) as HTMLElement;
    const tooltip = fixture.nativeElement.querySelector(
      '[role="tooltip"]'
    ) as HTMLElement;

    trigger.click();
    fixture.detectChanges();

    expect(tooltip.matches(':popover-open')).toBeTrue();

    trigger.click();
    fixture.detectChanges();

    expect(tooltip.matches(':popover-open')).toBeFalse();
  });

  it('should keep a tooltip within the viewport at both horizontal edges', () => {
    const componentHost = fixture.nativeElement as HTMLElement;
    const term = componentHost.querySelector(
      '.info-term'
    ) as HTMLElement;
    const tooltip = componentHost.querySelector(
      '[role="tooltip"]'
    ) as HTMLElement;

    const hostBounds = spyOn(
      componentHost,
      'getBoundingClientRect'
    ).and.returnValue({
      left: 0,
      right: 64,
      top: 100,
      bottom: 124,
      width: 64,
      height: 24,
      x: 0,
      y: 100,
      toJSON: () => ({})
    });
    spyOn(tooltip, 'getBoundingClientRect').and.returnValue({
      left: 0,
      right: 288,
      top: 0,
      bottom: 80,
      width: 288,
      height: 80,
      x: 0,
      y: 0,
      toJSON: () => ({})
    });

    term.dispatchEvent(new MouseEvent('mouseenter'));
    fixture.detectChanges();

    expect(component.tooltipLeft()).toBe(152);
    expect(tooltip.matches(':popover-open')).toBeTrue();

    hostBounds.and.returnValue({
      left: window.innerWidth - 64,
      right: window.innerWidth,
      top: 100,
      bottom: 124,
      width: 64,
      height: 24,
      x: window.innerWidth - 64,
      y: 100,
      toJSON: () => ({})
    });

    term.dispatchEvent(new MouseEvent('mouseenter'));
    fixture.detectChanges();

    expect(component.tooltipLeft()).toBe(window.innerWidth - 152);
  });

  it('should include the approved glossary terms and omit the exclusions', () => {
    const includedTerms = [
      'Angular',
      'HTML',
      'CSS',
      'TypeScript',
      'Node.js',
      'Express',
      'SCSS',
      'RxJS',
      'Docker',
      'API',
      'REST API',
      'WebSocket',
      'ROS / ROS2',
      'MQTT',
      'AI',
      'Gerrit',
      'i18n',
      'Jasmine',
      'Karma',
      'Phabricator',
      'Jenkins',
      'Linux',
      'Server Hardening',
      'Monorepo',
      'Access Control',
      'C#',
      '.NET',
      'WinDev',
      'SQL',
      'Azure DevOps',
      'FastAPI',
      'Python',
      'JavaScript',
      'PHP',
      'WordPress',
      'Microsoft Dynamics 365',
      'Power Platform',
      'Ionic',
      'NgRx',
      'seo',
      'ci-cd'
    ];
    const excludedTerms = [
      'Automation',
      'Data Processing',
      'performance',
      'optimization',
      'testing',
      'security',
      'maintainability',
      'documentation',
      'observability',
      'scalability',
      'real-time',
      'responsive',
      'data-visualization',
      'architecture',
      'accessibility',
      'internationalization'
    ];

    expect(includedTerms.every((term) => getGlossaryInfoKey(term))).toBeTrue();
    expect(excludedTerms.every((term) => !getGlossaryInfoKey(term))).toBeTrue();
  });
});
