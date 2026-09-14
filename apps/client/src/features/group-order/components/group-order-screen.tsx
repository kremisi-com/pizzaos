"use client";

import { getThemeClass } from "@pizzaos/brand";
import type { ClientSeed } from "@pizzaos/mock-data";
import { useEffect, useState, type ReactElement } from "react";
import { loadClientDemoState } from "../../home/client-demo-state";
import { deriveGroupOrderSubtotalCents, getGroupOrderParticipantItems, GROUP_ORDER_CURRENT_PARTICIPANT_ID, loadGroupOrderState, removeGroupOrderItem, setGroupOrderItemQuantity, type GroupOrderState } from "../group-order-model";
import styles from "./group-order-screen.module.css";

const GROUP_ORDER_SHARE_URL = "https://demo.pizzaos.app/gruppo/stasera-da-dividere";
const MONEY_FORMATTER = new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" });

function resolveStorage(): Storage | undefined { return typeof window === "undefined" ? undefined : window.localStorage; }

async function copyGroupOrderLink(): Promise<boolean>
{
  try
  {
    if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(GROUP_ORDER_SHARE_URL); return true; }
  }
  catch { return false; }
  return false;
}

export function GroupOrderScreen(): ReactElement
{
  const [seed, setSeed] = useState<ClientSeed>(() => loadClientDemoState());
  const [groupOrder, setGroupOrder] = useState<GroupOrderState>(() => loadGroupOrderState());
  const [isQrCodeVisible, setIsQrCodeVisible] = useState(true);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);

  useEffect(() => { const storage = resolveStorage(); setSeed(loadClientDemoState(storage)); setGroupOrder(loadGroupOrderState(storage)); }, []);

  const personalSubtotal = deriveGroupOrderSubtotalCents(groupOrder.items, GROUP_ORDER_CURRENT_PARTICIPANT_ID);
  const groupTotal = deriveGroupOrderSubtotalCents(groupOrder.items);

  async function handleShareLink(): Promise<void> { setShareFeedback(await copyGroupOrderLink() ? "Link copiato" : "Link pronto da condividere"); }
  function updateQuantity(itemId: string, quantity: number): void { setGroupOrder(setGroupOrderItemQuantity(itemId, quantity, resolveStorage())); }
  function removeItem(itemId: string): void { setGroupOrder(removeGroupOrderItem(itemId, resolveStorage())); }

  return (
    <main className={`${getThemeClass(seed.surface)} ${styles.screen}`}>
      <header className={styles.header}>
        <a href="/menu" className={styles.backButton}>← Torna al menu</a>
        <h1 className={styles.title}>{groupOrder.name}</h1>
        <p className={styles.subtitle}>Carrello condiviso locale: ogni scelta resta in questa demo.</p>
        <section className={styles.shareSection} aria-label="Condivisione carrello">
          {isQrCodeVisible ? <div id="group-order-qr-code" className={styles.qrCodePlaceholder} aria-label="QR code del carrello condiviso"><span className={styles.qrCornerTopLeft} /><span className={styles.qrCornerTopRight} /><span className={styles.qrCornerBottomLeft} /><span className={styles.qrInnerPattern} /></div> : null}
          <p className={styles.shareHint}>QR e link sono pronti per la presentazione: nessun invito reale viene inviato.</p>
          <div className={styles.shareActions}>
            <button type="button" className={styles.shareLinkButton} onClick={handleShareLink}>Condividi link</button>
            <button type="button" className={styles.qrToggleButton} onClick={() => setIsQrCodeVisible((current) => !current)} aria-controls="group-order-qr-code" aria-expanded={isQrCodeVisible}>{isQrCodeVisible ? "Nascondi QR" : "Mostra QR"}</button>
          </div>
          {shareFeedback ? <p className={styles.shareFeedback} aria-live="polite">{shareFeedback}</p> : null}
        </section>
      </header>
      <section className={styles.summaryCard} aria-label="Riepilogo gruppo"><span>{groupOrder.participants.length} partecipanti</span><strong>Totale gruppo {formatMoney(groupTotal)}</strong><span>Il tuo subtotale {formatMoney(personalSubtotal)}</span></section>
      <section className={styles.participantsSection} aria-labelledby="participants-title">
        <div className={styles.sectionHeader}><h2 id="participants-title" className={styles.sectionTitle}>Scelte del gruppo</h2><span className={styles.memberCount}>{groupOrder.participants.length} amici</span></div>
        <div className={styles.participantList}>{groupOrder.participants.map((participant) =>
        {
          const items = getGroupOrderParticipantItems(groupOrder, participant.id);
          const isCurrentParticipant = participant.id === GROUP_ORDER_CURRENT_PARTICIPANT_ID;
          return <article key={participant.id} className={styles.participantCard}>
            <span className={styles.participantEmoji} aria-hidden="true">{participant.emoji}</span><div className={styles.participantInfo}>
              <p className={styles.participantName}>{participant.name}{participant.isHost ? " · Host" : ""}</p>
              <p className={styles.participantChoice}>{items.length ? items.map((item) => `${item.quantity}× ${item.productName}`).join(", ") : "Nessuna scelta ancora"}</p>
              {isCurrentParticipant && items.map((item) => <div key={item.id} className={styles.yourItemActions}><span>{item.productName}</span><button type="button" aria-label={`Diminuisci quantità ${item.productName}`} onClick={() => updateQuantity(item.id, item.quantity - 1)}>−</button><span>{item.quantity}</span><button type="button" aria-label={`Aumenta quantità ${item.productName}`} onClick={() => updateQuantity(item.id, item.quantity + 1)}>+</button><button type="button" onClick={() => removeItem(item.id)}>Rimuovi</button></div>)}
            </div><span className={items.length ? styles.participantStatus : styles.participantPending}>{items.length ? "Pronto" : "Non pronto"}</span>
          </article>;
        })}</div>
      </section>
      <section className={styles.actions}><a href="/menu?order=group" className={styles.primaryAction}>Aggiungi al tuo contributo</a><a href="/checkout?order=group" className={styles.secondaryAction}>Checkout unico dell&apos;host</a></section>
    </main>
  );
}

function formatMoney(amountCents: number): string { return MONEY_FORMATTER.format(amountCents / 100); }
