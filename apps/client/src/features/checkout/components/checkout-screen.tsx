"use client";

import type { ClientSeed } from "@pizzaos/mock-data";
import { Badge, Button } from "@pizzaos/ui";
import { useEffect, useMemo, useState, type FormEvent, type ReactElement } from "react";
import {
  clearCartState,
  loadCartState,
  type CartState
} from "../../cart/cart-model";
import {
  createMockOrder,
  DELIVERY_FEE_CENTS,
  deriveCartSubtotalCents,
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
import {
  applyCouponCode,
  deriveCheckoutCoupons,
  deriveEarnedLoyaltyPoints,
  resolveLoyaltyTierId
} from "../../loyalty/loyalty-model";
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
  readonly couponCode: string | null;
  readonly discountCents: number;
  readonly earnedPoints: number;
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
  const [couponCodeInput, setCouponCodeInput] = useState("");
  const [appliedCouponCode, setAppliedCouponCode] = useState<string | null>(null);
  const [appliedCouponDiscountCents, setAppliedCouponDiscountCents] = useState(0);
  const [couponFeedback, setCouponFeedback] = useState<string | null>(null);
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

  const availableCoupons = useMemo(
    () => deriveCheckoutCoupons(seed.coupons, seed.loyalty),
    [seed.coupons, seed.loyalty]
  );
  const subtotalCents = useMemo(
    () => deriveCartSubtotalCents(cartState.items),
    [cartState.items]
  );
  const totals = useMemo(
    () =>
      deriveCheckoutTotals(cartState.items, {
        tipPercent,
        deliveryFeeCents: DELIVERY_FEE_CENTS,
        discountCents: appliedCouponDiscountCents
      }),
    [appliedCouponDiscountCents, cartState.items, tipPercent]
  );
  const projectedEarnedPoints = useMemo(
    () => deriveEarnedLoyaltyPoints(subtotalCents - totals.discountCents),
    [subtotalCents, totals.discountCents]
  );

  function handleApplyCouponClick(): void
  {
    const result = applyCouponCode({
      rawCode: couponCodeInput,
      coupons: availableCoupons,
      subtotalCents,
      referenceIso: new Date(Date.now()).toISOString()
    });

    setCouponFeedback(result.message);

    if (result.status === "applied" && result.coupon)
    {
      setAppliedCouponCode(result.coupon.code);
      setAppliedCouponDiscountCents(result.discountCents);
      setCouponCodeInput(result.coupon.code);
      return;
    }

    setAppliedCouponCode(null);
    setAppliedCouponDiscountCents(0);
  }

  function handleClearCouponClick(): void
  {
    setAppliedCouponCode(null);
    setAppliedCouponDiscountCents(0);
    setCouponCodeInput("");
    setCouponFeedback(null);
  }

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
      const earnedPoints = deriveEarnedLoyaltyPoints(totals.subtotalCents - totals.discountCents);
      const nextPointsBalance = seed.loyalty.pointsBalance + earnedPoints;
      const nextOrder = createMockOrder({
        storeId: seed.store.id,
        customerId: seed.loyalty.customerId,
        items: cartState.items,
        selectedSlotId: selectedSlot.slotId,
        totals,
        createdAtIso
      });
      const nextSeed: ClientSeed = {
        ...seed,
        loyalty: {
          ...seed.loyalty,
          pointsBalance: nextPointsBalance,
          currentTierId: resolveLoyaltyTierId(nextPointsBalance)
        },
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
        couponCode: appliedCouponCode,
        discountCents: totals.discountCents,
        earnedPoints,
        totalCents: totals.totalCents
      });
      setAppliedCouponCode(null);
      setAppliedCouponDiscountCents(0);
      setCouponCodeInput("");
      setCouponFeedback(null);
      setIsProcessingPayment(false);
    }, PAYMENT_SIMULATION_DELAY_MS);
  }

  if (confirmation)
  {
    return (
      <main className={styles.screen}>
        <section className={styles.confirmationHero} aria-labelledby="checkout-confirmation-title">
          <div className={styles.confirmationIconWrap} aria-hidden="true">
            <svg
              className={styles.confirmationIcon}
              viewBox="0 0 52 52"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle cx="26" cy="26" r="25" stroke="currentColor" strokeWidth="2" />
              <path
                d="M15 26.5L22 33.5L37 18.5"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <span className={styles.confirmationPill}>Ordine confermato</span>
          <h1 id="checkout-confirmation-title" className={styles.heroTitle}>Il tuo ordine è confermato</h1>
          <p className={styles.heroCopy}>
            Preparazione confermata per lo slot <strong>{confirmation.slotLabel}</strong>.
            Riceverai aggiornamenti in tempo reale.
          </p>
        </section>

        <div className={styles.section}>
          <p className={styles.sectionTitle}>Dettagli conferma</p>
          <dl className={styles.confirmationList}>
            <div className={styles.confirmationRow}>
              <dt>Slot</dt>
              <dd>{confirmation.slotLabel}</dd>
            </div>
            <div className={styles.confirmationRow}>
              <dt>Mancia</dt>
              <dd>{confirmation.tipPercent}%</dd>
            </div>
            <div className={styles.confirmationRow}>
              <dt>Pagamento</dt>
              <dd>{confirmation.paymentMethod === "card" ? "Carta (mock)" : "Contanti (mock)"}</dd>
            </div>
            {confirmation.couponCode ? (
              <>
                <div className={styles.confirmationRow}>
                  <dt>Coupon</dt>
                  <dd>{confirmation.couponCode}</dd>
                </div>
                <div className={styles.confirmationRow}>
                  <dt>Sconto</dt>
                  <dd>-{formatMoney(confirmation.discountCents)}</dd>
                </div>
              </>
            ) : null}
            <div className={styles.confirmationRow}>
              <dt>Punti ottenuti</dt>
              <dd className={styles.confirmationPointsBadge}>+{confirmation.earnedPoints} pt ✦</dd>
            </div>
            <div className={`${styles.confirmationRow} ${styles.confirmationTotalRow}`}>
              <dt>Totale confermato</dt>
              <dd>{formatMoney(confirmation.totalCents)}</dd>
            </div>
          </dl>
        </div>

        <div className={styles.confirmationActions}>
          <a href="/orders" className={styles.primaryLink} data-testid="checkout-orders-link">
            Segui ordine
          </a>
          <a href="/" className={styles.outlineLink}>Torna alla home</a>
          <div className={styles.tertiaryLinks}>
            <a href="/rewards" className={styles.secondaryLink}>Apri loyalty</a>
            <span className={styles.dot} aria-hidden="true">·</span>
            <a href="/menu" className={styles.secondaryLink}>Nuovo ordine</a>
          </div>
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
        </div>

        <h1 id="checkout-title" className={styles.heroTitle}>Checkout</h1>
        <p className={styles.heroCopy}>Conferma slot, mancia e pagamento mock per chiudere l&apos;ordine.</p>
      </section>

      <form className={styles.form} onSubmit={handleCheckoutSubmit}>
        <div className={styles.section}>
          <p className={styles.sectionTitle}>Slot consegna</p>
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
        </div>

        <div className={styles.section}>
          <p className={styles.sectionTitle}>Mancia rider</p>
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
        </div>

        <div className={styles.section}>
          <p className={styles.sectionTitle}>Coupon e loyalty</p>
          <div className={styles.couponStack}>
            <div>
              <label className={styles.fieldLabel} htmlFor="checkout-coupon-code">
                Inserisci coupon
              </label>
              <div className={styles.couponInputRow}>
                <input
                  id="checkout-coupon-code"
                  type="text"
                  className={styles.textInput}
                  value={couponCodeInput}
                  onChange={(event) => setCouponCodeInput(event.target.value.toUpperCase())}
                  placeholder="BENTORNATO5"
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleApplyCouponClick}
                  data-testid="checkout-apply-coupon-button"
                >
                  Applica
                </Button>
              </div>
            </div>

            {couponFeedback ? (
              <p className={styles.couponFeedback} data-testid="checkout-coupon-feedback">{couponFeedback}</p>
            ) : null}

            {appliedCouponCode ? (
              <div className={styles.appliedCouponRow}>
                <Badge tone="success">{appliedCouponCode}</Badge>
                <p className={styles.metaCopy}>Sconto attivo: -{formatMoney(appliedCouponDiscountCents)}</p>
                <Button type="button" variant="ghost" onClick={handleClearCouponClick}>
                  Rimuovi
                </Button>
              </div>
            ) : null}

            <p className={styles.metaCopy}>
              Coupon disponibili: {availableCoupons.map((coupon) => coupon.code).join(" · ")}
            </p>
            <a href="/rewards" className={styles.secondaryLink}>
              Vedi tutti i vantaggi loyalty
            </a>
          </div>
        </div>

        <div className={styles.section}>
          <p className={styles.sectionTitle}>Pagamento mock</p>
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
                <div>
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
                </div>

                <div>
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
              </div>
            ) : null}
          </div>
        </div>

        <div className={styles.section}>
          <p className={styles.sectionTitle}>Totale checkout</p>
          <div className={styles.summaryGrid}>
            <p>Subtotale</p>
            <p>{formatMoney(totals.subtotalCents)}</p>
            {totals.discountCents > 0 ? (
              <>
                <p>Sconto coupon</p>
                <p>-{formatMoney(totals.discountCents)}</p>
              </>
            ) : null}
            <p>Consegna</p>
            <p>{formatMoney(totals.deliveryFeeCents)}</p>
            <p>Mancia ({tipPercent}%)</p>
            <p>{formatMoney(totals.tipCents)}</p>
            <p>Punti stimati</p>
            <p>{projectedEarnedPoints} pt</p>
            <p className={styles.summaryTotalLabel}>Totale</p>
            <p className={styles.summaryTotalValue} data-testid="checkout-total-value">
              {formatMoney(totals.totalCents)}
            </p>
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
        </div>
      </form>
    </main>
  );
}

function formatMoney(amountCents: number): string
{
  return MONEY_FORMATTER.format(amountCents / 100);
}
