import type { ReactElement } from "react";
import styles from "./faq-section.module.css";

const FILTERS = [
  { label: "Tutte", icon: <BriefcaseIcon />, active: true },
  { label: "Ordini", icon: <BagIcon />, active: false },
  { label: "Pagamenti", icon: <CardIcon />, active: false },
  { label: "Riders e consegne", icon: <ScooterIcon />, active: false },
  { label: "Piattaforma", icon: <PanelIcon />, active: false },
  { label: "Ristoratori", icon: <StoreIcon />, active: false },
  { label: "Sicurezza e privacy", icon: <ShieldIcon />, active: false }
] as const;

const QUESTIONS = [
  {
    icon: <BagIcon />,
    title: "Come posso effettuare un ordine con PizzaOS?",
    answer: "Scegli i prodotti, personalizza la tua pizza, seleziona orario e metodo di pagamento e conferma. È tutto da app!"
  },
  {
    icon: <GroupIcon />,
    title: "Posso ordinare insieme ad amici o familiari?",
    answer: "Certo! Con il menu condiviso potete aggiungere prodotti insieme da dispositivi diversi e pagare anche in modalità split."
  },
  {
    icon: <ClockIcon />,
    title: "Posso modificare o annullare un ordine?",
    answer: "Sì, puoi modificare o annullare l'ordine entro i tempi indicati dallo stato dell'ordine nella sezione “I miei ordini”."
  },
  {
    icon: <TicketIcon />,
    title: "Come funziona la tessera fedeltà?",
    answer: "Ogni ordine ti fa guadagnare punti. Raggiungi le soglie e ottieni sconti, prodotti gratuiti e premi esclusivi."
  },
  {
    icon: <PinIcon />,
    title: "Come funziona il tracciamento del rider?",
    answer: "Appena l'ordine viene affidato al rider, puoi seguirlo in tempo reale sulla mappa e ricevere aggiornamenti sullo stato della consegna."
  },
  {
    icon: <PhoneIcon />,
    title: "Cosa succede se chiamo la pizzeria?",
    answer: "Dopo un messaggio automatico con il link per ordinare, se rimani in linea oltre il tempo indicato verrai messo in contatto con noi."
  },
  {
    icon: <CardIcon />,
    title: "Quali metodi di pagamento sono accettati?",
    answer: "Accettiamo carte, Apple Pay, Google Pay, PayPal e Satispay. Puoi anche pagare in contanti alla consegna, se disponibile."
  },
  {
    icon: <StoreIcon />,
    title: "PizzaOS è adatto anche a catene o più sedi?",
    answer: "Sì! Puoi gestire più locali e sedi da un unico pannello, con dati consolidati e impostazioni personalizzate per ogni punto vendita."
  },
  {
    icon: <ReceiptIcon />,
    title: "Riceverò la fattura o lo scontrino?",
    answer: "Sì, ricevi fattura e scontrino elettronico automaticamente via email, WhatsApp o direttamente nell'app."
  },
  {
    icon: <LockIcon />,
    title: "I miei dati e i pagamenti sono sicuri?",
    answer: "Assolutamente sì. Utilizziamo i più alti standard di sicurezza e i dati sono protetti secondo il GDPR."
  }
] as const;

const CONTACTS = [
  {
    icon: <ChatIcon />,
    title: "Chat live",
    text: "Risposta immediata da lunedì a domenica 9:00 – 23:00"
  },
  {
    icon: <WhatsAppIcon />,
    title: "WhatsApp",
    text: "Scrivici su WhatsApp +39 123 456 7890",
    green: true
  },
  {
    icon: <MailIcon />,
    title: "Email",
    text: "Inviaci una email supporto@pizzaos.it"
  },
  {
    icon: <BookIcon />,
    title: "Centro assistenza",
    text: "Guide, tutorial e risposte a portata di click"
  }
] satisfies readonly {
  readonly icon: ReactElement;
  readonly title: string;
  readonly text: string;
  readonly green?: boolean;
}[];

