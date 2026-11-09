import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  PLATFORM_ID,
  inject,
  signal
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

import { SynapseAccountService } from '../../../services/synapse-account';

type CallbackStatus = 'pending' | 'cancelled' | 'failed';

/**
 * Where the identity service sends the browser back after signing in: the
 * code is exchanged here, then the visitor returns to the page they left.
 */
@Component({
  selector: 'app-sign-in-callback',
  standalone: true,
  imports: [RouterLink, TranslatePipe],
  templateUrl: './sign-in-callback.html',
  styleUrls: ['./sign-in-callback.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SignInCallback {
  private readonly account = inject(SynapseAccountService);
  private readonly router = inject(Router);
  private readonly document = inject(DOCUMENT);

  protected readonly status = signal<CallbackStatus>('pending');
  protected readonly returnTo = signal('/');

  constructor() {
    // Never prerendered (client-side route), but the check keeps it safe.
    if (isPlatformBrowser(inject(PLATFORM_ID))) {
      void this.complete();
    }
  }

  private async complete(): Promise<void> {
    const result = await this.account.completeSignIn(
      new URL(this.document.location.href)
    );

    if (result.ok) {
      // Replaces the callback in the history: "back" must not replay the code.
      await this.router.navigateByUrl(result.returnTo, { replaceUrl: true });
      return;
    }

    this.returnTo.set(result.returnTo);
    this.status.set(result.reason);
  }
}
