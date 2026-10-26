import {
  Component,
  ElementRef,
  computed,
  inject,
  input,
  viewChild
} from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { TranslatePipe } from '@ngx-translate/core';

import { Experience } from '@common/models/experience.model';

// Only same-origin letters may be embedded, since the iframe bypasses
// Angular's resource URL sanitization.
const recommendationLetterPattern = /^\/documents\/recommendations\/[\w-]+\.pdf$/;

@Component({
  selector: 'app-recommendation-letter-dialog',
  imports: [TranslatePipe],
  templateUrl: './recommendation-letter-dialog.html',
  styleUrl: './recommendation-letter-dialog.scss'
})
export class RecommendationLetterDialog {
  private readonly sanitizer = inject(DomSanitizer);
  private readonly dialog =
    viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  readonly experience = input.required<Experience>();
  readonly safeLetterUrl = computed(() => {
    const url = this.experience().recommendationLetterUrl;

    if (!url || !recommendationLetterPattern.test(url)) {
      return null;
    }

    // Safe: the URL is restricted to same-origin PDFs above.
    return this.sanitizer.bypassSecurityTrustResourceUrl(url); // NOSONAR
  });

  open(): void {
    this.dialog().nativeElement.showModal();
  }

  close(): void {
    this.dialog().nativeElement.close();
  }

  closeFromBackdrop(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.close();
    }
  }
}
