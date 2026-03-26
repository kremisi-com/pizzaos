import type { Coupon, Money } from "@pizzaos/domain";

export function formatMoney(money: Money): string {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: money.currencyCode,
  }).format(money.amountCents / 100);
}

export function getCouponStatusLabel(status: Coupon["status"]): string {
  switch (status) {
    case "active":
      return "Attivo";
    case "inactive":
      return "Inattivo";
    case "expired":
      return "Scaduto";
    default:
      return status;
  }
}

export function validateCouponCode(code: string): string | null {
  if (!code) return "Il codice è obbligatorio";
  if (code.length < 3) return "Il codice deve essere di almeno 3 caratteri";
  if (!/^[A-Z0-9]+$/.test(code)) return "Il codice può contenere solo lettere maiuscole e numeri";
  return null;
}

export interface AutomationRule {
  id: string;
  type: "inactivity" | "post-order" | "birthday";
  title: string;
  description: string;
  isEnabled: boolean;
}

export const DEFAULT_AUTOMATION_RULES: AutomationRule[] = [
  {
    id: "auto-inactivity",
    type: "inactivity",
    title: "Recupero Inattività",
    description: "Invia un coupon dopo 30 giorni di inattività del cliente.",
    isEnabled: true,
  },
  {
    id: "auto-post-order",
    type: "post-order",
    title: "Ringraziamento Post-Ordine",
    description: "Invia uno sconto del 10% subito dopo il primo ordine.",
    isEnabled: false,
  },
  {
    id: "auto-birthday",
    type: "birthday",
    title: "Auguri di Compleanno",
    description: "Regala una pizza omaggio per il compleanno del cliente fedele.",
    isEnabled: true,
  },
];
