import { DOCUMENT } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import {
  SignInResult,
  SynapseAccountService
} from '../../../services/synapse-account';
import { provideTestI18n } from '../../../testing/provide-test-i18n';
import { SignInCallback } from './sign-in-callback';

describe('SignInCallback', () => {
  let completeSignIn: jasmine.Spy<(url: URL) => Promise<SignInResult>>;
  let navigateByUrl: jasmine.Spy;

  async function render(
    result: SignInResult
  ): Promise<{
    fixture: ComponentFixture<SignInCallback>;
    element: HTMLElement;
  }> {
    completeSignIn = jasmine
      .createSpy<(url: URL) => Promise<SignInResult>>('completeSignIn')
      .and.resolveTo(result);

    await TestBed.configureTestingModule({
      imports: [SignInCallback],
      providers: [
        provideRouter([]),
        ...provideTestI18n(),
        { provide: SynapseAccountService, useValue: { completeSignIn } }
      ]
    }).compileComponents();

    navigateByUrl = spyOn(
      TestBed.inject(Router),
      'navigateByUrl'
    ).and.resolveTo(true);
    const fixture = TestBed.createComponent(SignInCallback);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return { fixture, element: fixture.nativeElement };
  }

  it('should complete the sign-in from this address, then return to the page left, replacing the callback in the history', async () => {
    await render({ ok: true, returnTo: '/fr/projects' });

    expect(completeSignIn).toHaveBeenCalledTimes(1);
    expect(completeSignIn.calls.mostRecent().args[0].href).toBe(
      TestBed.inject(DOCUMENT).location.href
    );
    expect(navigateByUrl).toHaveBeenCalledOnceWith('/fr/projects', {
      replaceUrl: true
    });
  });

  it('should say a cancelled sign-in was cancelled, with a way back', async () => {
    const { element } = await render({
      ok: false,
      reason: 'cancelled',
      returnTo: '/en/contact'
    });

    // A heading names the page for screen readers, whatever the outcome.
    expect(element.querySelector('h1')?.textContent?.trim()).toBe('Signing in');
    expect(element.querySelector('[role="alert"]')?.textContent?.trim()).toBe(
      'Sign-in cancelled.'
    );
    const back = element.querySelector<HTMLAnchorElement>(
      '.sign-in-callback__back'
    );
    expect(back?.textContent?.trim()).toBe('Back to the site');
    expect(back?.getAttribute('href')).toBe('/en/contact');
    expect(navigateByUrl).not.toHaveBeenCalled();
  });

  it('should say a failed sign-in failed', async () => {
    const { element } = await render({
      ok: false,
      reason: 'failed',
      returnTo: '/'
    });

    expect(element.querySelector('[role="alert"]')?.textContent?.trim()).toBe(
      "Sign-in didn't work. Try again in a moment."
    );
    expect(element.querySelector('[role="status"]')).toBeNull();
    expect(navigateByUrl).not.toHaveBeenCalled();
  });

  it('should tell the visitor to wait while the code is exchanged', async () => {
    completeSignIn = jasmine
      .createSpy('completeSignIn')
      .and.returnValue(new Promise(() => undefined));
    await TestBed.configureTestingModule({
      imports: [SignInCallback],
      providers: [
        provideRouter([]),
        ...provideTestI18n(),
        { provide: SynapseAccountService, useValue: { completeSignIn } }
      ]
    }).compileComponents();
    const fixture = TestBed.createComponent(SignInCallback);
    fixture.detectChanges();

    expect(
      fixture.nativeElement
        .querySelector('[role="status"]')
        ?.textContent?.trim()
    ).toBe('Signing you in…');
  });
});
