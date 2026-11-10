import type { Page } from '@playwright/test';

export interface MockOptions {
  /** Signed in with the Synapse account in this tab, as the header shows it. */
  signedIn?: boolean;
}

/**
 * The prerendered pages already hold their data, so the browser asks the API little: the
 * contact form, and the lists if a page renders on the client. Nothing reaches production.
 */
export async function mockApi(
  page: Page,
  options: MockOptions = {}
): Promise<void> {
  if (options.signedIn) {
    await page.addInitScript(() =>
      sessionStorage.setItem(
        'synapse-account-user',
        JSON.stringify({
          username: 'Nefroz',
          expiresAt: Date.now() + 3_600_000
        })
      )
    );
  }
  await page.route('**/api/**', (route) => {
    const request = route.request();
    if (request.method() === 'POST') {
      return route.fulfill({ json: { message: 'Message sent.' } });
    }
    return route.fulfill({ json: [] });
  });
  // The identity service is never reached either.
  await page.route('https://auth.synapseengineering.dev/**', (route) =>
    route.abort()
  );
}
