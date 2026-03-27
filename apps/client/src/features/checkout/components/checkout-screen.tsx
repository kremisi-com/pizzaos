"use client";

import type { ClientSeed } from "@pizzaos/mock-data";
import { Badge, Button, ShellCard } from "@pizzaos/ui";
import { useEffect, useMemo, useState, type FormEvent, type ReactElement } from "react";
import {
  clearCartState,
  loadCartState,
  type CartState
} from "../../cart/cart-model";
import {
  createMockOrder,
  DELIVERY_FEE_CENTS,
  deriveCheckoutTotals,
  PAYMENT_SIMULATION_DELAY_MS,
  resolveSlotSelection,
  TIP_PERCENT_OPTIONS,
  type CheckoutValidationErrors,
  type PaymentMethod,
  validateCheckoutInput
} from "../checkout-model";
import {
  loadClientDemoState,
  saveClientDemoState
} from "../../home/client-demo-state";
import { deriveSlotAvailability } from "../../menu/menu-view-model";
import styles from "./checkout-screen.module.css";

const MONEY_FORMATTER = new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR"
});

interface CheckoutConfirmation
{
  readonly orderId: string;
  readonly slotLabel: string;
  readonly tipPercent: number;
  readonly paymentMethod: PaymentMethod;
  readonly totalCents: number;
}

function resolveStorage(): Storage | undefined
{
  if (typeof window === "undefined")
  {
    return undefined;
  }

  return window.localStorage;
}

