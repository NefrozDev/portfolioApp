import { Component, input, output, viewChild } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import {
  Experience,
  formatTechnologyTag
} from '../../../../../../Common/models/experience.model';
import { getGlossaryInfoKey } from '@common/constants/glossary';
import { InfoTerm } from '../info-term/info-term';
import { RecommendationLetterDialog } from '../recommendation-letter-dialog/recommendation-letter-dialog';

@Component({
  selector: 'app-experience-card',
  standalone: true,
  imports: [InfoTerm, RecommendationLetterDialog, TranslatePipe],
  templateUrl: './experience-card.html',
  styleUrls: ['./experience-card.scss']
})
export class ExperienceCard {
  private readonly recommendationDialog = viewChild(RecommendationLetterDialog);

  readonly glossaryInfoKey = getGlossaryInfoKey;
  readonly formatTechnologyTag = formatTechnologyTag;
  readonly experience = input.required<Experience>();
  readonly expandToggle = output<string>();

  onToggle(): void {
    const currentExperience = this.experience();

    if (!currentExperience?.id) {
      console.warn('ExperienceCard: missing experience id.');
      return;
    }

    this.expandToggle.emit(currentExperience.id);
  }

  openRecommendationLetter(): void {
    if (!this.experience().recommendationLetterUrl) {
      return;
    }

    this.recommendationDialog()?.open();
  }

  onLogoError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';

    const placeholder = document.createElement('span');
    placeholder.textContent = '[Logo]';

    img.parentElement?.appendChild(placeholder);
  }
}
