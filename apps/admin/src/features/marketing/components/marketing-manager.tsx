"use client";

import React, { useState } from "react";
import type { Coupon, LoyaltySystemConfig, LoyaltyTierConfig } from "@pizzaos/domain";
import { formatMoney, getCouponStatusLabel, DEFAULT_AUTOMATION_RULES, type AutomationRule } from "../marketing-utils";
import styles from "./marketing-manager.module.css";

interface MarketingManagerProps {
  coupons: readonly Coupon[];
  loyaltyConfig?: LoyaltySystemConfig;
  onCreateCoupon?: () => void;
  onEditLoyaltyTier?: (tier: LoyaltyTierConfig) => void;
  onUpdatePointsPerEuro?: (points: number) => void;
  onToggleAutomation?: (ruleId: string, enabled: boolean) => void;
}

export function MarketingManager({
  coupons,
  loyaltyConfig,
  onCreateCoupon,
  onEditLoyaltyTier,
  onUpdatePointsPerEuro,
  onToggleAutomation,
}: MarketingManagerProps) {
  const [automations, setAutomations] = useState<AutomationRule[]>(DEFAULT_AUTOMATION_RULES);

  const handleToggle = (ruleId: string) => {
    const updated = automations.map((a) =>
      a.id === ruleId ? { ...a, isEnabled: !a.isEnabled } : a
    );
    setAutomations(updated);
    onToggleAutomation?.(ruleId, updated.find((a) => a.id === ruleId)?.isEnabled ?? false);
  };

  if (!loyaltyConfig) {
    return (
      <div className={styles.container}>
        <p>Caricamento configurazione fedeltà...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <section className={styles.section}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <h2 className={styles.sectionTitle}>Configurazione Fedeltà</h2>
          <div className={styles.pointsConfig}>
            <span>1€ speso = </span>
            <input
              type="number"
              aria-label="Punti per Euro"
              className={styles.pointsInput}
              value={loyaltyConfig.pointsPerEuro}
              onChange={(e) => onUpdatePointsPerEuro?.(parseInt(e.target.value, 10))}
            />
            <span> punti</span>
          </div>
        </div>
        
        <div className={styles.loyaltyTiersGrid}>
          {loyaltyConfig.tiers.map((tier) => (
            <div key={tier.id} className={styles.tierCard}>
              <div className={styles.tierHeader}>
                <h3 className={styles.tierName}>{tier.name}</h3>
                <span className={styles.tierPoints}>{tier.minPoints} pt</span>
              </div>
              <div className={styles.tierPerks}>
                <span className={styles.perksTitle}>Vantaggi:</span>
                <ul className={styles.perksList}>
                  {tier.perks.map((perk, i) => (
                    <li key={i}>{perk}</li>
                  ))}
                </ul>
              </div>
              <button 
                className={styles.editButton}
                onClick={() => onEditLoyaltyTier?.(tier)}
              >
                Modifica Livello
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 className={styles.sectionTitle}>Coupon e Promozioni</h2>
          <button className={styles.createButton} onClick={onCreateCoupon}>
            + Nuovo Coupon
          </button>
        </div>
        <div className={styles.grid}>
          {coupons.map((coupon) => (
            <div key={coupon.id} className={styles.couponCard}>
              <div className={styles.couponHeader}>
                <span className={styles.couponCode}>{coupon.code}</span>
                <span
                  className={`${styles.statusBadge} ${
                    coupon.status === "active"
                      ? styles.statusActive
                      : coupon.status === "expired"
                      ? styles.statusExpired
                      : styles.statusInactive
                  }`}
                >
                  {getCouponStatusLabel(coupon.status)}
                </span>
              </div>
              <div className={styles.couponDetails}>
                <span className={styles.discount}>{formatMoney(coupon.discountAmount)} di sconto</span>
                <span>Ordine minimo: {formatMoney(coupon.minOrderAmount)}</span>
                <span>Scadenza: {new Date(coupon.validUntilIso).toLocaleDateString("it-IT")}</span>
              </div>
            </div>
          ))}
          {coupons.length === 0 && <p>Nessun coupon attivo.</p>}
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Automazioni Marketing</h2>
        <div className={styles.grid}>
          {automations.map((rule) => (
            <div key={rule.id} className={styles.automationCard}>
              <div className={styles.automationHeader}>
                <span className={styles.automationTitle}>{rule.title}</span>
                <label className={styles.toggleLabel}>
                  <input
                    type="checkbox"
                    checked={rule.isEnabled}
                    onChange={() => handleToggle(rule.id)}
                  />
                  {rule.isEnabled ? "Attiva" : "Spenta"}
                </label>
              </div>
              <p className={styles.automationDesc}>{rule.description}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
