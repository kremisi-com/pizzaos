"use client";

import type { Coupon } from "@pizzaos/domain";
import type { ClientSeed } from "@pizzaos/mock-data";
import { Badge, Button, ShellCard } from "@pizzaos/ui";
import { useEffect, useMemo, useState, type ReactElement } from "react";
import { loadClientDemoState } from "../../home/client-demo-state";
import {
  deriveCheckoutCoupons,
  deriveGeneratedCouponsFromLoyalty,
  deriveLoyaltyPresentation,
  deriveRedeemableRewards,
  deriveSubscriptionPlan
} from "../loyalty-model";
import styles from "./rewards-screen.module.css";

const MONEY_FORMATTER = new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR"
});

function resolveStorage(): Storage | undefined
{
  if (typeof window === "undefined")
  {
    return undefined;
  }

  return window.localStorage;
}

export function RewardsScreen(): ReactElement
{
  const [seed, setSeed] = useState<ClientSeed>(() => loadClientDemoState());

  useEffect(() =>
  {
    setSeed(loadClientDemoState(resolveStorage()));
  }, []);

  const loyaltyPresentation = useMemo(
    () => deriveLoyaltyPresentation(seed.loyalty),
    [seed.loyalty]
  );
  const rewards = useMemo(
    () => deriveRedeemableRewards(seed.loyalty.pointsBalance),
    [seed.loyalty.pointsBalance]
  );
  const generatedCoupons = useMemo(
    () => deriveGeneratedCouponsFromLoyalty(seed.loyalty),
    [seed.loyalty]
  );
  const generatedCouponCodes = useMemo(
    () => new Set(generatedCoupons.map((coupon) => coupon.code)),
    [generatedCoupons]
  );
  const checkoutCoupons = useMemo(
    () => deriveCheckoutCoupons(seed.coupons, seed.loyalty),
    [seed.coupons, seed.loyalty]
  );
  const subscriptionPlan = deriveSubscriptionPlan();

  return (
    <main className={styles.screen}>
      <section className={styles.hero} aria-labelledby="rewards-title">
        <div className={styles.heroTopRow}>
          <a href="/" className={styles.backLink}>Home</a>
          <Badge tone="warning">{loyaltyPresentation.pointsBalanceLabel}</Badge>
        </div>

        <h1 id="rewards-title" className={styles.heroTitle}>Programma fedelta e vantaggi</h1>
        <p className={styles.heroCopy}>
          Punti, reward, coupon e abbonamento restano dentro il flusso ordine per velocizzare il prossimo checkout.
        </p>
      </section>

      <ShellCard title="Saldo fedelta">
        <div className={styles.kpiGrid}>
          <div className={styles.kpiCard}>
            <p className={styles.kpiLabel}>Tier attuale</p>
            <p className={styles.kpiValue}>{loyaltyPresentation.tierLabel}</p>
          </div>
          <div className={styles.kpiCard}>
            <p className={styles.kpiLabel}>Punti disponibili</p>
            <p className={styles.kpiValue}>{loyaltyPresentation.pointsBalanceLabel}</p>
          </div>
        </div>

        {loyaltyPresentation.nextTierLabel ? (
          <p className={styles.metaCopy}>
            Ti mancano {loyaltyPresentation.pointsToNextTier} punti per il tier {loyaltyPresentation.nextTierLabel}.
          </p>
        ) : (
          <p className={styles.metaCopy}>Hai gia raggiunto il tier piu alto disponibile nella demo.</p>
        )}
      </ShellCard>

      <ShellCard title="Reward riscattabili">
        <ul className={styles.rewardList}>
          {rewards.map((reward) => (
            <li key={reward.id} className={styles.rewardItem}>
              <div className={styles.rewardTopRow}>
                <p className={styles.rewardTitle}>{reward.title}</p>
                <Badge tone={reward.isRedeemable ? "success" : "neutral"}>
                  {reward.isRedeemable ? "Sbloccata" : `${reward.pointsMissing} pt mancanti`}
                </Badge>
              </div>
              <p className={styles.metaCopy}>{reward.description}</p>
              <p className={styles.metaCopy}>
                Codice {reward.couponCode} · Sconto {formatMoney(reward.discountCents)} su ordini da{" "}
                {formatMoney(reward.minimumOrderCents)}.
              </p>
            </li>
          ))}
        </ul>
      </ShellCard>

      <ShellCard title="Coupon per checkout">
        {checkoutCoupons.length > 0 ? (
          <ul className={styles.couponList}>
            {checkoutCoupons.map((coupon) => (
              <li key={coupon.id} className={styles.couponItem}>
                <div className={styles.rewardTopRow}>
                  <p className={styles.couponCode}>{coupon.code}</p>
                  <Badge tone={resolveCouponTone(coupon, generatedCouponCodes)}>
                    {resolveCouponLabel(coupon, generatedCouponCodes)}
                  </Badge>
                </div>
                <p className={styles.metaCopy}>
                  {formatMoney(coupon.discountAmount.amountCents)} di sconto da {formatMoney(coupon.minOrderAmount.amountCents)}.
                </p>
                <p className={styles.metaCopy}>
                  Valido fino al {new Date(coupon.validUntilIso).toLocaleDateString("it-IT")}.
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.metaCopy}>Nessun coupon disponibile in questo momento.</p>
        )}

        {generatedCoupons.length > 0 ? (
          <p className={styles.metaCopy} data-testid="rewards-generated-coupon">
            Hai ottenuto un coupon generato dai punti: {generatedCoupons[0].code}.
          </p>
        ) : null}

        <a href="/checkout" className={styles.checkoutLink}>
          Vai al checkout e applica un coupon
        </a>
      </ShellCard>

      <ShellCard title={subscriptionPlan.name}>
        <section className={styles.subscriptionCard} data-testid="rewards-subscription-card">
          <p className={styles.subscriptionPrice}>{formatMoney(subscriptionPlan.monthlyPriceCents)} / mese</p>
          <p className={styles.metaCopy}>
            Include {subscriptionPlan.includedPizzas} pizze al mese e benefit extra per clienti abituali.
          </p>
          <ul className={styles.subscriptionList}>
            {subscriptionPlan.extraPerks.map((perk) => (
              <li key={perk}>{perk}</li>
            ))}
          </ul>
          <p className={styles.metaCopy}>{subscriptionPlan.commitmentLabel}</p>
          <Button variant="secondary" disabled>
            Attivazione simulata disponibile in demo guidata
          </Button>
        </section>
      </ShellCard>
    </main>
  );
}

function resolveCouponTone(coupon: Coupon, generatedCouponCodes: ReadonlySet<string>): "neutral" | "warning" | "success" | "critical"
{
  if (generatedCouponCodes.has(coupon.code))
  {
    return "success";
  }

  if (coupon.status === "active")
  {
    return "warning";
  }

  if (coupon.status === "inactive")
  {
    return "neutral";
  }

  return "critical";
}

function resolveCouponLabel(coupon: Coupon, generatedCouponCodes: ReadonlySet<string>): string
{
  if (generatedCouponCodes.has(coupon.code))
  {
    return "Generato dai punti";
  }

  if (coupon.status === "active")
  {
    return "Attivo";
  }

  if (coupon.status === "inactive")
  {
    return "Non attivo";
  }

  return "Scaduto";
}

function formatMoney(amountCents: number): string
{
  return MONEY_FORMATTER.format(amountCents / 100);
}
