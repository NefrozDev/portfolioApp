import { AppLanguage } from '../enums/app-language.enum';
import { Experience } from '../models/experience.model';
import { Project } from '../models/project.model';
import de from './de.json';
import en from './en.json';
import es from './es.json';
import fr from './fr.json';
import it from './it.json';
import nl from './nl.json';

export type AppTranslations = typeof en;

export const APP_TRANSLATIONS: Record<AppLanguage, AppTranslations> = {
  [AppLanguage.EN]: en,
  [AppLanguage.FR]: fr,
  [AppLanguage.NL]: nl,
  [AppLanguage.ES]: es,
  [AppLanguage.IT]: it,
  [AppLanguage.DE]: de
};

const PROJECT_METADATA: Array<
  Pick<Project, 'id' | 'category' | 'imageUrl' | 'technologies' | 'tags' | 'sourceUrl' | 'demoUrl' | 'isFeatured'>
> = [
  {
    id: '1',
    category: 'fullstack',
    imageUrl: '/assets/images/projects/portfolio-app.png',
    technologies: ['Angular', 'TypeScript', 'Node.js', 'Express', 'Feature-based'],
    tags: [
      'accessibility',
      'design',
      'documentation',
      'internationalization',
      'performance',
      'responsive',
      'seo'
    ],
    sourceUrl: 'https://github.com/example/portfolio-app',
    demoUrl: 'https://example.com',
    isFeatured: true
  },
  {
    id: '2',
    category: 'frontend',
    imageUrl: '/assets/images/projects/task-dashboard.png',
    technologies: ['Angular', 'SCSS', 'RxJS', 'Feature-based'],
    tags: [
      'accessibility',
      'data-visualization',
      'design',
      'performance',
      'responsive',
      'testing'
    ],
    sourceUrl: 'https://github.com/example/task-dashboard',
    isFeatured: false
  },
  {
    id: '3',
    category: 'devops-cloud',
    imageUrl: '/img/projects/devops-monitor.png',
    technologies: ['Node.js', 'Docker', 'API'],
    tags: [
      'architecture',
      'ci-cd',
      'documentation',
      'observability',
      'performance',
      'real-time',
      'scalability'
    ],
    sourceUrl: '#',
    demoUrl: '#'
  },
  {
    id: '4',
    category: 'frontend',
    imageUrl: '/img/projects/chat-application.png',
    technologies: ['Angular', 'SCSS', 'WebSocket', 'Feature-based'],
    tags: [
      'accessibility',
      'design',
      'performance',
      'real-time',
      'responsive',
      'security',
      'testing'
    ],
    sourceUrl: '#',
    demoUrl: '#'
  }
];

const EXPERIENCE_METADATA: Array<
  Pick<
    Experience,
    | 'id'
    | 'role'
    | 'status'
    | 'technologies'
    | 'isExpanded'
    | 'logoUrl'
    | 'recommendationLetterUrl'
  >
