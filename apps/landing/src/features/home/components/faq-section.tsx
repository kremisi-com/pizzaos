import Image from "next/image";
import type { ReactElement } from "react";
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

export function FaqSection(): ReactElement {
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
        </div>

        <div className={styles.signature}>
          <Image
            className={styles.signatureLogo}
            src="/images/logo.png"
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
