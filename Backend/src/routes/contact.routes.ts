import { Request, Router } from 'express';
import { getAppTranslations } from '../../../Common/i18n';
import { Contact } from '../../../Common/models/contact.model';
import {
  ContactDelivery,
  deliverContactMessage
} from '../services/contact-delivery';
import {
  ContactRateLimitError,
  ContactRepository,
  ContactRepositoryConfigurationError,
  contactRepository
} from '../services/contact-repository';
import {
  IpHashConfigurationError,
  getClientIp,
  hashClientIp
} from '../services/client-ip';

// Domain labels exclude dots so the pattern cannot backtrack.
const emailPattern = /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/;

function isSpamTrapFilled(payload: unknown): boolean {
  if (!payload || typeof payload !== 'object') {
    return false;
  }

  const website = (payload as Record<string, unknown>)['website'];

  return typeof website === 'string' && website.trim() !== '';
}

function parseContact(payload: unknown): Contact | undefined {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return undefined;
  }

  const candidate = payload as Record<string, unknown>;
  const name = typeof candidate['name'] === 'string' ? candidate['name'].trim() : '';
  const message = typeof candidate['message'] === 'string'
    ? candidate['message'].trim()
    : '';
  const email = typeof candidate['email'] === 'string'
    ? candidate['email'].trim()
    : undefined;
  const phone = typeof candidate['phone'] === 'string'
    ? candidate['phone'].trim()
    : undefined;

  if (
    !name ||
    name.length > 100 ||
    !message ||
    message.length > 2000 ||
    (email && (email.length > 254 || !emailPattern.test(email))) ||
    (phone && phone.length > 50)
  ) {
    return undefined;
  }

  return {
    name,
    message,
    ...(email ? { email } : {}),
    ...(phone ? { phone } : {})
  };
}

interface ContactRouterDependencies {
  deliver?: ContactDelivery;
  repository?: ContactRepository;
  getIpHash?: (request: Request) => string | undefined;
}

function createContactRouter(dependencies: ContactRouterDependencies = {}) {
  const contactRouter = Router();
  const deliver = dependencies.deliver ?? deliverContactMessage;
  const repository = dependencies.repository ?? contactRepository;
  const getIpHash = dependencies.getIpHash ?? ((request) => (
    hashClientIp(getClientIp(request))
  ));

  contactRouter.post('/', async (req, res) => {
    const language = typeof req.query.lang === 'string' ? req.query.lang : undefined;
    const translations = getAppTranslations(language);

    // Answer bots as if the message was sent so they do not adapt.
    if (isSpamTrapFilled(req.body)) {
      res.status(200).json({
        message: translations.contact.feedback.success
      });

      return;
    }

    const contact = parseContact(req.body);

    if (!contact) {
      res.status(400).json({
        message: translations.contact.feedback.invalidPayload
      });

      return;
    }

    try {
      const id = await repository.create({
        contact,
        ipHash: getIpHash(req)
      });

      let emailSent = false;

      try {
        await deliver(contact);
        emailSent = true;
      } catch (error) {
        console.error('Contact route: email delivery failed after storage.', error);
      }

      if (emailSent) {
        try {
          await repository.markEmailSent(id);
        } catch (error) {
          console.error('Contact route: could not record successful email delivery.', error);
        }
      }

      res.status(200).json({
        message: translations.contact.feedback.success
      });
    } catch (error) {
      const isConfigurationError = (
        error instanceof ContactRepositoryConfigurationError ||
        error instanceof IpHashConfigurationError
      );
      const isRateLimited = error instanceof ContactRateLimitError;

      console.error(
        isConfigurationError
          ? 'Contact route: contact storage is not configured.'
          : 'Contact route: contact storage failed.',
        error
      );

      if (isRateLimited) {
        res.setHeader('Retry-After', '900');
      }

      res.status(isRateLimited ? 429 : (isConfigurationError ? 503 : 502)).json({
        message: translations.contact.feedback.submitError
      });
    }
  });

  return contactRouter;
}

const contactRouter = createContactRouter();

export {
  contactRouter,
  createContactRouter,
  isSpamTrapFilled,
  parseContact
};
