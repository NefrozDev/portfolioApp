import { TestBed } from '@angular/core/testing';
import * as oauth from 'oauth4webapi';

import {
  BROWSER_NAVIGATION,
  IDENTITY_FETCH,
  SynapseAccountService,
  safeReturnPath
} from './synapse-account';

// The development environment: a local identity service, the dev server.
const ISSUER = 'http://localhost:4300/oidc';
const SITE = 'http://localhost:4200';
const USER_KEY = 'synapse-account-user';
const PENDING_KEY = 'synapse-account-sign-in';

const METADATA = {
  issuer: ISSUER,
  authorization_endpoint: `${ISSUER}/auth`,
  token_endpoint: `${ISSUER}/token`,
  end_session_endpoint: `${ISSUER}/session/end`,
  jwks_uri: `${ISSUER}/jwks`,
  response_types_supported: ['code'],
  id_token_signing_alg_values_supported: ['RS256']
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' }
  });

const base64Url = (value: unknown) =>
  btoa(JSON.stringify(value))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

/**
 * An ID token as the token endpoint returns it. Its signature is not
 * checked: the browser received it straight from the identity service over
 * TLS (OpenID Connect Core 3.1.3.7), so a placeholder is enough here.
 */
function idToken(claims: Record<string, unknown>): string {
  const now = Math.floor(Date.now() / 1000);
  return [
    base64Url({ alg: 'RS256', typ: 'JWT' }),
    base64Url({
      iss: ISSUER,
      aud: 'portfolio',
      sub: 'u1',
      iat: now,
      exp: now + 3600,
      preferred_username: 'ada',
      ...claims
    }),
    'signature'
  ].join('.');
}

