import assert from 'node:assert/strict';
import test from 'node:test';
import request from 'supertest';

import { createApp } from '../../app';
import { Experience } from '../../../Common/models/experience.model';
import { createCvPdf, getLatestTechnologyTags } from '../services/cv-pdf';
import { createCvDocx } from '../services/cv-docx';

const experience = (
  id: string,
  technologies: Experience['technologies']
): Experience => ({
  id,
  company: 'Company',
  role: 'Developer',
  status: 'employee',
  period: '2024',
  highlights: [],
  technologies,
  isExpanded: false
});

test('GET /api/cv should download a generated PDF in the requested language', async (context) => {
  context.mock.timers.enable({ apis: ['Date'], now: new Date(2026, 0, 5) });
  let receivedLanguage: string | undefined;
  const expectedPdf = Buffer.from('%PDF-generated-test');
  const app = createApp({
    generateCvPdf: async (language?: string) => {
      receivedLanguage = language;
      return expectedPdf;
    }
  });

  const response = await request(app).get('/api/cv?lang=fr');

  assert.equal(response.status, 200);
  assert.equal(receivedLanguage, 'fr');
  assert.match(response.headers['content-type'], /^application\/pdf/);
  assert.equal(
    response.headers['content-disposition'],
    'attachment; filename="CV-Steven-De-Moor-05-01-2026-FR.pdf"'
  );
  assert.equal(response.headers['cache-control'], 'no-store');
  assert.deepEqual(response.body, expectedPdf);
});

test('GET /api/cv should return an error when PDF generation fails', async () => {
  const app = createApp({
    generateCvPdf: async () => {
      throw new Error('PDF failure');
    }
  });
  const originalConsoleError = console.error;
  console.error = () => undefined;

  try {
    const response = await request(app).get('/api/cv');

    assert.equal(response.status, 500);
    assert.deepEqual(response.body, { message: 'Unable to generate the CV.' });
  } finally {
    console.error = originalConsoleError;
  }
});

test('GET /api/cv should generate each language and format only once', async () => {
  const generatedPdfLanguages: (string | undefined)[] = [];
  const generatedDocxLanguages: (string | undefined)[] = [];
  const app = createApp({
    generateCvPdf: async (language?: string) => {
      generatedPdfLanguages.push(language);
      return Buffer.from(`%PDF-${language}`);
    },
    generateCvDocx: async (language?: string) => {
      generatedDocxLanguages.push(language);
      return Buffer.from(`PK-${language}`);
    }
  });

  for (const query of ['?lang=fr', '?lang=fr', '?lang=de', '?lang=fr&format=docx']) {
    const response = await request(app).get(`/api/cv${query}`);

    assert.equal(response.status, 200);
  }

  const cachedResponse = await request(app).get('/api/cv?lang=fr');

  assert.deepEqual(cachedResponse.body, Buffer.from('%PDF-fr'));
  assert.deepEqual(generatedPdfLanguages, ['fr', 'de']);
  assert.deepEqual(generatedDocxLanguages, ['fr']);
});

test('GET /api/cv should retry generation after a failure', async () => {
  let attempts = 0;
  const app = createApp({
    generateCvPdf: async () => {
      attempts += 1;

      if (attempts === 1) {
        throw new Error('PDF failure');
      }

      return Buffer.from('%PDF-generated-test');
    }
  });
  const originalConsoleError = console.error;
  console.error = () => undefined;

  try {
    const failedResponse = await request(app).get('/api/cv');
    const retriedResponse = await request(app).get('/api/cv');

    assert.equal(failedResponse.status, 500);
    assert.equal(retriedResponse.status, 200);
    assert.equal(attempts, 2);
  } finally {
    console.error = originalConsoleError;
  }
});

test('GET /api/cv?format=docx should download a Word CV in the requested language', async (context) => {
  context.mock.timers.enable({ apis: ['Date'], now: new Date(2026, 8, 28) });
  let receivedLanguage: string | undefined;
  const expectedDocx = Buffer.from('PK-generated-test');
  const app = createApp({
    generateCvDocx: async (language?: string) => {
      receivedLanguage = language;
      return expectedDocx;
    }
  });

  const response = await request(app).get('/api/cv?lang=nl&format=docx');

  assert.equal(response.status, 200);
  assert.equal(receivedLanguage, 'nl');
  assert.match(
    response.headers['content-type'],
    /^application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document/
  );
  assert.equal(
    response.headers['content-disposition'],
    'attachment; filename="CV-Steven-De-Moor-28-09-2026-NL.docx"'
  );
  assert.equal(response.headers['content-length'], expectedDocx.length.toString());
  assert.equal(response.headers['cache-control'], 'no-store');
});

test('GET /api/cv should use English for missing or unsupported languages', async (context) => {
  context.mock.timers.enable({ apis: ['Date'], now: new Date(2026, 0, 5) });
  const app = createApp({
    generateCvPdf: async (language?: string) => {
      assert.equal(language, 'en');
      return Buffer.from('%PDF-generated-test');
    }
  });

  for (const query of ['', '?lang=unsupported', '?lang=fr&lang=nl']) {
    const response = await request(app).get(`/api/cv${query}`);

    assert.equal(response.status, 200);
    assert.equal(
      response.headers['content-disposition'],
      'attachment; filename="CV-Steven-De-Moor-05-01-2026-EN.pdf"'
    );
  }
});

test('the default CV generator should produce a valid PDF from portfolio data', async () => {
  const pdf = await createCvPdf('en');
  const pageCount = pdf.toString('latin1').match(/\/Type\s*\/Page\b/g)?.length ?? 0;

  assert.equal(pdf.subarray(0, 5).toString(), '%PDF-');
  assert.ok(pdf.length > 1_000);
  // Categorized skills occupy the opening page before the experience timeline.
  assert.ok(pageCount >= 2 && pageCount <= 5);
  assert.match(pdf.subarray(-32).toString(), /%%EOF/);
});

test('the Word CV generator should produce a valid DOCX from the same portfolio data', async () => {
  const docx = await createCvDocx('en');

  assert.equal(docx.subarray(0, 2).toString(), 'PK');
  assert.ok(docx.length > 1_000);
});

test('CV competencies should retain only the highest version for each technology', () => {
  const skills = getLatestTechnologyTags([
    experience('older', [
      { name: 'Angular', version: '12' },
      { name: 'Node.js', version: '22' }
    ]),
    experience('newest', [
      { name: 'Angular', version: '21' },
      { name: 'TypeScript' }
    ])
  ]);

  assert.deepEqual(skills, [
    { name: 'Angular', version: '21' },
    { name: 'Node.js', version: '22' },
    { name: 'TypeScript' }
  ]);
});
