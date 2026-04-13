"use client";

import { getThemeClass } from "@pizzaos/brand";
import type { ClientSeed } from "@pizzaos/mock-data";
import { useEffect, useState, type ReactElement } from "react";
import { loadClientDemoState } from "../../home/client-demo-state";
import styles from "./group-order-screen.module.css";

const GROUP_ORDER_SHARE_URL = "https://demo.pizzaos.app/gruppo/stasera-da-dividere";

function resolveStorage(): Storage | undefined
{
  if (typeof window === "undefined")
  {
    return undefined;
  }

  return window.localStorage;
}

async function copyGroupOrderLink(): Promise<boolean>
{
  try
  {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText)
    {
      await navigator.clipboard.writeText(GROUP_ORDER_SHARE_URL);

      return true;
    }
  }
  catch
  {
    return false;
  }

  if (typeof document === "undefined")
  {
    return false;
  }

  const temporaryInput = document.createElement("input");
  const legacyDocument = document as Document & {
    execCommand?: (commandId: string) => boolean;
  };

  temporaryInput.value = GROUP_ORDER_SHARE_URL;
  temporaryInput.setAttribute("readonly", "true");
  temporaryInput.style.position = "absolute";
  temporaryInput.style.left = "-9999px";

  document.body.appendChild(temporaryInput);
  temporaryInput.select();
  temporaryInput.setSelectionRange(0, temporaryInput.value.length);

  const didCopy = legacyDocument.execCommand?.("copy") ?? false;

  document.body.removeChild(temporaryInput);

  return didCopy;
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
  const [seed, setSeed] = useState<ClientSeed>(() => loadClientDemoState());
  const [isQrCodeVisible, setIsQrCodeVisible] = useState(true);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);

  useEffect(() =>
  {
    setSeed(loadClientDemoState(resolveStorage()));
  }, []);

  async function handleShareLink(): Promise<void>
  {
    const didCopy = await copyGroupOrderLink();

    setShareFeedback(didCopy ? "Link copiato" : "Link pronto da condividere");
  }

  return (
    <main className={`${getThemeClass(seed.surface)} ${styles.screen}`}>
      <header className={styles.header}>
        <a href="/menu" className={styles.backButton}>← Torna al menu</a>
        <h1 className={styles.title}>Carrello condiviso</h1>
        <p className={styles.subtitle}>
          Ognuno può prendere la pizza dal proprio cellulare e pagare quello che vuole.
        </p>
        <section className={styles.shareSection} aria-label="Condivisione carrello">
          {isQrCodeVisible ? (
            <div
              id="group-order-qr-code"
              className={styles.qrCodePlaceholder}
              aria-label="QR code del carrello condiviso"
            >
              <span className={styles.qrCornerTopLeft} aria-hidden="true" />
              <span className={styles.qrCornerTopRight} aria-hidden="true" />
              <span className={styles.qrCornerBottomLeft} aria-hidden="true" />
              <span className={styles.qrInnerPattern} aria-hidden="true" />
            </div>
          ) : null}

          <button type="button" className={styles.shareLinkButton} onClick={handleShareLink}>
            condividi link
          </button>
          <button
            type="button"
            className={styles.qrToggleButton}
            onClick={() => setIsQrCodeVisible((currentValue) => !currentValue)}
            aria-controls="group-order-qr-code"
            aria-expanded={isQrCodeVisible}
          >
            {isQrCodeVisible ? "nascondi QR code" : "mostra QR code"}
          </button>
          {shareFeedback ? (
            <p className={styles.shareFeedback} aria-live="polite">{shareFeedback}</p>
          ) : null}
        </section>
      </header>

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
