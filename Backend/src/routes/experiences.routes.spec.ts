import assert from 'node:assert/strict';
import test from 'node:test';
import request from 'supertest';

import { app } from '../../app';

test('GET /api/experiences should return an experience list', async () => {
  const response = await request(app).get('/api/experiences');

  assert.equal(response.status, 200);
  assert.ok(Array.isArray(response.body));
  assert.ok(response.body.length > 0);

  const firstExperience = response.body[0];

  assert.equal(typeof firstExperience.id, 'string');
  assert.equal(typeof firstExperience.company, 'string');
  assert.equal(typeof firstExperience.role, 'string');
  assert.equal(typeof firstExperience.status, 'string');
  assert.equal(typeof firstExperience.period, 'string');
  assert.ok(Array.isArray(firstExperience.technologies));
  assert.equal(typeof firstExperience.technologies[0].name, 'string');
  assert.ok(
    firstExperience.technologies.every(
      (technology: { version?: unknown }) =>
        technology.version === undefined || typeof technology.version === 'string'
    )
  );
  assert.ok(Array.isArray(firstExperience.highlights));
  assert.equal(
    response.body.find((experience: { id: string }) => experience.id === 'icgreen-lead-dev')
      .recommendationLetterUrl,
    '/documents/recommendations/ic-green.pdf'
  );
  assert.ok(
    response.body.every(
      (experience: { recommendationLetterUrl?: unknown }) =>
        experience.recommendationLetterUrl === undefined ||
        typeof experience.recommendationLetterUrl === 'string'
    )
  );
});

test('GET /api/experiences should include position statuses and the Akkodis Site Leader role', async () => {
  const response = await request(app).get('/api/experiences');
  const siteLeaderExperience = response.body.find(
    (experience: { id: string }) => experience.id === 'akkodis-pg-site-leader'
  );
  const icGreenExperience = response.body.find(
    (experience: { id: string }) => experience.id === 'icgreen-lead-dev'
  );

  assert.ok(siteLeaderExperience);
  assert.equal(siteLeaderExperience.role, 'Site Leader');
  assert.equal(siteLeaderExperience.status, 'corporate');
  assert.equal(siteLeaderExperience.highlights.length, 4);
  assert.match(siteLeaderExperience.highlights[0], /25 on-site consultants/);
  assert.match(siteLeaderExperience.highlights[1], /onboarding/);
  assert.match(siteLeaderExperience.highlights[2], /new missions/);
  assert.match(siteLeaderExperience.highlights[3], /after-work events/);
  assert.equal(icGreenExperience.status, 'cadre');
  assert.equal(icGreenExperience.company, 'IC-Green');
  assert.ok(icGreenExperience.technologies.some(
    (technology: { name: string }) => technology.name === 'Leadership'
  ));
  assert.ok(icGreenExperience.technologies.some(
    (technology: { name: string }) => technology.name === 'Phabricator'
  ));
  assert.ok(icGreenExperience.technologies.some(
    (technology: { name: string }) => technology.name === 'i18n'
  ));
  assert.match(icGreenExperience.highlights[2], /Led and coordinated development teams/);
  assert.match(icGreenExperience.highlights[3], /connecting multiple robots/);
  assert.match(icGreenExperience.highlights[3], /security, routing, load balancing/);
  assert.match(icGreenExperience.highlights[3], /SQL and NoSQL databases/);
  assert.ok(
    response.body
      .filter(
        (experience: { id: string }) =>
          ![
            'synapse-engineering-founder',
            'akkodis-pg-site-leader',
            'akkodis-javascript-mentor',
            'icgreen-lead-dev',
            'codewars-training',
            'bloody-halloween-cofounder',
            'selectos-web-intern',
            'bluefeet-web-intern'
          ].includes(experience.id)
      )
      .every((experience: { status: string }) => experience.status === 'employee')
  );
});

