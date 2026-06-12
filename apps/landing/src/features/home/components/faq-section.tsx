"use client";

import Image from "next/image";
import {
  type ChangeEvent,
  type FormEvent,
  type ReactElement,
  useState,
} from "react";
import styles from "./faq-section.module.css";

const CONTACTS = [
  {
    icon: <WhatsAppIcon />,
    title: "Telefono e WhatsApp",
    text: "Scrivici o chiama il numero +39 351 744 4749",
    green: true,
    href: "https://wa.me/393517444749",
  },
  {
    icon: <MailIcon />,
    title: "Email",
    text: "Inviaci una email info@kremisi.com",
    href: "mailto:info@kremisi.com",
  },
] satisfies readonly {
  readonly icon: ReactElement;
  readonly title: string;
  readonly text: string;
  readonly green?: boolean;
  readonly href?: string;
}[];

interface ContactFormData {
  readonly emailOrPhone: string;
  readonly name: string;
  readonly message: string;
}

interface ContactSubmitResponse {
  readonly success?: boolean;
  readonly message?: string;
  readonly error?: string;
  readonly errors?: readonly string[];
}

const EMPTY_CONTACT_FORM: ContactFormData = {
  emailOrPhone: "",
  name: "",
  message: "",
};

export function FaqSection(): ReactElement {
  const [formData, setFormData] =
    useState<ContactFormData>(EMPTY_CONTACT_FORM);
  const [contactError, setContactError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function handleFieldChange(
    field: keyof ContactFormData,
  ): (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void {
    return (event) => {
      setFormData((current) => ({
        ...current,
        [field]: event.target.value,
      }));
      setContactError(null);
      setSubmitted(false);

      if (field === "emailOrPhone") {
        setFieldError(null);
      }
    };
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    if (!formData.emailOrPhone.trim()) {
      setFieldError("Inserisci email o telefono");
      setSubmitted(false);
      return;
    }

    setSubmitting(true);
    setContactError(null);
    setFieldError(null);
    setSubmitted(false);

    try {
      const response = await fetch("/api/demo-request", {
        method: "POST",
        body: new URLSearchParams({
          requestType: "contact",
          emailOrPhone: formData.emailOrPhone,
          name: formData.name,
          message: formData.message,
        }),
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      });
      const result = await readContactSubmitResponse(response);

      if (!response.ok || !result.success) {
        setContactError(getContactSubmitError(result));
        return;
      }

      setSubmitted(true);
      setFormData(EMPTY_CONTACT_FORM);
    } catch {
      setContactError("Impossibile inviare il messaggio. Riprova tra poco.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className={styles.section} id="faq" aria-labelledby="faq-title">
      <div className={styles.inner}>
        <div className={styles.supportPanel}>
          <div className={styles.supportIntro}>
            <div className={styles.supportIcon}>
              <HeadsetIcon />
            </div>
            <div>
              <h3>Serve ancora aiuto o sei interessato a PizzaOS?</h3>
              <p>
                Il nostro team è sempre disponibile. Scegli come contattarci.
              </p>
            </div>
          </div>

          <div className={styles.contactGrid}>
            {CONTACTS.map((contact) => (
              <a
                className={styles.contactItem}
                aria-label={`${contact.title.toLocaleLowerCase()}: ${contact.text}`}
                key={contact.title}
                href={contact.href}
                rel={contact.href ? "noopener noreferrer" : undefined}
                target={contact.href?.startsWith("http") ? "_blank" : undefined}
              >
                <div
                  className={
                    contact.green ? styles.contactIconGreen : styles.contactIcon
                  }
                >
                  {contact.icon}
                </div>
                <div>
                  <h4>{contact.title}</h4>
                  <p>{contact.text}</p>
                </div>
              </a>
            ))}
          </div>

          <form
            className={styles.contactForm}
            onSubmit={handleSubmit}
            noValidate
          >
            <div className={styles.formHeader}>
              <h4>Scrivici direttamente</h4>
              <p>Lascia un recapito e ti rispondiamo appena possibile.</p>
            </div>

            <div className={styles.field}>
              <label htmlFor="contact-email-or-phone">Email o telefono</label>
              <input
                id="contact-email-or-phone"
                name="emailOrPhone"
                type="text"
                value={formData.emailOrPhone}
                onChange={handleFieldChange("emailOrPhone")}
                placeholder="mario@pizzeria.it oppure +39 333 123 4567"
                autoComplete="email"
                aria-required="true"
                aria-describedby={
                  fieldError ? "contact-email-or-phone-error" : undefined
                }
              />
              {fieldError ? (
                <span
                  className={styles.formError}
                  id="contact-email-or-phone-error"
                  role="alert"
                >
                  {fieldError}
                </span>
              ) : null}
            </div>

            <div className={styles.field}>
              <label htmlFor="contact-name">Nome completo</label>
              <input
                id="contact-name"
                name="name"
                type="text"
                value={formData.name}
                onChange={handleFieldChange("name")}
                placeholder="Mario Rossi"
                autoComplete="name"
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="contact-message">Messaggio</label>
              <textarea
                id="contact-message"
                name="message"
                value={formData.message}
                onChange={handleFieldChange("message")}
                placeholder="Raccontaci cosa vuoi sapere su PizzaOS"
                rows={4}
              />
            </div>

            {contactError ? (
              <p className={styles.submitError} role="alert">
                {contactError}
              </p>
            ) : null}

            {submitted ? (
              <p className={styles.submitSuccess} role="status">
                Messaggio inviato. Ti ricontatteremo al piu presto.
              </p>
            ) : null}

            <button
              className={styles.submitButton}
              type="submit"
              disabled={submitting}
            >
              {submitting ? "Invio in corso..." : "Invia messaggio"}
            </button>
          </form>
        </div>

        <div className={styles.signature}>
          <Image
            className={styles.signatureLogo}
            src="/brand/logo-horizontal-color.svg"
            alt="PizzaOS"
            width={1663}
            height={332}
          />
          <span aria-hidden="true" />
          <p>La piattaforma completa per pizzerie moderne.</p>
        </div>
      </div>
    </section>
  );
}

async function readContactSubmitResponse(
  response: Response,
): Promise<ContactSubmitResponse> {
  try {
    const jsonValue: unknown = await response.json();

    if (jsonValue && typeof jsonValue === "object") {
      return jsonValue as ContactSubmitResponse;
    }
  } catch {
    return {};
  }

  return {};
}

function getContactSubmitError(result: ContactSubmitResponse): string {
  if (typeof result.error === "string" && result.error.trim()) {
    return result.error;
  }

  const firstError = result.errors?.find((error) => error.trim() !== "");

  return firstError ?? "Impossibile inviare il messaggio. Riprova tra poco.";
}

function IconBase({
  children,
}: {
  readonly children: ReactElement | readonly ReactElement[];
}): ReactElement {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      {children}
    </svg>
  );
}

function HeadsetIcon(): ReactElement {
  return (
    <IconBase>
      <path d="M4 13a8 8 0 0 1 16 0" />
      <path d="M4 13v4a2 2 0 0 0 2 2h2v-8H6a2 2 0 0 0-2 2Z" />
      <path d="M20 13v4a2 2 0 0 1-2 2h-2v-8h2a2 2 0 0 1 2 2Z" />
      <path d="M15 21h-3" />
    </IconBase>
  );
}

function WhatsAppIcon(): ReactElement {
  return (
    <IconBase>
      <path d="M5.5 19 6.6 16.2a7.5 7.5 0 1 1 2.4 2.1L5.5 19Z" />
      <path d="M9.3 8.7c.3 3 2.1 4.8 5 5.4l1-1.4-1.7-1-1 1c-1-.4-1.7-1.1-2.1-2.1l1-1-1-1.7-1.2.8Z" />
    </IconBase>
  );
}

function MailIcon(): ReactElement {
  return (
    <IconBase>
      <path d="M4 6h16v12H4V6Z" />
      <path d="m4 8 8 6 8-6" />
    </IconBase>
  );
}
