"use client";

import type { IndividualQuote, LoyaltyWallet, PromotionsApi, PromotionSelection } from "@pizzaos/domain";
import { useEffect, useRef, useState } from "react";
import styles from "./promotions.module.css";
export interface PromotionSelectionProps { api: PromotionsApi; storeId: string; selection?: PromotionSelection; disabled?: boolean; refreshVersion?: number; onChange: (selection: PromotionSelection) => void; onTermsChange?: () => void; }

const money = (cents: number) => new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(cents / 100);
const walletTerms = (wallet: LoyaltyWallet) => JSON.stringify({ storeId: wallet.storeId, program: wallet.program,
  availablePoints: wallet.availablePoints, heldPoints: wallet.heldPoints, balancePoints: wallet.balancePoints });

export function PromotionSelectionPanel({ api, storeId, selection, disabled = false, refreshVersion = 0, onChange, onTermsChange }: PromotionSelectionProps) {
  const [wallet, setWallet] = useState<LoyaltyWallet | null>(null);
  const [error, setError] = useState("");
  const [codes, setCodes] = useState(selection?.couponCodes.join(", ") ?? "");
  const previous = useRef<LoyaltyWallet | null>(null);
  const termsChanged = useRef(onTermsChange);
  useEffect(() => { termsChanged.current = onTermsChange; }, [onTermsChange]);
  const selectedCodes = JSON.stringify(selection?.couponCodes ?? []);
  useEffect(() => { setCodes((JSON.parse(selectedCodes) as string[]).join(", ")); }, [selectedCodes, storeId]);
  useEffect(() => {
    if (previous.current?.storeId !== storeId) { previous.current = null; setWallet(null); }
    let active = true;
    let inFlight = false;
    const read = async () => {
      if (inFlight) return;
      inFlight = true;
      try {
        const next = await api.wallet(storeId);
        if (!active || next.storeId !== storeId) return;
        if (previous.current && walletTerms(previous.current) !== walletTerms(next)) termsChanged.current?.();
        previous.current = next; setWallet(next); setError("");
      } catch { if (active) setError("Saldo punti non disponibile. Riprova tra poco: prezzi e benefici si verificano al checkout."); }
      finally { inFlight = false; }
    };
    void read(); const timer = setInterval(() => void read(), 5000);
    return () => { active = false; clearInterval(timer); };
  }, [api, storeId, refreshVersion]);
  const current = wallet?.storeId === storeId ? wallet : null;
  const canRedeem = Boolean(current?.program.enabled && current.availablePoints >= current.program.rewardPoints);
  return <section className={styles.selection} aria-label="Coupon e fedeltà"><h3>Coupon e fedeltà</h3>
    {error && <p role="alert">{error}</p>}
    {current ? <><dl className={styles.wallet}><div><dt>Saldo punti</dt><dd>{current.balancePoints}</dd></div><div><dt>Punti impegnati</dt><dd>{current.heldPoints}</dd></div><div><dt>Punti disponibili</dt><dd>{current.availablePoints}</dd></div></dl>
      <p className={styles.small}>{current.program.enabled ? `${current.program.pointsPerEuro} ${current.program.pointsPerEuro === 1 ? "punto" : "punti"} per ogni euro netto sui prodotti, a ordine completato.` : "Il programma fedeltà è sospeso per i nuovi ordini."} Nessuna scadenza punti.</p>
      <p className={styles.small}>Un premio: {current.program.rewardPoints} {current.program.rewardPoints === 1 ? "punto" : "punti"} per {money(current.program.rewardCents)} sui prodotti.</p>
    </> : <p role="status">Caricamento saldo punti…</p>}
    <label>Codici coupon<input value={codes} maxLength={600} disabled={disabled} placeholder="Es. BENVENUTO, PIZZA10" onChange={event => setCodes(event.target.value)} /></label>
    <p className={styles.small}>Separa i codici con una virgola. Le percentuali si applicano nell&apos;ordine indicato, poi gli importi fissi.</p>
    <button type="button" disabled={disabled} onClick={() => onChange({ couponCodes: codes.split(",").map(code => code.trim().toUpperCase()).filter(Boolean), redeemReward: selection?.redeemReward ?? false })}>Applica coupon</button>
    <label className={styles.reward}><input type="checkbox" checked={selection?.redeemReward ?? false} disabled={disabled || (!canRedeem && !selection?.redeemReward)} onChange={event => onChange({ couponCodes: selection?.couponCodes ?? [], redeemReward: event.target.checked })} />Usa premio fedeltà</label>
    {current && !canRedeem && !selection?.redeemReward && <p className={styles.small}>Il premio sarà selezionabile con punti sufficienti e programma attivo.</p>}
    {current && current.movements.length > 0 && <details><summary>Movimenti punti</summary><ul className={styles.movements}>{current.movements.map(movement => <li key={movement.id}>
      {movement.kind === "earn" ? "Accredito" : movement.status === "released" ? "Premio restituito" : movement.status === "reserved" ? "Premio impegnato" : "Premio riscattato"}: {movement.points} punti · {new Date(movement.createdAt).toLocaleDateString("it-IT")}
    </li>)}</ul></details>}
  </section>;
}

export function PromotionSummary({ quote }: { quote: IndividualQuote }) {
  const benefits = quote.promotions;
  if (!benefits) return null;
  return <section className={styles.summary} aria-label="Sconti applicati"><h3>Vantaggi applicati</h3>
    <dl><div><dt>Prodotti prima degli sconti</dt><dd>{money(benefits.originalSubtotalCents)}</dd></div></dl>
    <p className={styles.small}>Sconti coupon</p><ul className={styles.movements}>{benefits.coupons.map(coupon => <li key={coupon.id}>{coupon.code}: −{money(coupon.discountCents)}</li>)}</ul>
    <dl><div><dt>Premio fedeltà</dt><dd>−{money(benefits.rewardDiscountCents)}{benefits.redeemedPoints > 0 ? ` (${benefits.redeemedPoints} ${benefits.redeemedPoints === 1 ? "punto" : "punti"})` : ""}</dd></div>
      <div><dt>Prodotti netti</dt><dd>{money(benefits.netSubtotalCents)}</dd></div><div><dt>Consegna</dt><dd>{money(quote.deliveryCents)}</dd></div>
      <div className={styles.total}><dt>Totale</dt><dd>{money(quote.totalCents)}</dd></div></dl>
    <p className={styles.small}>Il premio riduce solo i prodotti, fino al residuo disponibile. I punti maturano sul netto prodotti a ordine completato.</p>
  </section>;
}
