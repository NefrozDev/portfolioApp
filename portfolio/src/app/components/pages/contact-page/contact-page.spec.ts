import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { of, throwError } from 'rxjs';

import { AppLanguage } from '@common/enums/app-language.enum';
import { ContactApi } from '../../../services/api/contact-api';
import { provideTestI18n } from '../../../testing/provide-test-i18n';
import { ContactPage } from './contact-page';

describe('ContactPage', () => {
  let component: ContactPage;
  let fixture: ComponentFixture<ContactPage>;
  let contactApi: jasmine.SpyObj<ContactApi>;

  beforeEach(async () => {
    contactApi = jasmine.createSpyObj<ContactApi>('ContactApi', ['sendMessage']);
    contactApi.sendMessage.and.returnValue(of({ message: 'Message sent.' }));

    await TestBed.configureTestingModule({
      imports: [ContactPage],
      providers: [
        ...provideTestI18n(),
        {
          provide: ContactApi,
          useValue: contactApi
        }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ContactPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should highlight the submit button after both contact links', () => {
    const submitButton = fixture.nativeElement.querySelector(
      '.contact-page__submit'
    ) as HTMLButtonElement;
    const styles = getComputedStyle(submitButton);

    expect(styles.animationName).toContain(
      'contact-page-submit-intro-glow'
    );
    expect(styles.animationDelay).toBe('2.05s');
    expect(styles.animationIterationCount).toBe('1');
  });

  it('should render contact links above and outside the form card', () => {
    const host = fixture.nativeElement as HTMLElement;
    const container = host.querySelector('.contact-page__container');
    const links = host.querySelector('app-contact-links');
    const card = host.querySelector('.contact-page__card');

    expect(container).toBeTruthy();
    expect(links).toBeTruthy();
    expect(card).toBeTruthy();
    expect(card?.contains(links)).toBeFalse();

    const children = Array.from(container?.children ?? []);
    expect(children.indexOf(links as Element)).toBeLessThan(
      children.indexOf(card as Element)
    );
  });

  it('should use the dedicated translated submit label', () => {
    const host = fixture.nativeElement as HTMLElement;
    const submitButton = host.querySelector(
      '.contact-page__submit'
    ) as HTMLButtonElement | null;

    expect(host.querySelector('.contact-page__subtitle-highlight')).toBeNull();
    expect(submitButton?.textContent?.trim()).toBe('Send');
  });

  it('should require only the name and message fields', () => {
    spyOn(console, 'warn');

    component.onSubmit();
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    const nameInput = host.querySelector<HTMLInputElement>(
      'input[formControlName="name"]'
    );
    const emailInput = host.querySelector<HTMLInputElement>(
      'input[formControlName="email"]'
    );
    const phoneInput = host.querySelector<HTMLInputElement>(
      'input[formControlName="phone"]'
    );
    const messageTextarea = host.querySelector<HTMLTextAreaElement>(
      'textarea[formControlName="message"]'
    );

    expect(nameInput?.placeholder).toBe('Name is required.');
    expect(emailInput?.placeholder).toBe('Email');
    expect(phoneInput?.placeholder).toBe('Phone');
    expect(messageTextarea?.placeholder).toBe('Message is required.');

    expect(
      nameInput?.classList.contains('contact-page__field--invalid')
    ).toBeTrue();
    expect(
      emailInput?.classList.contains('contact-page__field--invalid')
    ).toBeFalse();
    expect(
      messageTextarea?.classList.contains('contact-page__field--invalid')
    ).toBeTrue();

    expect(host.textContent).not.toContain('Name is required.');
    expect(host.textContent).not.toContain('Email address is required.');
    expect(host.textContent).not.toContain('Message is required.');
  });

  it('should translate placeholders when the selected language changes', () => {
    const translateService = TestBed.inject(TranslateService);

    translateService.use(AppLanguage.FR).subscribe();
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;

    expect(
      host.querySelector<HTMLInputElement>('input[formControlName="name"]')
        ?.placeholder
    ).toBe('Nom');
    expect(
      host.querySelector<HTMLInputElement>('input[formControlName="email"]')
        ?.placeholder
    ).toBe('E-mail');
    expect(
      host.querySelector<HTMLInputElement>('input[formControlName="phone"]')
        ?.placeholder
    ).toBe('Téléphone');
    expect(
      host.querySelector<HTMLTextAreaElement>(
        'textarea[formControlName="message"]'
      )?.placeholder
    ).toBe('Message');
    expect(
      host.querySelector<HTMLButtonElement>('.contact-page__submit')?.textContent?.trim()
    ).toBe('Envoyer');

    component.nameControl?.markAsTouched();
    component.messageControl?.markAsTouched();
    fixture.detectChanges();

    expect(
      host.querySelector<HTMLInputElement>('input[formControlName="name"]')
        ?.placeholder
    ).toBe('Le nom est requis.');
    expect(
      host.querySelector<HTMLTextAreaElement>(
        'textarea[formControlName="message"]'
      )?.placeholder
    ).toBe('Le message est requis.');
  });

  it('should place the optional phone field to the right of email', () => {
    const host = fixture.nativeElement as HTMLElement;
    const fields = Array.from(
      host.querySelectorAll<HTMLInputElement>('.contact-page__contact-row input')
    );

    expect(fields.map((field) => field.getAttribute('formControlName'))).toEqual([
      'email',
      'phone'
    ]);
  });

  it('should left-align the form field text and placeholders', () => {
    const host = fixture.nativeElement as HTMLElement;
    const fields = host.querySelectorAll<HTMLElement>(
      '.contact-page__input, .contact-page__textarea'
    );

    expect(fields.length).toBe(4);
    fields.forEach((field) => {
      expect(getComputedStyle(field).textAlign).toBe('left');
    });
  });

  it('should give every form field an associated label', () => {
    const host = fixture.nativeElement as HTMLElement;
    const fields = Array.from(
      host.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
        '.contact-page__form input, .contact-page__form textarea'
      )
    );

    expect(fields.length).toBe(5);
    fields.forEach((field) => {
      expect(field.labels?.length).withContext(field.id).toBe(1);
    });
    expect(
      fields.slice(0, 4).map((field) => field.labels?.[0].textContent?.trim())
    ).toEqual(['Name', 'Email', 'Phone', 'Message']);
  });

  it('should show invalid email feedback inside the email field', () => {
    component.emailControl?.setValue('not-an-email');
    component.emailControl?.markAsTouched();
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    const emailInput = host.querySelector<HTMLInputElement>(
      'input[formControlName="email"]'
    );
    const inlineMessage = host.querySelector<HTMLElement>(
      '#contact-email-inline-error'
    );

    expect(emailInput?.placeholder).toBe('Email');
    expect(
      emailInput?.classList.contains('contact-page__field--invalid')
    ).toBeTrue();
    expect(
      emailInput?.classList.contains(
        'contact-page__input--with-inline-message'
      )
    ).toBeTrue();
    expect(emailInput?.getAttribute('aria-describedby')).toBe(
      'contact-email-inline-error'
    );
    expect(inlineMessage?.textContent?.trim()).toBe(
      'Email address is invalid.'
    );
  });

  it('should submit optional contact details and reset the form on success', () => {
    component.contactForm.setValue({
      name: ' Steven ',
      email: 'steven@example.com',
      phone: '+32 123',
      message: 'Hello',
      website: ''
    });

    component.onSubmit();

    expect(contactApi.sendMessage).toHaveBeenCalledOnceWith({
      name: ' Steven ',
      email: 'steven@example.com',
      phone: '+32 123',
      message: 'Hello'
    });
    expect(component.submitSuccessMessage()).toBe('contact.feedback.success');
    expect(component.submitErrorMessage()).toBeNull();
    expect(component.isSubmitting()).toBeFalse();
    expect(component.contactForm.getRawValue()).toEqual({
      name: '',
      email: '',
      phone: '',
      message: '',
      website: ''
    });
  });

  it('should omit empty optional contact details from the payload', () => {
    component.contactForm.setValue({
      name: 'Steven',
      email: '',
      phone: '',
      message: 'Hello',
      website: ''
    });

    component.onSubmit();

    expect(contactApi.sendMessage).toHaveBeenCalledOnceWith({
      name: 'Steven',
      message: 'Hello'
    });
  });

  it('should send the spam trap value so the API can drop bot submissions', () => {
    component.contactForm.setValue({
      name: 'Bot',
      email: '',
      phone: '',
      message: 'Buy now.',
      website: 'https://spam.example'
    });

    component.onSubmit();

    expect(contactApi.sendMessage).toHaveBeenCalledOnceWith({
      name: 'Bot',
      message: 'Buy now.',
      website: 'https://spam.example'
    });
  });

  it('should hide the spam trap from people and assistive technology', () => {
    const trap = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(
      '.contact-page__trap'
    );
    const trapInput = trap?.querySelector<HTMLInputElement>('input');

    expect(trap?.getAttribute('aria-hidden')).toBe('true');
    expect(trapInput?.tabIndex).toBe(-1);
    expect(trap?.getBoundingClientRect().right).toBeLessThan(0);
  });

  it('should expose a localized error when submission fails', () => {
    spyOn(console, 'error');
    contactApi.sendMessage.and.returnValue(
      throwError(() => new Error('Network unavailable'))
    );
    component.contactForm.patchValue({ name: 'Steven', message: 'Hello' });

    component.onSubmit();

    expect(component.submitErrorMessage()).toBe('contact.feedback.submitError');
    expect(component.submitSuccessMessage()).toBeNull();
    expect(component.isSubmitting()).toBeFalse();
  });

  it('should recover when preparing the request throws synchronously', () => {
    spyOn(console, 'error');
    contactApi.sendMessage.and.throwError('Unexpected client error');
    component.contactForm.patchValue({ name: 'Steven', message: 'Hello' });

    component.onSubmit();

    expect(component.submitErrorMessage()).toBe('contact.feedback.prepareError');
    expect(component.isSubmitting()).toBeFalse();
  });

  it('should clear submission feedback when the form changes', () => {
    component.submitSuccessMessage.set('contact.feedback.success');
    component.submitErrorMessage.set('contact.feedback.submitError');

    component.nameControl?.setValue('Updated');

    expect(component.submitSuccessMessage()).toBeNull();
    expect(component.submitErrorMessage()).toBeNull();
  });
});