test('GET /api/experiences should list the Synapse Engineering founder role first, before IC-Green', async () => {
  const response = await request(app).get('/api/experiences?lang=fr');
  const [synapseExperience, icGreenExperience] = response.body;

  assert.equal(response.status, 200);
  assert.equal(synapseExperience.id, 'synapse-engineering-founder');
  assert.equal(icGreenExperience.id, 'icgreen-lead-dev');
  assert.equal(synapseExperience.company, 'Synapse Engineering');
  assert.equal(synapseExperience.role, 'Founder & Full-Stack Developer');
  assert.equal(synapseExperience.status, 'freelance');
  assert.equal(synapseExperience.period, "Oct 2026 - Aujourd'hui");
  assert.equal(synapseExperience.logoUrl, '/img/experiences/synapse-engineering.png');
  assert.equal(synapseExperience.logoTheme, 'dark');
  assert.equal(icGreenExperience.logoTheme, undefined);
  assert.deepEqual(
    synapseExperience.technologies.find((technology: { name: string }) => technology.name === 'Angular'),
    { name: 'Angular', version: '22' }
  );
  for (const name of ['NestJS', 'PostgreSQL', 'RAG', 'Playwright', 'SonarQube', 'GitHub Actions', 'Vercel']) {
    assert.ok(
      synapseExperience.technologies.some((technology: { name: string }) => technology.name === name),
      `missing ${name}`
    );
  }
  assert.equal(synapseExperience.highlights.length, 6);
  assert.match(synapseExperience.highlights[1], /^Semver Sage/);
  assert.match(synapseExperience.highlights[2], /six langues/);
  assert.match(synapseExperience.highlights[3], /^Plano.*MCP/);
  assert.match(synapseExperience.highlights[5], /CI\/CD sur GitHub Actions.*Vercel pour mon site.*SonarQube/);
  assert.equal(synapseExperience.recommendationLetterUrl, undefined);
  assert.equal(synapseExperience.profileUrl, undefined);
});