> = [
  {
    id: 'icgreen-lead-dev',
    role: 'Lead Developer',
    status: 'cadre',
    logoUrl: '/img/experiences/ic-green.png',
    recommendationLetterUrl: '/documents/recommendations/ic-green.pdf',
    technologies: [
      { name: 'Angular', version: '21' },
      { name: 'Feature-based' },
      { name: 'HTML', version: '5' },
      { name: 'CSS', version: '3' },
      { name: 'TypeScript' },
      { name: 'i18n' },
      { name: 'Jasmine' },
      { name: 'Karma' },
      { name: 'Vitest' },
      { name: 'JSDOM' },
      { name: 'Node.js', version: '20' },
      { name: 'SQL Server' },
      { name: 'NoSQL' },
      { name: 'Docker' },
      { name: 'ROS / ROS2' },
      { name: 'MQTT' },
      { name: 'AI' },
      { name: 'Gerrit' },
      { name: 'Phabricator' },
      { name: 'Jenkins' },
      { name: 'SonarQube' },
      { name: 'Linux' },
      { name: 'Windows' },
      { name: 'Access Control' },
      { name: 'Server Hardening' },
      { name: 'Monorepo' },
      { name: 'Nx' },
      { name: 'Leadership' },
      { name: 'Team Leading' },
      { name: 'Project Management' }
    ],
    isExpanded: true
  },
  {
    id: 'tihange-software-engineer',
    role: 'Software Engineer',
    status: 'employee',
    logoUrl: '/img/experiences/engie.svg.webp',
    technologies: [
      { name: 'Angular', version: '18' },
      { name: 'Feature-based' },
      { name: 'HTML', version: '5' },
      { name: 'CSS', version: '3' },
      { name: 'TypeScript', version: '5.5' },
      { name: 'Jasmine' },
      { name: 'Karma' },
      { name: 'Node.js', version: '22' },
      { name: 'C#', version: '12' },
      { name: '.NET', version: '8' },
      { name: 'WinDev', version: '2024' },
      { name: 'SQL' },
      { name: 'SQL Server' },
      { name: 'Azure DevOps' },
      { name: 'Windows' }
    ],
    isExpanded: false
  },
  {
    id: 'akkodis-internal-project',
    role: 'Software Engineering Consultant',
    status: 'employee',
    logoUrl: '/img/experiences/akkodis.svg',
    technologies: [
      { name: 'Angular', version: '17' },
      { name: 'Feature-based' },
      { name: 'HTML', version: '5' },
      { name: 'CSS', version: '3' },
      { name: 'TypeScript' },
      { name: 'Jasmine' },
      { name: 'Karma' },
      { name: 'Node.js' },
      { name: 'FastAPI' },
      { name: 'Python' },
      { name: 'NoSQL' },
      { name: 'AI' },
      { name: 'Docker' },
      { name: 'Monorepo' },
      { name: 'Nx' },
      { name: 'Windows' }
    ],
    isExpanded: false
  },
  {
    id: 'akkodis-pg-site-leader',
    role: 'Site Leader',
    status: 'corporate',
    logoUrl: '/img/experiences/akkodis.svg',
    technologies: [{ name: 'Leadership' }, { name: 'Consulting' }],
    isExpanded: false
  },
  {
    id: 'pg-lfe-consultant',
    role: 'Software Engineering Consultant',
    status: 'employee',
    logoUrl: '/img/experiences/procter-gamble.svg',
    technologies: [
      { name: 'Angular', version: '16' },
      { name: 'Feature-based' },
      { name: 'HTML', version: '5' },
      { name: 'CSS', version: '3' },
      { name: 'TypeScript' },
      { name: 'Jasmine' },
      { name: 'Karma' },
      { name: 'C#' },
      { name: '.NET' },
      { name: 'REST API' },
      { name: 'SQL' },
      { name: 'ServiceNow' },
      { name: 'Jira' },
      { name: 'Windows' }
    ],
    isExpanded: false
  },
  {
    id: 'pg-ana-sud-consultant',
    role: 'Software Engineering Consultant',
    status: 'employee',
    logoUrl: '/img/experiences/procter-gamble.svg',
    technologies: [
      { name: 'C#' },
      { name: '.NET' },
      { name: 'SQL' },
      { name: 'Automation' },
      { name: 'Data Processing' },
      { name: 'Jira' },
      { name: 'Windows' }
    ],
    isExpanded: false
  },
  {
    id: 'avanade-academy',
    role: 'Software Engineering Consultant',
    status: 'employee',
    logoUrl: '/img/experiences/avanade.svg',
    technologies: [
      { name: 'Microsoft Dynamics 365' },
      { name: 'Power Platform' },
      { name: 'Consulting' },
      { name: 'Leadership' },
      { name: 'Windows' }
    ],
    isExpanded: false
  },
  {
    id: 'noomia-angular-ionic',
    role: 'Angular / Ionic Developer',
    status: 'employee',
    logoUrl: '/img/experiences/noomia.png',
    technologies: [
      { name: 'Angular', version: '11' },
      { name: 'Feature-based' },
      { name: 'HTML', version: '5' },
      { name: 'CSS', version: '3' },
      { name: 'Ionic' },
      { name: 'TypeScript' },
      { name: 'RxJS' },
      { name: 'NgRx' },
      { name: 'SCSS' },
      { name: 'Windows' }
    ],
    isExpanded: false
  },
  {
    id: 'inforius-fullstack',
    role: 'Full-Stack Angular / Node.js Developer',
    status: 'employee',
    logoUrl: '/img/experiences/inforius.png',
    technologies: [
      { name: 'Angular', version: '12' },
      { name: 'Feature-based' },
      { name: 'HTML', version: '5' },
      { name: 'CSS', version: '3' },
      { name: 'Node.js', version: '14' },
      { name: 'Express' },
      { name: 'SQL' },
      { name: 'TypeScript' },
      { name: 'Windows' }
    ],
    isExpanded: false
  },
  {
    id: 'bloody-halloween-cofounder',
    role: 'Co-Founder & Entrepreneur',
    status: 'self-employed',
    logoUrl: '/img/experiences/bloody-halloween.svg',
    technologies: [
      { name: 'JavaScript' },
      { name: 'PHP' },
      { name: 'Shopify' },
      { name: 'Leadership' }
    ],
    isExpanded: false
  },
  {
    id: 'selectos-web-intern',
    role: 'Web Developer',
    status: 'intern',
    logoUrl: '/img/experiences/selectos.png',
    technologies: [
      { name: 'JavaScript' },
      { name: 'PHP' },
      { name: 'WordPress' }
    ],
    isExpanded: false
  },
  {
    id: 'bluefeet-web-intern',
    role: 'Web Developer',
    status: 'intern',
    logoUrl: '/img/experiences/bluefeet.png',
    technologies: [{ name: 'JavaScript' }, { name: 'PHP' }],
    isExpanded: false
  }
];

export function getAppTranslations(language: AppLanguage | string | null | undefined): AppTranslations {
  return APP_TRANSLATIONS[toSupportedLanguage(language)];
}

export function getProjectsForLanguage(language: AppLanguage | string | null | undefined): Project[] {
  const projects = getAppTranslations(language).data.projects;

  return PROJECT_METADATA.map((metadata) => {
    const project = projects[metadata.id as keyof typeof projects];

    return {
      ...metadata,
      title: project.title,
      shortLabel: project.shortLabel,
      description: project.description
    };
  });
}

export function getExperiencesForLanguage(
  language: AppLanguage | string | null | undefined
): Experience[] {
  const experiences = getAppTranslations(language).data.experiences;

  return EXPERIENCE_METADATA.map((metadata) => {
    const experience = experiences[metadata.id as keyof typeof experiences];

    return {
      ...metadata,
      company: experience.company,
      period: experience.period,
      highlights: [...experience.highlights]
    };
  });
}

export function toSupportedLanguage(language: AppLanguage | string | null | undefined): AppLanguage {
  return Object.values(AppLanguage).includes(language as AppLanguage)
    ? (language as AppLanguage)
    : AppLanguage.EN;
}
