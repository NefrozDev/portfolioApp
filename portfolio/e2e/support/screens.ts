import { expect, type Page } from '@playwright/test';
import { mockApi, type MockOptions } from './mock-api';

export interface Screen {
  name: string;
  url: string;
  mock?: MockOptions;
  /** Brings the page to the state to check, once it has loaded. */
  act?: (page: Page) => Promise<void>;
}

/** Every language the site is written in. */
export const LANGUAGES = ['en', 'fr', 'nl', 'de', 'es', 'it'];

/** The four pages of one language. */
export const pages = (lang: string): Screen[] => [
  { name: `${lang} home`, url: `/${lang}` },
  { name: `${lang} experiences`, url: `/${lang}/experiences` },
  { name: `${lang} projects`, url: `/${lang}/projects` },
  { name: `${lang} contact`, url: `/${lang}/contact` }
];

// The pages in English and French, and the states that show something different.
export const screens: Screen[] = [
  ...pages('en'),
  ...pages('fr'),
  {
    name: 'en projects, signed in',
    url: '/en/projects',
    mock: { signedIn: true }
  },
  {
    name: 'en contact with errors',
    url: '/en/contact',
    act: async (page) => {
      await page.getByRole('button', { name: 'Send' }).click();
    }
  },
  {
    name: 'sign-in callback, failed',
    url: '/auth/callback?error=access_denied'
  }
];

/** Opens the page with its mocked API and brings it to its state, ready to check. */
export async function openScreen(page: Page, screen: Screen): Promise<void> {
  await mockApi(page, screen.mock);
  await page.goto(screen.url);
  await expect(page.locator('h1, h2').first()).toBeAttached();
  await screen.act?.(page);
  await page.waitForLoadState('networkidle');
}