test('GET /api/experiences should list the Akkodis JavaScript mentor role right after Site Leader', async () => {
  const response = await request(app).get('/api/experiences?lang=fr');
  const experienceIds = response.body.map((experience: { id: string }) => experience.id);
  const siteLeaderIndex = experienceIds.indexOf('akkodis-pg-site-leader');
  const siteLeaderExperience = response.body[siteLeaderIndex];
  const mentorExperience = response.body[siteLeaderIndex + 1];

  assert.equal(response.status, 200);
  assert.equal(experienceIds.filter((id: string) => id === 'akkodis-javascript-mentor').length, 1);
  assert.equal(mentorExperience.id, 'akkodis-javascript-mentor');
  assert.equal(mentorExperience.company, 'Akkodis');
  assert.equal(mentorExperience.role, 'JavaScript Mentor');
  assert.equal(mentorExperience.status, 'corporate');
  assert.equal(mentorExperience.period, siteLeaderExperience.period);
  assert.equal(mentorExperience.logoUrl, '/img/experiences/akkodis.svg');
  assert.deepEqual(
    mentorExperience.technologies.map((technology: { name: string }) => technology.name),
    ['JavaScript', 'Mentoring']
  );
  assert.equal(mentorExperience.highlights.length, 2);
  assert.match(mentorExperience.highlights[0], /Mentor JavaScript de l'entreprise/);
  assert.match(mentorExperience.highlights[1], /Coaching individuel/);
  assert.equal(mentorExperience.recommendationLetterUrl, undefined);
  assert.equal(mentorExperience.profileUrl, undefined);
});

test('GET /api/experiences should place the Bloody Halloween co-founder role before the internships', async () => {
  const response = await request(app).get('/api/experiences?lang=fr');
  const experienceIds = response.body.map((experience: { id: string }) => experience.id);
  const bloodyHalloweenExperience = response.body.find(
    (experience: { id: string }) => experience.id === 'bloody-halloween-cofounder'
  );

  assert.equal(response.status, 200);
  assert.deepEqual(experienceIds.slice(-4), [
    'inforius-fullstack',
    'bloody-halloween-cofounder',
    'selectos-web-intern',
    'bluefeet-web-intern'
  ]);
  assert.equal(bloodyHalloweenExperience.company, 'Bloody Halloween');
  assert.equal(bloodyHalloweenExperience.role, 'Co-Founder & Developer');
  assert.equal(bloodyHalloweenExperience.status, 'self-employed');
  assert.equal(bloodyHalloweenExperience.period, 'Juin 2018 - Nov 2018');
  assert.equal(bloodyHalloweenExperience.logoUrl, '/img/experiences/bloody-halloween.svg');
  assert.deepEqual(
    bloodyHalloweenExperience.technologies.map((technology: { name: string }) => technology.name),
    ['JavaScript', 'PHP', 'Shopify', 'Leadership']
  );
  assert.equal(bloodyHalloweenExperience.highlights.length, 4);
  assert.match(bloodyHalloweenExperience.highlights[1], /JavaScript et PHP sur Shopify/);
  assert.equal(bloodyHalloweenExperience.recommendationLetterUrl, undefined);
  assert.equal(bloodyHalloweenExperience.profileUrl, undefined);
});

test('GET /api/experiences should place the Codewars training between Noomia and Inforius', async () => {
  const response = await request(app).get('/api/experiences?lang=fr');
  const experienceIds = response.body.map((experience: { id: string }) => experience.id);
  const codewarsIndex = experienceIds.indexOf('codewars-training');
  const codewarsExperience = response.body[codewarsIndex];

  assert.equal(response.status, 200);
  assert.deepEqual(experienceIds.slice(codewarsIndex - 1, codewarsIndex + 2), [
    'noomia-angular-ionic',
    'codewars-training',
    'inforius-fullstack'
  ]);
  assert.equal(codewarsExperience.company, 'Codewars');
  assert.equal(codewarsExperience.role, 'Competitive Programming');
  assert.equal(codewarsExperience.profileUrl, 'https://www.codewars.com/users/Nefroz');
  assert.equal(codewarsExperience.status, 'self-employed');
  assert.equal(codewarsExperience.period, 'Juil 2020 - Déc 2020');
  assert.equal(codewarsExperience.logoUrl, '/img/experiences/codewars.svg');
  assert.deepEqual(
    codewarsExperience.technologies.map((technology: { name: string }) => technology.name),
    ['JavaScript', 'C#', 'Python']
  );
  assert.equal(codewarsExperience.highlights.length, 3);
  assert.match(codewarsExperience.highlights[0], /top 2 %/);
  assert.match(codewarsExperience.highlights[1], /principalement en JavaScript/);
  assert.equal(codewarsExperience.recommendationLetterUrl, undefined);
});

test('GET /api/experiences should list the Selectos and Bluefeet internships last', async () => {
  const response = await request(app).get('/api/experiences?lang=fr');
  const [selectosExperience, bluefeetExperience] = response.body.slice(-2);

  assert.equal(response.status, 200);
  assert.equal(selectosExperience.id, 'selectos-web-intern');
  assert.equal(selectosExperience.company, 'Selectos');
  assert.equal(selectosExperience.role, 'Web Developer');
  assert.equal(selectosExperience.status, 'intern');
  assert.equal(selectosExperience.period, 'Févr 2017 - Mai 2017');
  assert.equal(selectosExperience.logoUrl, '/img/experiences/selectos.png');
  assert.deepEqual(
    selectosExperience.technologies.map((technology: { name: string }) => technology.name),
    ['JavaScript', 'PHP', 'WordPress']
  );
  assert.match(selectosExperience.highlights[0], /site WordPress/);
  assert.equal(bluefeetExperience.id, 'bluefeet-web-intern');
  assert.equal(bluefeetExperience.company, 'Bluefeet');
  assert.equal(bluefeetExperience.status, 'intern');
  assert.equal(bluefeetExperience.period, 'Févr 2016');
  assert.equal(bluefeetExperience.logoUrl, '/img/experiences/bluefeet.png');
  assert.deepEqual(
    bluefeetExperience.technologies.map((technology: { name: string }) => technology.name),
    ['JavaScript', 'PHP']
  );
  assert.equal(bluefeetExperience.highlights.length, 1);
  assert.equal(bluefeetExperience.recommendationLetterUrl, undefined);
});

test('GET /api/experiences should keep role titles language-neutral', async () => {
  const response = await request(app).get('/api/experiences?lang=de');
  const roleOf = (id: string) =>
    response.body.find((experience: { id: string }) => experience.id === id).role;

  assert.equal(response.status, 200);
  assert.equal(roleOf('synapse-engineering-founder'), 'Founder & Full-Stack Developer');
  assert.equal(roleOf('icgreen-lead-dev'), 'Lead Developer');
});

test('GET /api/experiences should describe Site Leader as an additional parallel role in every language', async () => {
  const expectedIntroductions: Record<string, RegExp> = {
    en: /^This was an additional internal role for Akkodis, carried out alongside/,
    fr: /^Il s'agissait d'un rôle interne annexe pour Akkodis, exercé en parallèle/,
    nl: /^Dit was een aanvullende interne rol voor Akkodis, die ik naast/,
    es: /^Se trataba de una función interna adicional para Akkodis, desempeñada en paralelo/,
    it: /^Si trattava di un ruolo interno aggiuntivo per Akkodis, svolto parallelamente/,
    de: /^Dies war eine zusätzliche interne Rolle für Akkodis, die ich parallel/
  };

  for (const [language, introduction] of Object.entries(expectedIntroductions)) {
    const response = await request(app).get(`/api/experiences?lang=${language}`);
    const siteLeaderExperience = response.body.find(
      (experience: { id: string }) => experience.id === 'akkodis-pg-site-leader'
    );

    assert.match(siteLeaderExperience.highlights[0], introduction);
  }
});

test('GET /api/experiences should include Node.js for Tihange and the Innovation project', async () => {
  const response = await request(app).get('/api/experiences');
  const tihangeExperience = response.body.find(
    (experience: { id: string }) => experience.id === 'tihange-software-engineer'
  );
  const innovationExperience = response.body.find(
    (experience: { id: string }) => experience.id === 'akkodis-internal-project'
  );

  assert.equal(response.status, 200);
  assert.ok(tihangeExperience);
  assert.ok(tihangeExperience.technologies.some(
    (technology: { name: string }) => technology.name === 'WinDev'
  ));
  assert.ok(tihangeExperience.technologies.some(
    (technology: { name: string }) => technology.name === 'Node.js'
  ));
  assert.equal(tihangeExperience.logoUrl, '/img/experiences/engie.svg.webp');
  assert.ok(innovationExperience);
  assert.ok(innovationExperience.technologies.some(
    (technology: { name: string }) => technology.name === 'Node.js'
  ));
});

test('GET /api/experiences should explain the P&G department acronyms and chemical testing work', async () => {
  const response = await request(app).get('/api/experiences');
  const lfeExperience = response.body.find(
    (experience: { id: string }) => experience.id === 'pg-lfe-consultant'
  );
  const anaSudExperience = response.body.find(
    (experience: { id: string }) => experience.id === 'pg-ana-sud-consultant'
  );

  assert.match(lfeExperience.highlights[0], /Liquid Fabric Enhancers \(LFE\)/);
  assert.match(anaSudExperience.highlights[0], /Analytical \(ANA\)/);
  assert.match(anaSudExperience.highlights[0], /Soluble Unidoses \(SUD\)/);
  assert.match(anaSudExperience.highlights[2], /15 chemical testing methods/);
});

test('GET /api/experiences should describe leadership of the Avanade team project', async () => {
  const response = await request(app).get('/api/experiences');
  const avanadeExperience = response.body.find(
    (experience: { id: string }) => experience.id === 'avanade-academy'
  );

  assert.match(
    avanadeExperience.highlights[2],
    /Led the team project through delivery of the Dynamics 365 solution/
  );
  assert.equal(avanadeExperience.period, 'Oct 2021 - Apr 2022');
  assert.ok(avanadeExperience.technologies.some(
    (technology: { name: string }) => technology.name === 'Leadership'
  ));
});

test('GET /api/experiences should describe the Inforius work as a contribution', async () => {
  const response = await request(app).get('/api/experiences');
  const inforiusExperience = response.body.find(
    (experience: { id: string }) => experience.id === 'inforius-fullstack'
  );

  assert.match(inforiusExperience.highlights[0], /^Worked on a full-stack application/);
  assert.match(inforiusExperience.highlights[1], /^Contributed to/);
  assert.match(inforiusExperience.highlights[2], /^Participated in/);
});

test('GET /api/experiences should include the configured technology versions', async () => {
  const response = await request(app).get('/api/experiences');
  const versionsByExperience = new Map<string, Record<string, string | undefined>>(
    response.body.map((experience: {
      id: string;
      technologies: Array<{ name: string; version?: string }>;
    }) => [
      experience.id,
      Object.fromEntries(
        experience.technologies.map((technology) => [technology.name, technology.version])
      ) as Record<string, string | undefined>
    ])
  );

  assert.equal(versionsByExperience.get('inforius-fullstack')?.Angular, '12');
  assert.equal(versionsByExperience.get('inforius-fullstack')?.['Node.js'], '14');
  assert.equal(versionsByExperience.get('noomia-angular-ionic')?.Angular, '11');
  assert.equal(versionsByExperience.get('pg-lfe-consultant')?.Angular, '16');
  assert.equal(versionsByExperience.get('akkodis-internal-project')?.Angular, '17');
  assert.equal(versionsByExperience.get('tihange-software-engineer')?.Angular, '18');
  assert.equal(versionsByExperience.get('icgreen-lead-dev')?.Angular, '21');
  assert.equal(versionsByExperience.get('icgreen-lead-dev')?.['Node.js'], '20');
  assert.ok('Jenkins' in (versionsByExperience.get('icgreen-lead-dev') ?? {}));
  assert.ok('Linux' in (versionsByExperience.get('icgreen-lead-dev') ?? {}));
  assert.ok('Access Control' in (versionsByExperience.get('icgreen-lead-dev') ?? {}));
  assert.ok('Server Hardening' in (versionsByExperience.get('icgreen-lead-dev') ?? {}));
});

test('GET /api/experiences should include HTML 5 and CSS 3 on every Angular role', async () => {
  const response = await request(app).get('/api/experiences');
  const angularExperiences = response.body.filter(
    (experience: { technologies: Array<{ name: string }> }) =>
      experience.technologies.some((technology) => technology.name === 'Angular')
  );

  assert.ok(angularExperiences.length > 0);
  assert.ok(
    angularExperiences.every(
      (experience: { technologies: Array<{ name: string; version?: string }> }) =>
        experience.technologies.some(
          (technology) => technology.name === 'HTML' && technology.version === '5'
        ) &&
        experience.technologies.some(
          (technology) => technology.name === 'CSS' && technology.version === '3'
        )
    )
  );
});

test('GET /api/experiences should include Jasmine and Karma on Angular roles from LFE onward', async () => {
  const response = await request(app).get('/api/experiences');
  const expectedIds = [
    'icgreen-lead-dev',
    'tihange-software-engineer',
    'akkodis-internal-project',
    'pg-lfe-consultant'
  ];
  const testingTechnologyIds = response.body
    .filter(
      (experience: { technologies: Array<{ name: string }> }) =>
        ['Jasmine', 'Karma'].every((name) =>
          experience.technologies.some((technology) => technology.name === name)
        )
    )
    .map((experience: { id: string }) => experience.id);

  assert.deepEqual(testingTechnologyIds, expectedIds);
});

test('GET /api/experiences should include Monorepo on Synapse Engineering, IC-Green and Innovation only', async () => {
  const response = await request(app).get('/api/experiences');
  const monorepoExperienceIds = response.body
    .filter(
      (experience: { technologies: Array<{ name: string }> }) =>
        experience.technologies.some((technology) => technology.name === 'Monorepo')
    )
    .map((experience: { id: string }) => experience.id);

  assert.deepEqual(monorepoExperienceIds, [
    'synapse-engineering-founder',
    'icgreen-lead-dev',
    'akkodis-internal-project'
  ]);
});
