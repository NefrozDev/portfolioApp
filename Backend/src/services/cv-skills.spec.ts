import assert from 'node:assert/strict';
import test from 'node:test';
import { getExperiencesForLanguage } from '../../../Common/i18n';
import { getLatestTechnologyTags } from './cv-pdf';
import { getCvSkillGroups, groupCvSkills } from './cv-skills';

test('CV categories follow lifecycle order and preserve every current skill and its version once', () => {
  const skills = getLatestTechnologyTags(getExperiencesForLanguage('en'));
  const groups = groupCvSkills(skills);

  assert.deepEqual(groups.map((group) => group.id), [
    'planning', 'architecture', 'data', 'backend', 'frontend', 'business',
    'integration', 'quality', 'delivery', 'infrastructure'
  ]);
  const grouped = groups.flatMap((group) => group.technologies);
  assert.equal(grouped.length, skills.length);
  assert.deepEqual(new Set(grouped), new Set(skills));
  assert.ok(groups[0].technologies.some((skill) => skill.name === 'Jira'));
  assert.ok(groups[0].technologies.some((skill) => skill.name === 'ServiceNow'));
  assert.ok(groups[0].technologies.some((skill) => skill.name === 'Mentoring'));

  const namesIn = (id: string) =>
    groups.find((group) => group.id === id)?.technologies.map((skill) => skill.name) ?? [];
  assert.ok(namesIn('data').includes('PostgreSQL'));
  assert.ok(namesIn('backend').includes('NestJS'));
  assert.ok(namesIn('integration').includes('RAG'));
  assert.ok(namesIn('quality').includes('Playwright'));
  assert.ok(namesIn('delivery').includes('GitHub Actions'));
  assert.ok(namesIn('delivery').includes('Vercel'));
});

test('CV includes repository tools after architecture without duplicating position skills', () => {
  const groups = getCvSkillGroups([
    { name: 'SQL' }, { name: 'Monorepo' }, { name: 'GitHub', version: 'Enterprise' }
  ]);
  assert.deepEqual(groups.map((group) => group.id), ['architecture', 'versionControl', 'data', 'infrastructure']);
  assert.deepEqual(groups.at(-1)!.technologies, [{ name: 'OWASP' }]);
  assert.deepEqual(groups[1].technologies, [
    { name: 'GitHub', version: 'Enterprise' }, { name: 'GitLab' },
    { name: 'GitKraken' }, { name: 'Bitbucket' }
  ]);
});

test('CV categories omit empty groups and retain unclassified technologies', () => {
  assert.deepEqual(groupCvSkills([]), []);
  assert.deepEqual(groupCvSkills([
    { name: 'New Tool', version: '2' }, { name: 'Angular', version: '21' }
  ]), [
    { id: 'frontend', technologies: [{ name: 'Angular', version: '21' }] },
    { id: 'other', technologies: [{ name: 'New Tool', version: '2' }] }
  ]);
});
