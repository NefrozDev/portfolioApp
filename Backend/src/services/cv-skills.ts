import { AppTranslations } from '../../../Common/i18n';
import { CV_ADDITIONAL_SKILLS } from '../../../Common/constants/cv';
import { TechnologyTag } from '../../../Common/models/experience.model';

type CategoryId = keyof AppTranslations['cv']['skillCategories'];

const SKILL_CATEGORIES: Array<{ id: CategoryId; names: string[] }> = [
  { id: 'planning', names: ['Consulting', 'Leadership', 'Team Leading', 'Project Management', 'Jira', 'ServiceNow', 'Phabricator'] },
  { id: 'architecture', names: ['Monorepo', 'Nx', 'Feature-based'] },
  { id: 'versionControl', names: ['GitHub', 'GitLab', 'GitKraken', 'Bitbucket'] },
  { id: 'data', names: ['SQL', 'SQL Server', 'NoSQL', 'Data Processing'] },
  { id: 'backend', names: ['C#', '.NET', 'Python', 'PHP', 'Node.js', 'Express', 'FastAPI', 'REST API', 'WinDev'] },
  { id: 'frontend', names: ['TypeScript', 'JavaScript', 'Angular', 'HTML', 'CSS', 'SCSS', 'Ionic', 'RxJS', 'NgRx', 'i18n', 'WordPress'] },
  { id: 'business', names: ['Microsoft Dynamics 365', 'Power Platform', 'Shopify', 'Automation'] },
  { id: 'integration', names: ['AI', 'ROS / ROS2', 'MQTT'] },
  { id: 'quality', names: ['Jasmine', 'Karma', 'Vitest', 'JSDOM', 'SonarQube', 'Gerrit'] },
  { id: 'delivery', names: ['Azure DevOps', 'Jenkins', 'Docker'] },
  { id: 'infrastructure', names: ['Linux', 'Windows', 'Access Control', 'Server Hardening', 'OWASP'] }
];

export interface CvSkillGroup {
  id: CategoryId;
  technologies: TechnologyTag[];
}

export function getCvSkillGroups(technologies: TechnologyTag[]): CvSkillGroup[] {
  return groupCvSkills([...CV_ADDITIONAL_SKILLS, ...technologies]);
}

export function groupCvSkills(technologies: TechnologyTag[]): CvSkillGroup[] {
  const remaining = new Map(technologies.map((technology) => [technology.name, technology]));
  const groups: CvSkillGroup[] = [];

  for (const category of SKILL_CATEGORIES) {
    const matches: TechnologyTag[] = [];
    for (const name of category.names) {
      const technology = remaining.get(name);
      if (technology) {
        matches.push(technology);
        remaining.delete(name);
      }
    }
    if (matches.length) groups.push({ id: category.id, technologies: matches });
  }

  if (remaining.size) groups.push({ id: 'other', technologies: [...remaining.values()] });
  return groups;
}