export function CheckoutScreen(): ReactElement
{
  const [seed, setSeed] = useState<ClientSeed>(() => loadClientDemoState());
  const [cartState, setCartState] = useState<CartState>(() => loadCartState());
  const [selectedSlotId, setSelectedSlotId] = useState("");
  const [tipPercent, setTipPercent] = useState<number>(TIP_PERCENT_OPTIONS[1]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("card");
  const [cardholderName, setCardholderName] = useState("");
  const [cardLastDigits, setCardLastDigits] = useState("");
  const [validationErrors, setValidationErrors] = useState<CheckoutValidationErrors>({});
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [confirmation, setConfirmation] = useState<CheckoutConfirmation | null>(null);

  useEffect(() =>
  {
    const storage = resolveStorage();
    const hydratedSeed = loadClientDemoState(storage);
    const hydratedCart = loadCartState(storage);

    setSeed(hydratedSeed);
    setCartState(hydratedCart);
    setSelectedSlotId(resolveSlotSelection(hydratedSeed.slots));
  }, []);

  const totals = useMemo(
    () =>
      deriveCheckoutTotals(cartState.items, {
        tipPercent,
        deliveryFeeCents: DELIVERY_FEE_CENTS
      }),
    [cartState.items, tipPercent]
  );

  function handleCheckoutSubmit(event: FormEvent<HTMLFormElement>): void
  {
    event.preventDefault();

    const errors = validateCheckoutInput({
      items: cartState.items,
      slots: seed.slots,
      selectedSlotId,
      paymentMethod,
      cardholderName,
      cardLastDigits
    });

    if (Object.keys(errors).length > 0)
    {
      setValidationErrors(errors);
      return;
    }

    const selectedSlot = seed.slots.find((slot) => slot.slotId === selectedSlotId);

    if (!selectedSlot)
    {
      setValidationErrors({
        selectedSlotId: "Seleziona uno slot disponibile per continuare."
      });
      return;
    }

    setValidationErrors({});
    setIsProcessingPayment(true);

    window.setTimeout(() =>
    {
      const storage = resolveStorage();
      const createdAtIso = new Date(Date.now()).toISOString();
      const nextOrder = createMockOrder({
        storeId: seed.store.id,
        customerId: seed.loyalty.customerId,
        items: cartState.items,
        selectedSlotLabel: selectedSlot.label,
        totals,
        createdAtIso
      });
      const nextSeed: ClientSeed = {
        ...seed,
        activeOrders: [
          nextOrder,
          ...seed.activeOrders
        ],
        orderHistory: [
          nextOrder,
          ...seed.orderHistory
        ],
        simulationCursorIso: createdAtIso
      };

      setSeed(saveClientDemoState(nextSeed, storage));
      setCartState(clearCartState(storage));
      setConfirmation({
        orderId: nextOrder.id,
        slotLabel: selectedSlot.label,
        tipPercent,
        paymentMethod,
        totalCents: totals.totalCents
      });
      setIsProcessingPayment(false);
    }, PAYMENT_SIMULATION_DELAY_MS);
  }

  if (confirmation)
  {
    return (
      <main className={styles.screen}>
        <section className={styles.confirmationHero} aria-labelledby="checkout-confirmation-title">
          <Badge tone="success">Ordine confermato</Badge>
          <h1 id="checkout-confirmation-title" className={styles.heroTitle}>Ordine confermato</h1>
          <p className={styles.heroCopy}>
            Pagamento mock completato. Abbiamo confermato la preparazione con slot {confirmation.slotLabel}.
          </p>
        </section>

        <ShellCard title="Dettagli conferma">
          <div className={styles.summaryGrid}>
            <p>ID ordine</p>
            <p>{confirmation.orderId}</p>
            <p>Slot</p>
            <p>{confirmation.slotLabel}</p>
            <p>Mancia</p>
            <p>{confirmation.tipPercent}%</p>
            <p>Pagamento</p>
            <p>{confirmation.paymentMethod === "card" ? "Carta (mock)" : "Contanti (mock)"}</p>
            <p className={styles.summaryTotalLabel}>Totale confermato</p>
            <p className={styles.summaryTotalValue}>{formatMoney(confirmation.totalCents)}</p>
          </div>
        </ShellCard>

        <div className={styles.confirmationActions}>
          <a href="/" className={styles.primaryLink}>Torna alla home</a>
          <a href="/menu" className={styles.secondaryLink}>Nuovo ordine</a>
        </div>
      </main>
    );
  }

  if (cartState.items.length === 0)
  {
    return (
      <main className={styles.screen}>
        <section className={styles.hero} aria-labelledby="checkout-title">
          <a href="/cart" className={styles.backLink}>Carrello</a>
          <h1 id="checkout-title" className={styles.heroTitle}>Checkout</h1>
          <p className={styles.heroCopy}>Il carrello è vuoto. Aggiungi prodotti per completare un ordine mock.</p>
        </section>
      </main>
    );
  }

  return (
    <main className={styles.screen}>
      <section className={styles.hero} aria-labelledby="checkout-title">
        <div className={styles.heroTopRow}>
          <a href="/cart" className={styles.backLink}>Carrello</a>
          <Badge tone="neutral">{seed.store.displayName}</Badge>
        </div>

        <h1 id="checkout-title" className={styles.heroTitle}>Checkout</h1>
        <p className={styles.heroCopy}>Conferma slot, mancia e pagamento mock per chiudere l&apos;ordine.</p>
      </section>

      <form className={styles.form} onSubmit={handleCheckoutSubmit}>
        <ShellCard title="Slot consegna">
          <div className={styles.slotList} role="radiogroup" aria-label="Selezione slot checkout">
            {seed.slots.map((slot) =>
            {
              const slotState = deriveSlotAvailability(slot);
              const isSelected = selectedSlotId === slot.slotId;

              return (
                <label
                  key={slot.slotId}
                  className={`${styles.slotOption} ${isSelected ? styles.slotOptionActive : ""} ${!slotState.isSelectable ? styles.slotOptionDisabled : ""}`}
                >
                  <input
                    type="radio"
                    name="checkout-slot"
                    value={slot.slotId}
                    checked={isSelected}
                    onChange={() => setSelectedSlotId(slot.slotId)}
                    disabled={!slotState.isSelectable}
                  />
                  <div>
                    <p className={styles.slotLabel}>{slot.label}</p>
                    <p className={styles.slotMeta}>ETA ~ {slot.etaMinutes} min · {slotState.label}</p>
                  </div>
                </label>
              );
            })}
          </div>

          {validationErrors.selectedSlotId ? (
            <p className={styles.errorMessage} role="alert">{validationErrors.selectedSlotId}</p>
          ) : null}
        </ShellCard>

        <ShellCard title="Mancia rider">
          <div className={styles.tipRow} role="radiogroup" aria-label="Selezione mancia">
            {TIP_PERCENT_OPTIONS.map((tipOption) => (
              <button
                key={tipOption}
                type="button"
                className={`${styles.tipOption} ${tipPercent === tipOption ? styles.tipOptionActive : ""}`}
                onClick={() => setTipPercent(tipOption)}
                aria-pressed={tipPercent === tipOption}
              >
                {tipOption}%
              </button>
            ))}
          </div>
        </ShellCard>

        <ShellCard title="Pagamento mock">
          <div className={styles.paymentStack}>
            <label className={styles.paymentMethod}>
              <input
                type="radio"
                name="payment-method"
                value="card"
                checked={paymentMethod === "card"}
                onChange={() => setPaymentMethod("card")}
              />
              <span>Carta (simulazione)</span>
            </label>

            <label className={styles.paymentMethod}>
              <input
                type="radio"
                name="payment-method"
                value="cash"
                checked={paymentMethod === "cash"}
                onChange={() => setPaymentMethod("cash")}
              />
              <span>Contanti alla consegna (simulazione)</span>
            </label>

            {paymentMethod === "card" ? (
              <div className={styles.cardFields}>
                <label className={styles.fieldLabel} htmlFor="checkout-cardholder-name">
                  Intestatario carta
                </label>
                <input
                  id="checkout-cardholder-name"
                  type="text"
                  className={styles.textInput}
                  value={cardholderName}
                  onChange={(event) => setCardholderName(event.target.value)}
                  placeholder="Mario Rossi"
                />
                {validationErrors.cardholderName ? (
                  <p className={styles.errorMessage} role="alert">{validationErrors.cardholderName}</p>
                ) : null}

                <label className={styles.fieldLabel} htmlFor="checkout-card-last-digits">
                  Ultime 4 cifre
                </label>
                <input
                  id="checkout-card-last-digits"
                  type="text"
                  className={styles.textInput}
                  value={cardLastDigits}
                  onChange={(event) => setCardLastDigits(event.target.value.replace(/\D/g, "").slice(0, 4))}
                  placeholder="1234"
                  inputMode="numeric"
                />
                {validationErrors.cardLastDigits ? (
                  <p className={styles.errorMessage} role="alert">{validationErrors.cardLastDigits}</p>
                ) : null}
              </div>
            ) : null}
          </div>
        </ShellCard>

        <ShellCard title="Totale checkout">
          <div className={styles.summaryGrid}>
            <p>Subtotale</p>
            <p>{formatMoney(totals.subtotalCents)}</p>
            <p>Consegna</p>
            <p>{formatMoney(totals.deliveryFeeCents)}</p>
            <p>Mancia ({tipPercent}%)</p>
            <p>{formatMoney(totals.tipCents)}</p>
            <p className={styles.summaryTotalLabel}>Totale</p>
            <p className={styles.summaryTotalValue}>{formatMoney(totals.totalCents)}</p>
          </div>

          {validationErrors.cart ? (
            <p className={styles.errorMessage} role="alert">{validationErrors.cart}</p>
          ) : null}

          <div className={styles.submitRow}>
            <Button
              type="submit"
              data-testid="checkout-submit-button"
              disabled={isProcessingPayment}
            >
              {isProcessingPayment ? "Pagamento mock in corso..." : "Conferma ordine mock"}
            </Button>
          </div>
        </ShellCard>
      </form>
    </main>
  );
}

function formatMoney(amountCents: number): string
{
  return MONEY_FORMATTER.format(amountCents / 100);
}
