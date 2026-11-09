import { TestBed } from '@angular/core/testing';

import { AppLanguage } from '@common/enums/app-language.enum';
import { languageGuard } from '../../guards/language.guard';
import { LanguageService } from '../../services/language';
import { SWIPE_PAGES } from '../../services/page-swipe';
import { redirectToPreferredLanguage, routes } from './app.routes';

describe('routes', () => {
  it('should redirect the empty path and unknown paths to the preferred language', () => {
    expect(routes[0]).toEqual(
      jasmine.objectContaining({
        path: '',
        pathMatch: 'full',
        redirectTo: redirectToPreferredLanguage
      })
    );
    expect(routes[routes.length - 1]).toEqual(
      jasmine.objectContaining({
        path: '**',
        redirectTo: redirectToPreferredLanguage
      })
    );
  });

  it('should resolve the preferred language from the language service', () => {
    TestBed.configureTestingModule({
      providers: [
        { provide: LanguageService, useValue: { getLanguage: () => AppLanguage.NL } }
      ]
    });

    expect(TestBed.runInInjectionContext(redirectToPreferredLanguage)).toBe(AppLanguage.NL);
  });

  it('should handle the Synapse sign-in callback outside the language prefix, without the header', async () => {
    const callback = routes.find((route) => route.path === 'auth/callback');

    expect(routes.indexOf(callback!)).toBeLessThan(
      routes.findIndex((route) => route.path === ':lang')
    );
    expect(callback?.data?.['showSiteHeader']).toBeFalse();
    expect(callback?.title).toBe('app.account.callback.title');
    const component = (await callback?.loadComponent?.()) as
      | { ɵcmp?: { selectors?: string[][] } }
      | undefined;
    expect(component?.ɵcmp?.selectors?.[0]?.[0]).toBe('app-sign-in-callback');
  });

  it('should protect language-prefixed routes with the language guard', () => {
    const languageRoute = routes.find((route) => route.path === ':lang');

    expect(languageRoute?.canActivate).toContain(languageGuard);
    expect(languageRoute?.children?.map((route) => route.path)).toEqual([
      '',
      'experiences',
      'projects',
      'contact'
    ]);
  });

  it('should use translation keys for page titles', () => {
    const languageRoute = routes.find((route) => route.path === ':lang');

    expect(languageRoute?.children?.map((route) => route.title)).toEqual([
      'app.navigation.home',
      'app.navigation.experiences',
      'app.navigation.projects',
      'app.navigation.contact'
    ]);
  });

  it('should give every page a localized description for search engines', () => {
    const languageRoute = routes.find((route) => route.path === ':lang');

    expect(languageRoute?.children?.map((route) => route.data?.['description'])).toEqual([
      'app.seo.home',
      'app.seo.experiences',
      'app.seo.projects',
      'app.seo.contact'
    ]);
  });

  it('should place experiences, projects and contact on the swipe axis', () => {
    const languageRoute = routes.find((route) => route.path === ':lang');

    expect(languageRoute?.children?.map((route) => route.data?.['swipePage'])).toEqual([
      undefined,
      ...SWIPE_PAGES
    ]);
  });

  it('should lazy-load every page component', async () => {
    const languageRoute = routes.find((route) => route.path === ':lang');
    const loadedComponents = await Promise.all(
      (languageRoute?.children ?? []).map((route) => route.loadComponent?.())
    );

    expect(
      loadedComponents.map(
        (component) =>
          (
            component as
              | { ɵcmp?: { selectors?: string[][] } }
              | undefined
          )?.ɵcmp?.selectors?.[0]?.[0]
      )
    ).toEqual([
      'app-home-page',
      'app-experiences-page',
      'app-projects-page',
      'app-contact-page'
    ]);
  });
});