describe('SynapseAccountService', () => {
  let fetchSpy: jasmine.Spy<typeof fetch>;
  let assign: jasmine.Spy<(url: string) => void>;
  let tokenResponse: () => Response;
  /** The nonce of the sign-in under way (read before the callback clears it). */
  let nonce = '';

  function createService(): SynapseAccountService {
    return TestBed.inject(SynapseAccountService);
  }

  const requestsTo = (url: string) =>
    fetchSpy.calls
      .allArgs()
      .filter(
        ([input]) =>
          String(input instanceof Request ? input.url : input) === url
      );

  beforeEach(() => {
    sessionStorage.clear();
    tokenResponse = () =>
      json({
        access_token: 'at',
        token_type: 'Bearer',
        expires_in: 3600,
        id_token: idToken({ nonce })
      });
    fetchSpy = jasmine
      .createSpy<typeof fetch>('fetch')
      .and.callFake(async (input) => {
        const url = String(input instanceof Request ? input.url : input);
        if (url === `${ISSUER}/.well-known/openid-configuration`) {
          return json(METADATA);
        }
        if (url === `${ISSUER}/token`) {
          return tokenResponse();
        }
        return new Response('Not found', { status: 404 });
      });
    assign = jasmine.createSpy('assign');

    TestBed.configureTestingModule({
      providers: [
        { provide: IDENTITY_FETCH, useValue: fetchSpy },
        { provide: BROWSER_NAVIGATION, useValue: { assign } }
      ]
    });
  });

  afterEach(() => sessionStorage.clear());

  function pending(): {
    state: string;
    nonce: string;
    codeVerifier: string;
    returnTo: string;
  } {
    return JSON.parse(sessionStorage.getItem(PENDING_KEY) ?? 'null');
  }

  describe('signIn', () => {
    it('keeps the checks in this tab, then sends the browser to the identity service with PKCE', async () => {
      const service = createService();

      await service.signIn('/fr/projects', 'fr');

      const saved = pending();
      expect(saved.returnTo).toBe('/fr/projects');
      expect(assign).toHaveBeenCalledTimes(1);
      const url = new URL(assign.calls.mostRecent().args[0]);
      expect(url.origin + url.pathname).toBe(`${ISSUER}/auth`);
      expect(Object.fromEntries(url.searchParams)).toEqual({
        client_id: 'portfolio',
        redirect_uri: `${SITE}/auth/callback`,
        response_type: 'code',
        scope: 'openid profile',
        state: saved.state,
        nonce: saved.nonce,
        code_challenge: await oauth.calculatePKCECodeChallenge(
          saved.codeVerifier
        ),
        code_challenge_method: 'S256',
        ui_locales: 'fr'
      });
      expect(service.user()).toBeNull();
    });

    it('never comes back to another site', async () => {
      await createService().signIn('https://evil.example/', 'en');

      expect(pending().returnTo).toBe('/');
    });

    it('fails without leaving the page when the identity service cannot be reached, and asks again next time', async () => {
      fetchSpy.and.rejectWith(new TypeError('Failed to fetch'));
      const service = createService();

      await expectAsync(service.signIn('/en', 'en')).toBeRejected();
      await expectAsync(service.signIn('/en', 'en')).toBeRejected();

      expect(assign).not.toHaveBeenCalled();
      expect(fetchSpy).toHaveBeenCalledTimes(2);
      expect(sessionStorage.getItem(PENDING_KEY)).toBeNull();
    });
  });

  describe('completeSignIn', () => {
    async function startSignIn(service: SynapseAccountService) {
      await service.signIn('/en/projects', 'en');
      fetchSpy.calls.reset();
      nonce = pending().nonce;
      return pending();
    }

    it('exchanges the code from the browser, without a secret, and keeps only the username', async () => {
      const service = createService();
      const { state, codeVerifier } = await startSignIn(service);

      const result = await service.completeSignIn(
        new URL(`${SITE}/auth/callback?code=c0de&state=${state}`)
      );

      expect(result).toEqual({ ok: true, returnTo: '/en/projects' });
      expect(service.user()?.username).toBe('ada');
      expect(JSON.parse(sessionStorage.getItem(USER_KEY) ?? '{}')).toEqual({
        username: 'ada',
        expiresAt: jasmine.any(Number)
      });
      expect(sessionStorage.getItem(PENDING_KEY)).toBeNull();

      const [tokenCall] = requestsTo(`${ISSUER}/token`);
      expect(tokenCall).toBeDefined();
      const init = tokenCall[1] as RequestInit;
      const body = new URLSearchParams(String(init.body));
      expect(Object.fromEntries(body)).toEqual({
        grant_type: 'authorization_code',
        code: 'c0de',
        redirect_uri: `${SITE}/auth/callback`,
        code_verifier: codeVerifier,
        client_id: 'portfolio'
      });
      expect(new Headers(init.headers).has('authorization')).toBeFalse();
    });

    it('says the sign-in was cancelled when the person went back, without asking for tokens', async () => {
      const service = createService();
      const { state } = await startSignIn(service);

      const result = await service.completeSignIn(
        new URL(`${SITE}/auth/callback?error=access_denied&state=${state}`)
      );

      expect(result).toEqual({
        ok: false,
        reason: 'cancelled',
        returnTo: '/en/projects'
      });
      expect(requestsTo(`${ISSUER}/token`)).toEqual([]);
      expect(service.user()).toBeNull();
    });

    it('says the sign-in was cancelled when this tab never started one', async () => {
      const service = createService();

      const result = await service.completeSignIn(
        new URL(`${SITE}/auth/callback?code=c0de&state=s`)
      );

      expect(result).toEqual({ ok: false, reason: 'cancelled', returnTo: '/' });
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('refuses a code meant for another sign-in (state mismatch)', async () => {
      spyOn(console, 'warn');
      const service = createService();
      await startSignIn(service);

      const result = await service.completeSignIn(
        new URL(`${SITE}/auth/callback?code=c0de&state=forged`)
      );

      expect(result).toEqual({
        ok: false,
        reason: 'failed',
        returnTo: '/en/projects'
      });
      expect(requestsTo(`${ISSUER}/token`)).toEqual([]);
      expect(sessionStorage.getItem(USER_KEY)).toBeNull();
    });

    it('refuses an ID token issued for another sign-in (nonce mismatch)', async () => {
      spyOn(console, 'warn');
      tokenResponse = () =>
        json({
          access_token: 'at',
          token_type: 'Bearer',
          id_token: idToken({ nonce: 'someone-else' })
        });
      const service = createService();
      const { state } = await startSignIn(service);

      const result = await service.completeSignIn(
        new URL(`${SITE}/auth/callback?code=c0de&state=${state}`)
      );

      expect(result.ok).toBeFalse();
      expect(service.user()).toBeNull();
      expect(sessionStorage.getItem(USER_KEY)).toBeNull();
    });

    it('refuses an ID token for another app', async () => {
      spyOn(console, 'warn');
      tokenResponse = () =>
        json({
          access_token: 'at',
          token_type: 'Bearer',
          id_token: idToken({ nonce, aud: 'plano' })
        });
      const service = createService();
      const { state } = await startSignIn(service);

      const result = await service.completeSignIn(
        new URL(`${SITE}/auth/callback?code=c0de&state=${state}`)
      );

      expect(result).toEqual({
        ok: false,
        reason: 'failed',
        returnTo: '/en/projects'
      });
      expect(service.user()).toBeNull();
    });

    it('fails when the identity service refuses the code', async () => {
      spyOn(console, 'warn');
      tokenResponse = () => json({ error: 'invalid_grant' }, 400);
      const service = createService();
      const { state } = await startSignIn(service);

      const result = await service.completeSignIn(
        new URL(`${SITE}/auth/callback?code=c0de&state=${state}`)
      );

      expect(result.ok).toBeFalse();
      expect(console.warn).toHaveBeenCalledTimes(1);
    });
  });

  describe('a sign-in kept in this tab', () => {
    beforeEach(() => jasmine.clock().install());
    afterEach(() => jasmine.clock().uninstall());

    it('is restored on reload until it expires, then forgotten', () => {
      jasmine.clock().mockDate(new Date(2026, 10, 8, 12, 0, 0));
      sessionStorage.setItem(
        USER_KEY,
        JSON.stringify({ username: 'ada', expiresAt: Date.now() + 60_000 })
      );

      const service = createService();
      expect(service.user()?.username).toBe('ada');

      jasmine.clock().tick(60_000);
      expect(service.user()).toBeNull();
      expect(sessionStorage.getItem(USER_KEY)).toBeNull();
    });

    it('is dropped when already expired or malformed', () => {
      jasmine.clock().mockDate(new Date(2026, 10, 8, 12, 0, 0));
      sessionStorage.setItem(
        USER_KEY,
        JSON.stringify({ username: 'ada', expiresAt: Date.now() - 1 })
      );

      expect(createService().user()).toBeNull();
      expect(sessionStorage.getItem(USER_KEY)).toBeNull();
    });
  });

  describe('signOut', () => {
    beforeEach(() => {
      sessionStorage.setItem(
        USER_KEY,
        JSON.stringify({ username: 'ada', expiresAt: Date.now() + 60_000 })
      );
    });

    it('forgets the user, then lets the identity service sign out of every app', async () => {
      const service = createService();

      await service.signOut();

      expect(service.user()).toBeNull();
      expect(sessionStorage.getItem(USER_KEY)).toBeNull();
      expect(assign).toHaveBeenCalledOnceWith(
        `${ISSUER}/session/end?client_id=portfolio&post_logout_redirect_uri=${encodeURIComponent(`${SITE}/`)}`
      );
    });

    it('still signs out here when the identity service cannot be reached', async () => {
      spyOn(console, 'warn');
      fetchSpy.and.rejectWith(new TypeError('Failed to fetch'));
      const service = createService();

      await service.signOut();

      expect(service.user()).toBeNull();
      expect(sessionStorage.getItem(USER_KEY)).toBeNull();
      expect(assign).not.toHaveBeenCalled();
    });
  });

  it('links the Synapse account page next to the issuer', () => {
    expect(createService().accountUrl).toBe('http://localhost:4300/account');
  });
});

describe('safeReturnPath', () => {
  it('keeps a path of this site', () => {
    expect(safeReturnPath('/fr/projects?tag=angular')).toBe(
      '/fr/projects?tag=angular'
    );
  });

  it('falls back to the home page for anything else', () => {
    for (const value of [
      undefined,
      42,
      '',
      'https://evil.example',
      '//evil.example',
      '/\\evil.example',
      '/auth/callback?code=x'
    ]) {
      expect(safeReturnPath(value)).withContext(String(value)).toBe('/');
    }
  });
});