export function FaqSection(): ReactElement
{
  return (
    <section className={styles.section} id="faq" aria-labelledby="faq-title">
      <div className={styles.inner}>
        <div className={styles.eyebrow}>
          <QuestionIcon />
          <span>FAQ</span>
        </div>

        <h2 className={styles.title} id="faq-title">
          Hai domande?<br />
          Abbiamo <span>le risposte.</span>
        </h2>

        <p className={styles.subtitle}>
          Tutto quello che serve per usare PizzaOS al meglio.<br />
          Non trovi quello che cerchi? Siamo qui per aiutarti.
        </p>

        <div className={styles.filters} aria-label="Categorie FAQ">
          {FILTERS.map((filter) => (
            <button
              className={filter.active ? styles.filterActive : styles.filter}
              type="button"
              key={filter.label}
            >
              {filter.icon}
              {filter.label}
            </button>
          ))}
        </div>

        <div className={styles.questionGrid}>
          {QUESTIONS.map((question) => (
            <article className={styles.questionCard} key={question.title}>
              <div className={styles.questionIcon}>{question.icon}</div>
              <div className={styles.questionCopy}>
                <h3>{question.title}</h3>
                <p>{question.answer}</p>
              </div>
              <ChevronIcon />
            </article>
          ))}
        </div>

        <div className={styles.supportPanel}>
          <div className={styles.supportIntro}>
            <div className={styles.supportIcon}>
              <HeadsetIcon />
            </div>
            <div>
              <h3>Serve ancora aiuto?</h3>
              <p>Il nostro team è sempre disponibile. Scegli come contattarci.</p>
            </div>
          </div>

          <div className={styles.contactGrid}>
            {CONTACTS.map((contact) => (
              <article className={styles.contactItem} key={contact.title}>
                <div className={contact.green ? styles.contactIconGreen : styles.contactIcon}>
                  {contact.icon}
                </div>
                <div>
                  <h4>{contact.title}</h4>
                  <p>{contact.text}</p>
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className={styles.signature}>
          <span className={styles.brandMark}>P</span>
          <strong>PizzaOS</strong>
          <span aria-hidden="true" />
          <p>La piattaforma completa per pizzerie moderne.</p>
        </div>
      </div>
    </section>
  );
}

function IconBase({ children }: { readonly children: ReactElement | readonly ReactElement[] }): ReactElement
{
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      {children}
    </svg>
  );
}

function QuestionIcon(): ReactElement
{
  return <IconBase><circle cx="12" cy="12" r="9" /><path d="M9.8 9.2a2.4 2.4 0 0 1 4.6 1.1c0 1.8-2.4 2-2.4 3.8" /><path d="M12 17.4h.1" /></IconBase>;
}

function BriefcaseIcon(): ReactElement
{
  return <IconBase><path d="M9 7V5.8C9 4.8 9.8 4 10.8 4h2.4c1 0 1.8.8 1.8 1.8V7" /><path d="M5 7h14v12H5V7Z" /><path d="M9 12h6" /></IconBase>;
}

function BagIcon(): ReactElement
{
  return <IconBase><path d="M6 8h12l1 12H5L6 8Z" /><path d="M9 8a3 3 0 0 1 6 0" /></IconBase>;
}

function CardIcon(): ReactElement
{
  return <IconBase><path d="M4 7h16v10H4V7Z" /><path d="M4 10h16" /><path d="M7 14h4" /></IconBase>;
}

function ScooterIcon(): ReactElement
{
  return <IconBase><path d="M4 16h7l1.5-7H9L8 5H5" /><path d="M13 16h3l2-5h3v5h-1" /><circle cx="7" cy="17" r="2" /><circle cx="19" cy="17" r="2" /></IconBase>;
}

function PanelIcon(): ReactElement
{
  return <IconBase><path d="M4 6h16v12H4V6Z" /><path d="M4 10h16" /><path d="M8 14h8" /></IconBase>;
}

function StoreIcon(): ReactElement
{
  return <IconBase><path d="M5 10h14l-1-5H6l-1 5Z" /><path d="M6 10v9h12v-9" /><path d="M9 19v-5h6v5" /><path d="M4 10c0 1.2 1 2 2 2s2-.8 2-2c0 1.2 1 2 2 2s2-.8 2-2c0 1.2 1 2 2 2s2-.8 2-2c0 1.2 1 2 2 2s2-.8 2-2" /></IconBase>;
}

function ShieldIcon(): ReactElement
{
  return <IconBase><path d="M12 21s7-3.5 7-10V6l-7-3-7 3v5c0 6.5 7 10 7 10Z" /><path d="m9 12 2 2 4-5" /></IconBase>;
}

function GroupIcon(): ReactElement
{
  return <IconBase><circle cx="9" cy="9" r="3" /><circle cx="17" cy="10" r="2.5" /><path d="M3.5 19c.7-3 2.6-4.5 5.5-4.5s4.8 1.5 5.5 4.5" /><path d="M13.5 16c.8-.7 1.9-1 3.2-1 2.3 0 3.8 1.2 4.3 3.8" /></IconBase>;
}

function ClockIcon(): ReactElement
{
  return <IconBase><circle cx="12" cy="12" r="8" /><path d="M12 7v5l3 2" /></IconBase>;
}

function TicketIcon(): ReactElement
{
  return <IconBase><path d="M4 8h16v8H4V8Z" /><path d="m9 10 .7 1.4 1.6.2-1.1 1.1.3 1.6L9 13.5l-1.4.8.2-1.6-1.1-1.1 1.6-.2L9 10Z" /><path d="M15 10h3M15 14h3" /></IconBase>;
}

function PinIcon(): ReactElement
{
  return <IconBase><path d="M12 21s6-5.1 6-11a6 6 0 0 0-12 0c0 5.9 6 11 6 11Z" /><circle cx="12" cy="10" r="2" /></IconBase>;
}

function PhoneIcon(): ReactElement
{
  return <IconBase><path d="M7 4 9.4 7.8 8 9.4c1.1 2.2 2.4 3.5 4.6 4.6l1.6-1.4L18 15l-.7 3c-.2.9-1 1.4-1.9 1.2C9.8 18.2 5.8 14.2 4.8 8.6 4.6 7.7 5.1 6.9 6 6.7L7 4Z" /></IconBase>;
}

function ReceiptIcon(): ReactElement
{
  return <IconBase><path d="M7 3h10v18l-2-1.2-2 1.2-2-1.2-2 1.2-2-1.2V3Z" /><path d="M10 8h4M10 12h4M10 16h3" /></IconBase>;
}

function LockIcon(): ReactElement
{
  return <IconBase><path d="M6 10h12v10H6V10Z" /><path d="M9 10V7a3 3 0 0 1 6 0v3" /><path d="M12 14v2" /></IconBase>;
}

function ChevronIcon(): ReactElement
{
  return <IconBase><path d="m7 9 5 5 5-5" /></IconBase>;
}

function HeadsetIcon(): ReactElement
{
  return <IconBase><path d="M4 13a8 8 0 0 1 16 0" /><path d="M4 13v4a2 2 0 0 0 2 2h2v-8H6a2 2 0 0 0-2 2Z" /><path d="M20 13v4a2 2 0 0 1-2 2h-2v-8h2a2 2 0 0 1 2 2Z" /><path d="M15 21h-3" /></IconBase>;
}

function ChatIcon(): ReactElement
{
  return <IconBase><path d="M5 6h14v10H9l-4 3V6Z" /></IconBase>;
}

function WhatsAppIcon(): ReactElement
{
  return <IconBase><path d="M5.5 19 6.6 16.2a7.5 7.5 0 1 1 2.4 2.1L5.5 19Z" /><path d="M9.3 8.7c.3 3 2.1 4.8 5 5.4l1-1.4-1.7-1-1 1c-1-.4-1.7-1.1-2.1-2.1l1-1-1-1.7-1.2.8Z" /></IconBase>;
}

function MailIcon(): ReactElement
{
  return <IconBase><path d="M4 6h16v12H4V6Z" /><path d="m4 8 8 6 8-6" /></IconBase>;
}

function BookIcon(): ReactElement
{
  return <IconBase><path d="M5 5.5c2.4 0 4.5.5 7 2v12c-2.5-1.5-4.6-2-7-2v-12Z" /><path d="M19 5.5c-2.4 0-4.5.5-7 2v12c2.5-1.5 4.6-2 7-2v-12Z" /></IconBase>;
}
