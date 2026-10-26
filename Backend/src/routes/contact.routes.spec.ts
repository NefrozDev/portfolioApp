import assert from 'node:assert/strict';
import test from 'node:test';
import request from 'supertest';

import { Contact } from '../../../Common/models/contact.model';
import { createApp } from '../../app';
import {
  ContactRateLimitError,
  ContactRepository
} from '../services/contact-repository';

function createRepository(overrides: Partial<ContactRepository> = {}): ContactRepository {
  return {
    create: async () => '19d719d6-14b4-4a20-a087-1046242e2430',
    markEmailSent: async () => {},
    ...overrides
  };
}

function createTestApp(options: {
  deliver?: (contact: Contact) => Promise<void>;
  repository?: ContactRepository;
} = {}) {
  return createApp({
    deliverContactMessage: options.deliver ?? (async () => {}),
    contactRepository: options.repository ?? createRepository(),
    getContactIpHash: () => 'a'.repeat(64)
  });
}

test('POST /api/contact stores and delivers a normalized valid payload', async () => {
  let deliveredContact: Contact | undefined;
  let storedContact: Contact | undefined;
  let storedIpHash: string | undefined;
  let emailedId: string | undefined;
  const app = createTestApp({
    deliver: async (contact) => {
      deliveredContact = contact;
    },
    repository: createRepository({
      create: async ({ contact, ipHash }) => {
        storedContact = contact;
        storedIpHash = ipHash;
        return 'stored-id';
      },
      markEmailSent: async (id) => {
        emailedId = id;
      }
    })
  });

  const response = await request(app).post('/api/contact').send({
    name: '  Test User  ',
    email: 'test@example.com',
    phone: '+32 470 12 34 56',
    message: '  Hello from test.  '
  });

  const expectedContact = {
    name: 'Test User',
    email: 'test@example.com',
    phone: '+32 470 12 34 56',
    message: 'Hello from test.'
  };

  assert.equal(response.status, 200);
  assert.deepEqual(storedContact, expectedContact);
  assert.deepEqual(deliveredContact, expectedContact);
  assert.equal(storedIpHash, 'a'.repeat(64));
  assert.equal(emailedId, 'stored-id');
});

test('POST /api/contact returns localized feedback', async () => {
  const response = await request(createTestApp()).post('/api/contact?lang=nl').send({
    name: 'Test User',
    message: 'Hello from test.'
  });

  assert.equal(response.status, 200);
  assert.equal(response.body.message, 'Uw bericht is verzonden.');
});

test('POST /api/contact rejects malformed contact details', async () => {
  let storageCalled = false;
  const app = createTestApp({
    repository: createRepository({
      create: async () => {
        storageCalled = true;
        return 'stored-id';
      }
    })
  });
  const response = await request(app).post('/api/contact').send({
    name: 'Test User',
    email: 'not-an-email',
    message: 'Hello from test.'
  });

  assert.equal(response.status, 400);
  assert.equal(storageCalled, false);
});

test('POST /api/contact accepts email addresses with subdomains', async () => {
  const response = await request(createTestApp()).post('/api/contact').send({
    name: 'Test User',
    email: 'first.last@mail.example.co.uk',
    message: 'Hello from test.'
  });

  assert.equal(response.status, 200);
});

test('POST /api/contact rejects email addresses with empty domain labels', async () => {
  const app = createTestApp();

  for (const email of ['test@example..com', 'test@.example.com', 'test@example.']) {
    const response = await request(app).post('/api/contact').send({
      name: 'Test User',
      email,
      message: 'Hello from test.'
    });

    assert.equal(response.status, 400, email);
  }
});

test('POST /api/contact remains successful when notification delivery fails', async () => {
  const originalError = console.error;
  console.error = () => {};
  let stored = false;
  let markedAsEmailed = false;
  const app = createTestApp({
    deliver: async () => {
      throw new Error('Provider response containing a secret');
    },
    repository: createRepository({
      create: async () => {
        stored = true;
        return 'stored-id';
      },
      markEmailSent: async () => {
        markedAsEmailed = true;
      }
    })
  });

  try {
    const response = await request(app).post('/api/contact').send({
      name: 'Test User',
      message: 'Hello from test.'
    });

    assert.equal(response.status, 200);
    assert.equal(stored, true);
    assert.equal(markedAsEmailed, false);
  } finally {
    console.error = originalError;
  }
});

test('POST /api/contact reports storage failures without exposing details', async () => {
  const originalError = console.error;
  console.error = () => {};
  const app = createTestApp({
    repository: createRepository({
      create: async () => {
        throw new Error('Database response containing a secret');
      }
    })
  });

  try {
    const response = await request(app).post('/api/contact').send({
      name: 'Test User',
      message: 'Hello from test.'
    });

    assert.equal(response.status, 502);
    assert.deepEqual(Object.keys(response.body), ['message']);
  } finally {
    console.error = originalError;
  }
});

test('POST /api/contact silently drops submissions that fill the spam trap', async () => {
  let stored = false;
  let delivered = false;
  const app = createTestApp({
    deliver: async () => {
      delivered = true;
    },
    repository: createRepository({
      create: async () => {
        stored = true;
        return 'stored-id';
      }
    })
  });

  const response = await request(app).post('/api/contact').send({
    name: 'Bot',
    message: 'Buy now.',
    website: 'https://spam.example'
  });

  assert.equal(response.status, 200);
  assert.equal(stored, false);
  assert.equal(delivered, false);
});

test('POST /api/contact accepts an empty spam trap', async () => {
  let stored = false;
  const app = createTestApp({
    repository: createRepository({
      create: async () => {
        stored = true;
        return 'stored-id';
      }
    })
  });

  const response = await request(app).post('/api/contact').send({
    name: 'Test User',
    message: 'Hello from test.',
    website: '  '
  });

  assert.equal(response.status, 200);
  assert.equal(stored, true);
});

test('POST /api/contact returns 429 when the IP submission limit is reached', async () => {
  const originalError = console.error;
  console.error = () => {};
  const app = createTestApp({
    repository: createRepository({
      create: async () => {
        throw new ContactRateLimitError('Contact submission rate limit exceeded.');
      }
    })
  });

  try {
    const response = await request(app).post('/api/contact').send({
      name: 'Test User',
      message: 'Hello from test.'
    });

    assert.equal(response.status, 429);
    assert.equal(response.headers['retry-after'], '900');
  } finally {
    console.error = originalError;
  }
});
