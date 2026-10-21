import { TestBed } from '@angular/core/testing';
import { provideTranslateService, TranslateService } from '@ngx-translate/core';

import { AppLanguage } from '@common/enums/app-language.enum';
import { APP_TRANSLATIONS } from '@common/i18n';
import { I18nService } from './i18n';
import { LanguageService } from './language';

describe('I18nService', () => {
  let service: I18nService;
  let languageService: LanguageService;
  let translateService: TranslateService;

  beforeEach(() => {
    localStorage.clear();

    TestBed.configureTestingModule({
      providers: [
        ...provideTranslateService({
          fallbackLang: AppLanguage.EN,
          lang: AppLanguage.EN
        })
      ]
    });

    service = TestBed.inject(I18nService);
    languageService = TestBed.inject(LanguageService);
    translateService = TestBed.inject(TranslateService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should register supported app languages', () => {
    expect(translateService.getLangs()).toEqual([
      AppLanguage.EN,
      AppLanguage.FR,
      AppLanguage.NL,
      AppLanguage.ES,
      AppLanguage.IT,
      AppLanguage.DE
    ]);
  });

  it('should keep the document language in sync with the selected language', () => {
    service.useLanguage(AppLanguage.DE);

    expect(document.documentElement.lang).toBe(AppLanguage.DE);
  });

  it('should keep ngx-translate in sync when changing language through the i18n service', () => {
    service.useLanguage(AppLanguage.FR);

    expect(languageService.getLanguage()).toBe(AppLanguage.FR);
    expect(translateService.getCurrentLang()).toBe(AppLanguage.FR);
  });

  it('should return registered translations with interpolation', () => {
    service.setTranslations(AppLanguage.EN, {
      home: {
        greeting: 'Hello {{ name }}'
      }
    });

    expect(service.instant('home.greeting', { name: 'Steven' })).toBe('Hello Steven');
  });

  it('should provide localized labels for every position status', () => {
    const expectedCadreLabels = {
      [AppLanguage.EN]: 'Executive',
      [AppLanguage.FR]: 'Cadre',
      [AppLanguage.NL]: 'Kaderlid',
      [AppLanguage.ES]: 'Directivo',
      [AppLanguage.IT]: 'Quadro',
      [AppLanguage.DE]: 'Führungskraft'
    };
    const expectedInternLabels = {
      [AppLanguage.EN]: 'Intern',
      [AppLanguage.FR]: 'Stagiaire',
      [AppLanguage.NL]: 'Stagiair',
      [AppLanguage.ES]: 'Becario',
      [AppLanguage.IT]: 'Stagista',
      [AppLanguage.DE]: 'Praktikant'
    };

    for (const language of Object.values(AppLanguage)) {
      const statuses = APP_TRANSLATIONS[language].experiences.statuses;

      expect(Object.keys(statuses)).toEqual([
        'employee',
        'freelance',
        'self-employed',
        'cadre',
        'corporate',
        'intern'
      ]);
      expect(statuses.cadre).toBe(expectedCadreLabels[language]);
      expect(statuses.intern).toBe(expectedInternLabels[language]);
    }
  });

  it('should provide a grammatical position and company phrase for every language', () => {
    const expectedPhrases = {
      [AppLanguage.EN]: '{{status}} at {{company}}',
      [AppLanguage.FR]: '{{status}} chez {{company}}',
      [AppLanguage.NL]: '{{status}} bij {{company}}',
      [AppLanguage.ES]: '{{status}} en {{company}}',
      [AppLanguage.IT]: '{{status}} presso {{company}}',
      [AppLanguage.DE]: '{{status}} bei {{company}}'
    };

    for (const language of Object.values(AppLanguage)) {
      expect(APP_TRANSLATIONS[language].experiences.positionAtCompany).toBe(
        expectedPhrases[language]
      );
    }
  });

  it('should use idiomatic resume phrasing for the IC-Green responsibilities', () => {
    const expectedOpenings = {
      [AppLanguage.EN]: ['Led ', 'Drove '],
      [AppLanguage.FR]: ['Pilotage ', 'Définition '],
      [AppLanguage.NL]: ['Leiding ', 'Bepaling '],
      [AppLanguage.ES]: ['Liderazgo ', 'Definición '],
      [AppLanguage.IT]: ['Guida ', 'Definizione '],
      [AppLanguage.DE]: ['Leitung ', 'Verantwortung ']
    };

    for (const language of Object.values(AppLanguage)) {
      const highlights =
        APP_TRANSLATIONS[language].data.experiences['icgreen-lead-dev']
          .highlights;

      expect(highlights[0].startsWith(expectedOpenings[language][0])).toBeTrue();
      expect(highlights[1].startsWith(expectedOpenings[language][1])).toBeTrue();
    }
  });
});
