import { getThemeClass } from "@pizzaos/brand";
import { Badge } from "@pizzaos/ui";
import type { ClientSeed } from "@pizzaos/mock-data";
import type { ReactElement } from "react";
import { loadClientDemoState } from "../../home/client-demo-state";
import styles from "./group-order-screen.module.css";

function loadSeed(): ClientSeed
{
  if (typeof window === "undefined")
  {
    return loadClientDemoState();
  }

  return loadClientDemoState(window.localStorage);
}

const PARTICIPANTS = [
  {
    emoji: "🍕",
    name: "Sara",
    choice: "Margherita extra bufala"
  },
  {
    emoji: "🌶️",
    name: "Luca",
    choice: "Diavola piccante"
  },
  {
    emoji: "🥗",
    name: "Marta",
    choice: "Vegetariana senza olive"
  }
] as const;

export function GroupOrderScreen(): ReactElement
{
  const seed = loadSeed();

  return (
    <main className={`${getThemeClass(seed.surface)} ${styles.screen}`}>
      <header className={styles.header}>
        <a href="/menu" className={styles.backButton}>← Torna al menu</a>
        <Badge tone="neutral">Demo sociale</Badge>
        <h1 className={styles.title}>Gruppo amici</h1>
        <p className={styles.subtitle}>
          Un carrello condiviso per raccogliere gusti, modifiche e note prima di chiudere l&apos;ordine.
        </p>
      </header>

      <section className={styles.summaryCard} aria-labelledby="group-order-summary-title">
        <div>
          <p className={styles.eyebrow}>Ordine condiviso</p>
          <h2 id="group-order-summary-title" className={styles.cardTitle}>Stasera da dividere in 4</h2>
        </div>
        <p className={styles.meta}>Consegna proposta 20:35 · Tavolo chat attivo</p>
      </section>

      <section className={styles.participantsSection} aria-labelledby="participants-title">
        <div className={styles.sectionHeader}>
          <h2 id="participants-title" className={styles.sectionTitle}>Chi c&apos;è nel gruppo</h2>
          <span className={styles.memberCount}>4 amici</span>
        </div>

        <div className={styles.participantList}>
          {PARTICIPANTS.map((participant) => (
            <article key={participant.name} className={styles.participantCard}>
              <span className={styles.participantEmoji} aria-hidden="true">{participant.emoji}</span>
              <div className={styles.participantInfo}>
                <p className={styles.participantName}>{participant.name}</p>
                <p className={styles.participantChoice}>{participant.choice}</p>
              </div>
              <span className={styles.participantStatus}>Pronto</span>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.actions}>
        <a href="/menu" className={styles.primaryAction}>Aggiungi la tua pizza</a>
        <a href="/cart" className={styles.secondaryAction}>Apri il carrello del gruppo</a>
      </section>
    </main>
  );
}
