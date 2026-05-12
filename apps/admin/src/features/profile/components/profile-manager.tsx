"use client";

import { Button, Card } from "@pizzaos/ui";
import { useEffect, useMemo, useState, type ReactElement } from "react";
import styles from "./profile-manager.module.css";

type SubscriptionPlan = "Core" | "Growth" | "Scale";

interface ProfileManagerProps {
  storeId: string;
  storeName: string;
}

interface BillingState {
  readonly activePlan: SubscriptionPlan;
  readonly renewalDate: string;
  readonly billingStatus: "Attiva" | "In revisione";
  readonly paymentMethod: string;
}

const PLAN_PRICE_BY_MONTH: Readonly<Record<SubscriptionPlan, string>> = {
  Core: "89 EUR/mese",
  Growth: "149 EUR/mese",
  Scale: "249 EUR/mese"
};

function getStorageKey(storeId: string): string {
  return `pizzaos-admin-profile-${storeId}`;
}

function resolveStorage(): Storage | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }

  const { localStorage } = window;
  if (
    typeof localStorage?.getItem !== "function" ||
    typeof localStorage?.setItem !== "function"
  ) {
    return undefined;
  }

  return localStorage;
}

function getDefaultBillingState(): BillingState {
  return {
    activePlan: "Growth",
    renewalDate: "15 Maggio 2026",
    billingStatus: "Attiva",
    paymentMethod: "Carta aziendale •••• 4242"
  };
}

export function ProfileManager({ storeId, storeName }: ProfileManagerProps): ReactElement {
  const [billingState, setBillingState] = useState<BillingState>(getDefaultBillingState);

  useEffect(() => {
    const storage = resolveStorage();
    if (!storage) {
      return;
    }

    const raw = storage.getItem(getStorageKey(storeId));
    if (!raw) {
      setBillingState(getDefaultBillingState());
      return;
    }

    try {
      const parsed = JSON.parse(raw) as Partial<BillingState>;
      if (parsed.activePlan && parsed.renewalDate && parsed.billingStatus && parsed.paymentMethod) {
        setBillingState(parsed as BillingState);
        return;
      }
      setBillingState(getDefaultBillingState());
    } catch {
      setBillingState(getDefaultBillingState());
    }
  }, [storeId]);

  useEffect(() => {
    const storage = resolveStorage();
    if (!storage) {
      return;
    }

    storage.setItem(getStorageKey(storeId), JSON.stringify(billingState));
  }, [billingState, storeId]);

  const nextActions = useMemo(() => {
    if (billingState.activePlan === "Core") {
      return [{ label: "Upgrade a Growth", plan: "Growth" as const }];
    }
    if (billingState.activePlan === "Growth") {
      return [
        { label: "Upgrade a Scale", plan: "Scale" as const },
        { label: "Downgrade a Core", plan: "Core" as const }
      ];
    }
    return [{ label: "Downgrade a Growth", plan: "Growth" as const }];
  }, [billingState.activePlan]);

  function handlePlanChange(plan: SubscriptionPlan): void {
    setBillingState((current) => ({ ...current, activePlan: plan }));
  }

  return (
    <div className={styles.container}>
      <Card title="Profilo Ristoratore" subtitle={storeName}>
        <div className={styles.stack}>
          <div className={styles.label}>Piano attivo</div>
          <p className={styles.value}>{billingState.activePlan}</p>
          <span className={styles.planBadge}>{PLAN_PRICE_BY_MONTH[billingState.activePlan]}</span>
          <div className={styles.actions}>
            {nextActions.map((action) => (
              <Button key={action.label} variant="secondary" onClick={() => handlePlanChange(action.plan)}>
                {action.label}
              </Button>
            ))}
          </div>
          <p className={styles.metaText}>Cambio piano simulato in locale per il demo, senza impatto reale sulla fatturazione.</p>
        </div>
      </Card>

      <div className={styles.grid}>
        <Card title="Rinnovo prossimo">
          <div className={styles.stack}>
            <div className={styles.statusRow}>
              <span className={styles.statusLabel}>Data rinnovo</span>
              <span className={styles.statusValue}>{billingState.renewalDate}</span>
            </div>
            <div className={styles.statusRow}>
              <span className={styles.statusLabel}>Stato</span>
              <span className={styles.statusValue}>{billingState.billingStatus}</span>
            </div>
          </div>
        </Card>

        <Card title="Fatturazione">
          <div className={styles.stack}>
            <div className={styles.statusRow}>
              <span className={styles.statusLabel}>Metodo pagamento</span>
              <span className={styles.statusValue}>{billingState.paymentMethod}</span>
            </div>
            <div className={styles.statusRow}>
              <span className={styles.statusLabel}>Contatto amministrativo</span>
              <span className={styles.statusValue}>amministrazione@pizzaos-demo.it</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
