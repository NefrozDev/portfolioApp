export type PositionStatus =
  | 'employee'
  | 'freelance'
  | 'self-employed'
  | 'cadre'
  | 'corporate'
  | 'intern';

export interface TechnologyTag {
  name: string;
  version?: string;
}

export function formatTechnologyTag(technology: TechnologyTag): string {
  return technology.version
    ? `${technology.name} ${technology.version}`
    : technology.name;
}

export interface Experience {
  id: string;
  company: string;
  role: string;
  status: PositionStatus;
  period: string;
  highlights: string[];
  technologies: TechnologyTag[];
  isExpanded: boolean;
  logoUrl?: string;
  // Logos drawn for dark backgrounds sit on the site background instead of the white tile.
  logoTheme?: 'dark';
  recommendationLetterUrl?: string;
  // Public external profile backing the experience, e.g. a coding platform account.
  profileUrl?: string;
}
