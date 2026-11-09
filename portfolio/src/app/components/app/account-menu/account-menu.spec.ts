import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { AppLanguage } from '@common/enums/app-language.enum';
import { LanguageService } from '../../../services/language';
import {
  SynapseAccountService,
  SynapseUser
} from '../../../services/synapse-account';
import { provideTestI18n } from '../../../testing/provide-test-i18n';
import { AccountMenu } from './account-menu';

describe('AccountMenu', () => {
  let fixture: ComponentFixture<AccountMenu>;
  let element: HTMLElement;
  let account: {
    user: ReturnType<typeof signal<SynapseUser | null>>;
    accountUrl: string;
    signIn: jasmine.Spy;
    signOut: jasmine.Spy;
  };

  beforeEach(async () => {
    localStorage.clear();
    account = {
      user: signal<SynapseUser | null>(null),
      accountUrl: 'https://auth.example/account',
      signIn: jasmine.createSpy('signIn').and.resolveTo(),
      signOut: jasmine.createSpy('signOut').and.resolveTo()
    };

    await TestBed.configureTestingModule({
      imports: [AccountMenu],
      providers: [
        provideRouter([]),
        ...provideTestI18n(),
        { provide: SynapseAccountService, useValue: account }
      ]
    }).compileComponents();

    TestBed.inject(LanguageService).setLanguage(AppLanguage.FR);
    spyOnProperty(TestBed.inject(Router), 'url').and.returnValue(
      '/fr/projects'
    );
    fixture = TestBed.createComponent(AccountMenu);
    element = fixture.nativeElement;
    fixture.detectChanges();
  });

  const buttonNamed = (name: string) =>
    Array.from(element.querySelectorAll('button')).find(
      (button) => button.textContent?.trim() === name
    );

  const signIn = () =>
    element.querySelector<HTMLButtonElement>('.account-menu__sign-in');
  const trigger = () =>
    element.querySelector<HTMLButtonElement>('.account-menu__trigger');

  function signInAs(username: string): void {
    account.user.set({ username, expiresAt: Date.now() + 60_000 });
    fixture.detectChanges();
  }

  it('should skip hydration, since the prerendered page cannot know who is signed in', () => {
    expect(element.hasAttribute('ngSkipHydration')).toBeTrue();
  });

  describe('when nobody is signed in', () => {
    it('should offer to sign in, and nothing else', () => {
      expect(signIn()?.textContent?.trim()).toBe('Sign in');
      expect(trigger()).toBeNull();
      expect(element.querySelector('[role="alert"]')).toBeNull();
    });

    it('should sign in from the current page, in its language', async () => {
      signIn()?.click();
      fixture.detectChanges();

      expect(account.signIn).toHaveBeenCalledOnceWith('/fr/projects', 'fr');
      expect(signIn()?.disabled).toBeTrue();
      expect(signIn()?.textContent?.trim()).toBe('Signing in…');
      await fixture.whenStable();
    });

    it('should say so and let the visitor try again when sign-in is unavailable', async () => {
      spyOn(console, 'warn');
      account.signIn.and.rejectWith(new TypeError('Failed to fetch'));

      signIn()?.click();
      await fixture.whenStable();
      fixture.detectChanges();

      expect(element.querySelector('[role="alert"]')?.textContent?.trim()).toBe(
        'Sign-in is unavailable right now. Try again in a moment.'
      );
      expect(signIn()?.disabled).toBeFalse();
      expect(console.warn).toHaveBeenCalledTimes(1);
    });
  });

  describe('when someone is signed in', () => {
    beforeEach(() => signInAs('ada'));

    it('should show their name, with the menu closed', () => {
      expect(signIn()).toBeNull();
      expect(trigger()?.textContent).toContain('ada');
      expect(trigger()?.getAttribute('aria-label')).toBe(
        'Synapse account: ada'
      );
      expect(trigger()?.getAttribute('aria-expanded')).toBe('false');
      expect(
        element
          .querySelector('.account-menu__list')
          ?.getAttribute('aria-hidden')
      ).toBe('true');
    });

    it('should open the Synapse account page in a new tab', () => {
      trigger()?.click();
      fixture.detectChanges();

      const link = element.querySelector<HTMLAnchorElement>(
        '.account-menu__list a'
      );
      expect(trigger()?.getAttribute('aria-expanded')).toBe('true');
      expect(link?.textContent?.trim()).toBe('Manage my Synapse account');
      expect(link?.href).toBe('https://auth.example/account');
      expect(link?.target).toBe('_blank');
      expect(link?.rel).toBe('noopener');
      expect(link?.tabIndex).toBe(0);
    });

    it('should close the menu, then sign out', async () => {
      trigger()?.click();
      fixture.detectChanges();

      buttonNamed('Sign out')?.click();
      await fixture.whenStable();
      fixture.detectChanges();

      expect(account.signOut).toHaveBeenCalledTimes(1);
      expect(trigger()?.getAttribute('aria-expanded')).toBe('false');
      expect(account.signIn).not.toHaveBeenCalled();
    });

    it('should close the menu on Escape and on a click elsewhere, but not on a click inside', () => {
      trigger()?.click();
      fixture.detectChanges();

      element.querySelector<HTMLElement>('.account-menu__list')?.click();
      fixture.detectChanges();
      expect(trigger()?.getAttribute('aria-expanded')).toBe('true');

      document.body.click();
      fixture.detectChanges();
      expect(trigger()?.getAttribute('aria-expanded')).toBe('false');

      trigger()?.click();
      fixture.detectChanges();
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      fixture.detectChanges();
      expect(trigger()?.getAttribute('aria-expanded')).toBe('false');
    });

    it('should go back to "Sign in" once the sign-in expires', () => {
      account.user.set(null);
      fixture.detectChanges();

      expect(trigger()).toBeNull();
      expect(signIn()).not.toBeNull();
    });
  });
});
