import {
  DOCUMENT,
  Injectable,
  InjectionToken,
  PLATFORM_ID,
  inject,
  signal
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import type * as oauth from 'oauth4webapi';

import { environment } from '../../environments/environment';

/** Who is signed in with their Synapse account, until the ID token expires. */
export interface SynapseUser {
  username: string;
  /** Epoch milliseconds. */
  expiresAt: number;
}

export type SignInResult =
  | { ok: true; returnTo: string }
  | { ok: false; reason: 'cancelled' | 'failed'; returnTo: string };

interface PendingSignIn {
  state: string;
  nonce: string;
  codeVerifier: string;
  returnTo: string;
}

/** The page the identity service sends the browser back to, with a code. */
export const SIGN_IN_CALLBACK_PATH = '/auth/callback';

/** Requests to the identity service; specs answer them without a network. */
export const IDENTITY_FETCH = new InjectionToken<typeof fetch>(
  'IDENTITY_FETCH',
  {
    providedIn: 'root',
    factory: () => (input, init) => fetch(input, init)
  }
);

/** Leaves the site for the identity service's pages. */
export const BROWSER_NAVIGATION = new InjectionToken<{
  assign(url: string): void;
}>('BROWSER_NAVIGATION', {
  providedIn: 'root',
  factory: () => {
    const view = inject(DOCUMENT).defaultView;
    return { assign: (url: string) => view?.location.assign(url) };
  }
});

type OAuthLibrary = typeof import('oauth4webapi');

const CLIENT: oauth.Client = { client_id: 'portfolio' };
const USER_KEY = 'synapse-account-user';
const PENDING_KEY = 'synapse-account-sign-in';
/** setTimeout cannot wait longer (about 24.8 days). */
const MAX_TIMEOUT_MS = 2 ** 31 - 1;

/** A path of this site to come back to, never another site. */
export function safeReturnPath(value: unknown): string {
  return typeof value === 'string' &&
    value.startsWith('/') &&
    !value.startsWith('//') &&
    !value.startsWith('/\\') &&
    !value.startsWith(SIGN_IN_CALLBACK_PATH)
    ? value
    : '/';
}

function isPendingSignIn(value: unknown): value is PendingSignIn {
  const pending = value as Partial<PendingSignIn> | null;
  return (
    typeof pending?.state === 'string' &&
    typeof pending.nonce === 'string' &&
    typeof pending.codeVerifier === 'string' &&
    typeof pending.returnTo === 'string'
  );
}

function isSynapseUser(value: unknown): value is SynapseUser {
  const user = value as Partial<SynapseUser> | null;
  return (
    typeof user?.username === 'string' &&
    user.username.length > 0 &&
    typeof user.expiresAt === 'number'
  );
}

/**
 * Signing in with the Synapse account, shared by every Synapse Engineering
 * app. The portfolio has no server of its own here (its API is elsewhere on
 * Vercel), so it signs in from the browser: a public OpenID Connect client
 * with PKCE. It only keeps the username, in this tab, until the ID token
 * expires; nothing is sent to the portfolio's API.
 */
@Injectable({
  providedIn: 'root'
})
export class SynapseAccountService {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly fetchFn = inject(IDENTITY_FETCH);
  private readonly navigation = inject(BROWSER_NAVIGATION);
  private readonly issuer = new URL(environment.identityIssuer);
  private readonly redirectUri = `${environment.siteUrl}${SIGN_IN_CALLBACK_PATH}`;
  private library?: Promise<OAuthLibrary>;
  private metadata?: Promise<oauth.AuthorizationServer>;
  private expiryTimer?: ReturnType<typeof setTimeout>;

  readonly user = signal<SynapseUser | null>(null);
  /** The Synapse account page, next to the issuer. */
  readonly accountUrl = new URL('/account', this.issuer).href;

  constructor() {
    this.setUser(this.restoreUser());
  }

  /** Sends the browser to the identity service, then back to `returnTo`. */
  async signIn(returnTo: string, language: string): Promise<void> {
    const oauth = await this.oauth();
    const server = await this.authorizationServer();
    if (!server.authorization_endpoint) {
      throw new Error('The identity service has no authorization endpoint.');
    }

    const pending: PendingSignIn = {
      state: oauth.generateRandomState(),
      nonce: oauth.generateRandomNonce(),
      codeVerifier: oauth.generateRandomCodeVerifier(),
      returnTo: safeReturnPath(returnTo)
    };
    this.write(PENDING_KEY, pending);

    const url = new URL(server.authorization_endpoint);
    url.search = new URLSearchParams({
      client_id: CLIENT.client_id,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: 'openid profile',
      state: pending.state,
      nonce: pending.nonce,
      code_challenge: await oauth.calculatePKCECodeChallenge(
        pending.codeVerifier
      ),
      code_challenge_method: 'S256',
      ui_locales: language
    }).toString();
    this.navigation.assign(url.href);
  }

  /**
   * Back from the identity service: checks state, PKCE and the ID token's
   * issuer, audience, nonce and lifetime, then keeps the username.
   */
  async completeSignIn(callbackUrl: URL): Promise<SignInResult> {
    const pending = this.read(PENDING_KEY);
    this.remove(PENDING_KEY);
    if (!isPendingSignIn(pending)) {
      return { ok: false, reason: 'cancelled', returnTo: '/' };
    }
    const returnTo = safeReturnPath(pending.returnTo);
    let oauth: OAuthLibrary | undefined;

    try {
      oauth = await this.oauth();
      const server = await this.authorizationServer();
      const params = oauth.validateAuthResponse(
        server,
        CLIENT,
        callbackUrl,
        pending.state
      );
      const response = await oauth.authorizationCodeGrantRequest(
        server,
        CLIENT,
        oauth.None(),
        params,
        this.redirectUri,
        pending.codeVerifier,
        this.requestOptions(oauth)
      );
      const result = await oauth.processAuthorizationCodeResponse(
        server,
        CLIENT,
        response,
        { expectedNonce: pending.nonce, requireIdToken: true }
      );
      const claims = oauth.getValidatedIdTokenClaims(result);
      const username = claims?.['preferred_username'];
      if (!claims || typeof username !== 'string' || !username) {
        throw new Error('The ID token has no username.');
      }

      const user: SynapseUser = { username, expiresAt: claims.exp * 1000 };
      this.write(USER_KEY, user);
      this.setUser(user);
      return { ok: true, returnTo };
    } catch (error) {
      const cancelled =
        oauth !== undefined &&
        error instanceof oauth.AuthorizationResponseError &&
        error.error === 'access_denied';
      if (!cancelled) {
        console.warn('SynapseAccountService: sign-in failed.', error);
      }
      return {
        ok: false,
        reason: cancelled ? 'cancelled' : 'failed',
        returnTo
      };
    }
  }

  /** Forgets the user here, then lets the identity service sign out of every app. */
  async signOut(): Promise<void> {
    this.remove(USER_KEY);
    this.setUser(null);

    try {
      const server = await this.authorizationServer();
      if (!server.end_session_endpoint) {
        return;
      }
      const url = new URL(server.end_session_endpoint);
      url.search = new URLSearchParams({
        client_id: CLIENT.client_id,
        post_logout_redirect_uri: `${environment.siteUrl}/`
      }).toString();
      this.navigation.assign(url.href);
    } catch (error) {
      // Signed out of the portfolio anyway.
      console.warn(
        'SynapseAccountService: identity sign-out unavailable.',
        error
      );
    }
  }

  private setUser(user: SynapseUser | null): void {
    clearTimeout(this.expiryTimer);
    this.expiryTimer = undefined;
    this.user.set(user);

    if (user && this.isBrowser) {
      const remaining = user.expiresAt - Date.now();
      if (remaining < MAX_TIMEOUT_MS) {
        this.expiryTimer = setTimeout(() => {
          this.remove(USER_KEY);
          this.setUser(null);
        }, remaining);
      }
    }
  }

  private restoreUser(): SynapseUser | null {
    const user = this.read(USER_KEY);
    if (isSynapseUser(user) && user.expiresAt > Date.now()) {
      return user;
    }
    this.remove(USER_KEY);
    return null;
  }

  /**
   * The OpenID Connect library loads only when someone signs in or out, so it
   * stays out of the bundle every visitor downloads.
   */
  private oauth(): Promise<OAuthLibrary> {
    this.library ??= import('oauth4webapi').catch((error: unknown) => {
      this.library = undefined;
      throw error;
    });
    return this.library;
  }

  /** Discovery, once per page load, and again after a failure. */
  private authorizationServer(): Promise<oauth.AuthorizationServer> {
    this.metadata ??= this.oauth()
      .then(async (oauth) => {
        const response = await oauth.discoveryRequest(this.issuer, {
          algorithm: 'oidc',
          ...this.requestOptions(oauth)
        });
        return oauth.processDiscoveryResponse(this.issuer, response);
      })
      .catch((error: unknown) => {
        this.metadata = undefined;
        throw error;
      });
    return this.metadata;
  }

  private requestOptions(oauth: OAuthLibrary) {
    return {
      [oauth.customFetch]: this.fetchFn,
      // Plain http is only for a local identity service.
      [oauth.allowInsecureRequests]: this.issuer.protocol === 'http:'
    };
  }

  // sessionStorage can be missing (prerendering) or refuse access (privacy
  // settings): the portfolio then simply shows nobody signed in.
  private read(key: string): unknown {
    if (!this.isBrowser) {
      return null;
    }
    try {
      const value = sessionStorage.getItem(key);
      return value ? (JSON.parse(value) as unknown) : null;
    } catch {
      return null;
    }
  }

  private write(key: string, value: unknown): void {
    if (!this.isBrowser) {
      return;
    }
    try {
      sessionStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(
        'SynapseAccountService: failed to write to sessionStorage.',
        error
      );
    }
  }

  private remove(key: string): void {
    if (!this.isBrowser) {
      return;
    }
    try {
      sessionStorage.removeItem(key);
    } catch {
      // Nothing to clean up then.
    }
  }
}
