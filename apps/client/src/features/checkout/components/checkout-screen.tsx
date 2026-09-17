"use client";

import type { ClientSeed } from "@pizzaos/mock-data";
import type { OrderContact, OrderFulfillment } from "@pizzaos/domain";
import { Badge, Button } from "@pizzaos/ui";
import { createLocalClientApi, LOCAL_CART_ID } from "../../../composition/api/local-client-api";
import { StripePaymentFields } from "./stripe-payment-fields";
import { useEffect, useMemo, useState, type FormEvent, type ReactElement } from "react";
import {
  clearCartState,
  loadCartState,
  type CartState
} from "../../cart/cart-model";
import { clearGroupOrderState, loadGroupOrderState } from "../../group-order/group-order-model";
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
} from "../../../composition/client-demo-state";
import {
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

interface CheckoutScreenProps
{
  readonly isGroupOrder?: boolean;
}

function resolveStorage(): Storage | undefined
{
  if (typeof window === "undefined")
  {
    return undefined;
  }

  return window.localStorage;
}

export function CheckoutScreen(props: CheckoutScreenProps): ReactElement
{
  const [seed, setSeed] = useState<ClientSeed>(() => loadClientDemoState());
  const [cartState, setCartState] = useState<CartState>(() => loadCartState());
  const [selectedSlotId, setSelectedSlotId] = useState("");
  const [tipPercent, setTipPercent] = useState<number>(TIP_PERCENT_OPTIONS[1]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("card");
  const [createPaymentMethod, setCreatePaymentMethod] = useState<(() => Promise<string>) | null>(null);
  const [fulfillmentMethod, setFulfillmentMethod] = useState<"delivery" | "pickup">("delivery");
  const [contact, setContact] = useState<OrderContact>(() => toOrderContact(seed.customer));
  const [doorbell, setDoorbell] = useState("");
  const [floor, setFloor] = useState("");
  const [deliveryNote, setDeliveryNote] = useState("");
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
    const hydratedCart = props.isGroupOrder ? { items: loadGroupOrderState(storage).items } : loadCartState(storage);

    setSeed(hydratedSeed);
    setCartState(hydratedCart);
    setSelectedSlotId(resolveSlotSelection(hydratedSeed.slots));
    setContact(toOrderContact(hydratedSeed.customer));
  }, [props.isGroupOrder]);

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
        deliveryFeeCents: fulfillmentMethod === "delivery" ? DELIVERY_FEE_CENTS : 0,
        discountCents: appliedCouponDiscountCents
      }),
    [appliedCouponDiscountCents, cartState.items, fulfillmentMethod, tipPercent]
  );
  const projectedEarnedPoints = useMemo(
    () => deriveEarnedLoyaltyPoints(subtotalCents - totals.discountCents),
    [subtotalCents, totals.discountCents]
  );

  async function handleApplyCouponClick(): Promise<void>
  {
    const result = await createLocalClientApi(resolveStorage()).applyCoupon({
      cartId: LOCAL_CART_ID,
      couponCode: couponCodeInput,
      referenceIso: seed.simulationCursorIso
    });

    setCouponFeedback(result.message);

    if (result.status === "applied" && result.coupon)
    {
      setAppliedCouponCode(result.coupon.code);
      setAppliedCouponDiscountCents(result.discount.amountCents);
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

  async function handleCheckoutSubmit(event: FormEvent<HTMLFormElement>): Promise<void>
  {
    event.preventDefault();

    const defaultAddress = seed.customer.deliveryAddresses.find(
      (address) => address.id === seed.customer.defaultDeliveryAddressId
    );
    const fulfillment: OrderFulfillment = fulfillmentMethod === "delivery" && defaultAddress
      ? { method: "delivery", address: defaultAddress, instructions: { doorbell, floor, note: deliveryNote } }
      : { method: "pickup", storeId: seed.session.activeStoreId };
    const errors = validateCheckoutInput({
      items: cartState.items,
      slots: seed.slots,
      selectedSlotId,
      paymentMethod,
      contact,
      fulfillment
    });

    if (Object.keys(errors).length > 0)
    {
      setValidationErrors(errors);
      return;
    }

    if (paymentMethod === "card")
    {
      if (!createPaymentMethod)
      {
        setValidationErrors({ payment: "Il pagamento sicuro non è ancora pronto." });
        return;
      }
      try
      {
        await createPaymentMethod();
      }
      catch (error)
      {
        setValidationErrors({ payment: error instanceof Error ? error.message : "Impossibile verificare la carta." });
        return;
      }
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
        customerId: seed.session.customerId,
        contact,
        fulfillment,
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
      setCartState(props.isGroupOrder ? { items: [] } : clearCartState(storage));
      if (props.isGroupOrder)
      {
        clearGroupOrderState(storage);
      }
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
          <a href={props.isGroupOrder ? "/group-order" : "/menu"} className={styles.secondaryLink}>{props.isGroupOrder ? "Nuovo gruppo" : "Nuovo ordine"}</a>
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
          <p className={styles.sectionTitle}>Contatti per questo ordine</p>
          <div className={styles.cardFields}>
            <div>
              <label className={styles.fieldLabel} htmlFor="checkout-first-name">Nome</label>
              <input id="checkout-first-name" className={styles.textInput} value={contact.firstName} onChange={(event) => setContact({ ...contact, firstName: event.target.value })} />
              {validationErrors.contactFirstName ? <p className={styles.errorMessage} role="alert">{validationErrors.contactFirstName}</p> : null}
            </div>
            <div>
              <label className={styles.fieldLabel} htmlFor="checkout-last-name">Cognome</label>
              <input id="checkout-last-name" className={styles.textInput} value={contact.lastName} onChange={(event) => setContact({ ...contact, lastName: event.target.value })} />
              {validationErrors.contactLastName ? <p className={styles.errorMessage} role="alert">{validationErrors.contactLastName}</p> : null}
            </div>
            <div>
              <label className={styles.fieldLabel} htmlFor="checkout-email">Email</label>
              <input id="checkout-email" type="email" className={styles.textInput} value={contact.email} onChange={(event) => setContact({ ...contact, email: event.target.value })} />
              {validationErrors.contactEmail ? <p className={styles.errorMessage} role="alert">{validationErrors.contactEmail}</p> : null}
            </div>
            <div>
              <label className={styles.fieldLabel} htmlFor="checkout-phone">Telefono</label>
              <input id="checkout-phone" type="tel" className={styles.textInput} value={contact.phone} onChange={(event) => setContact({ ...contact, phone: event.target.value })} />
              {validationErrors.contactPhone ? <p className={styles.errorMessage} role="alert">{validationErrors.contactPhone}</p> : null}
            </div>
          </div>
        </div>

        <div className={styles.section}>
          <p className={styles.sectionTitle}>Come vuoi ricevere l&apos;ordine?</p>
          <div className={styles.paymentStack} role="radiogroup" aria-label="Metodo di ritiro">
            <label className={styles.paymentMethod}><input type="radio" name="fulfillment-method" checked={fulfillmentMethod === "delivery"} onChange={() => setFulfillmentMethod("delivery")} /><span>Consegna a domicilio</span></label>
            <label className={styles.paymentMethod}><input type="radio" name="fulfillment-method" checked={fulfillmentMethod === "pickup"} onChange={() => setFulfillmentMethod("pickup")} /><span>Ritiro in pizzeria</span></label>
          </div>
          {fulfillmentMethod === "delivery" ? (
            <div className={styles.cardFields}>
              <p className={styles.metaCopy}>Consegna a {formatAddress(seed.customer.deliveryAddresses.find((address) => address.id === seed.customer.defaultDeliveryAddressId))}</p>
              <div><label className={styles.fieldLabel} htmlFor="checkout-doorbell">Citofono</label><input id="checkout-doorbell" className={styles.textInput} value={doorbell} onChange={(event) => setDoorbell(event.target.value)} /></div>
              <div><label className={styles.fieldLabel} htmlFor="checkout-floor">Piano</label><input id="checkout-floor" className={styles.textInput} value={floor} onChange={(event) => setFloor(event.target.value)} /></div>
              <div><label className={styles.fieldLabel} htmlFor="checkout-delivery-note">Note per la consegna</label><input id="checkout-delivery-note" className={styles.textInput} value={deliveryNote} onChange={(event) => setDeliveryNote(event.target.value)} /></div>
            </div>
          ) : <p className={styles.metaCopy}>Ritiro presso {seed.store.displayName}; nessun costo di consegna.</p>}
        </div>

        <div className={styles.section}>
          <p className={styles.sectionTitle}>Slot {fulfillmentMethod === "delivery" ? "consegna" : "ritiro"}</p>
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
          <p className={styles.sectionTitle}>Pagamento</p>
          <div className={styles.paymentStack}>
            <label className={styles.paymentMethod}>
              <input
                type="radio"
                name="payment-method"
                value="card"
                checked={paymentMethod === "card"}
                onChange={() => setPaymentMethod("card")}
              />
              <span>Carta</span>
            </label>

            <label className={styles.paymentMethod}>
              <input
                type="radio"
                name="payment-method"
                value="cash"
                checked={paymentMethod === "cash"}
                onChange={() => setPaymentMethod("cash")}
              />
              <span>Contanti alla consegna</span>
            </label>

            {paymentMethod === "card" ? (
              <div className={styles.cardFields}>
                <StripePaymentFields onReady={setCreatePaymentMethod} />
                {validationErrors.payment ? <p className={styles.errorMessage} role="alert">{validationErrors.payment}</p> : null}
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
            {fulfillmentMethod === "delivery" ? <><p>Consegna</p><p>{formatMoney(totals.deliveryFeeCents)}</p></> : null}
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
              {isProcessingPayment ? "Pagamento in corso..." : "Conferma e paga"}
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

function toOrderContact(customer: ClientSeed["customer"]): OrderContact
{
  return { firstName: customer.firstName, lastName: customer.lastName, email: customer.email, phone: customer.phone };
}

function formatAddress(address: ClientSeed["customer"]["deliveryAddresses"][number] | undefined): string
{
  return address ? `${address.label}: ${address.line1}, ${address.postalCode} ${address.city} (${address.province})` : "Indirizzo non disponibile";
}
