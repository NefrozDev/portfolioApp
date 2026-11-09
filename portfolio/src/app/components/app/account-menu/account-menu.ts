import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  inject,
  signal
} from '@angular/core';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

import { LanguageService } from '../../../services/language';
import { SynapseAccountService } from '../../../services/synapse-account';

/**
 * The header's sign-in with the Synapse account. It is optional: nothing on
 * the portfolio needs it. Skips hydration because the prerendered page cannot
 * know who is signed in in this tab.
 */
@Component({
  selector: 'app-account-menu',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './account-menu.html',
  styleUrls: ['./account-menu.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { ngSkipHydration: 'true' }
})
export class AccountMenu {
  private readonly router = inject(Router);
  private readonly languageService = inject(LanguageService);
  private readonly elementRef = inject(ElementRef<HTMLElement>);

  protected readonly account = inject(SynapseAccountService);
  protected readonly isMenuOpen = signal(false);
  protected readonly isSigningIn = signal(false);
  protected readonly signInFailed = signal(false);

  async signIn(): Promise<void> {
    this.isSigningIn.set(true);
    this.signInFailed.set(false);

    try {
      await this.account.signIn(
        this.router.url,
        this.languageService.currentLanguage()
      );
    } catch (error) {
      console.warn('AccountMenu: sign-in unavailable.', error);
      this.signInFailed.set(true);
      this.isSigningIn.set(false);
    }
  }

  async signOut(): Promise<void> {
    this.isMenuOpen.set(false);
    await this.account.signOut();
  }

  toggleMenu(): void {
    this.isMenuOpen.update((isOpen) => !isOpen);
  }

  @HostListener('document:click', ['$event.target'])
  closeMenuOnOutsideClick(target: EventTarget | null): void {
    if (
      this.isMenuOpen() &&
      target instanceof Node &&
      !this.elementRef.nativeElement.contains(target)
    ) {
      this.isMenuOpen.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  closeMenuOnEscape(): void {
    this.isMenuOpen.set(false);
  }
}
