import { describe, it, expect } from "vitest";
import { formatMoney, getCouponStatusLabel, validateCouponCode } from "@/features/marketing/marketing-utils";

describe("Marketing Utils", () => {
  describe("formatMoney", () => {
    it("formats cents correctly for Italian locale", () => {
      expect(formatMoney({ amountCents: 1000, currencyCode: "EUR" })).toContain("10,00");
      expect(formatMoney({ amountCents: 550, currencyCode: "EUR" })).toContain("5,50");
    });
  });

  describe("getCouponStatusLabel", () => {
    it("returns correct labels in Italian", () => {
      expect(getCouponStatusLabel("active")).toBe("Attivo");
      expect(getCouponStatusLabel("inactive")).toBe("Inattivo");
      expect(getCouponStatusLabel("expired")).toBe("Scaduto");
    });
  });

  describe("validateCouponCode", () => {
    it("validates required code", () => {
      expect(validateCouponCode("")).toBe("Il codice è obbligatorio");
    });

    it("validates minimum length", () => {
      expect(validateCouponCode("A")).toBe("Il codice deve essere di almeno 3 caratteri");
    });

    it("validates alphanumeric and uppercase", () => {
      expect(validateCouponCode("abc")).toBe("Il codice può contenere solo lettere maiuscole e numeri");
      expect(validateCouponCode("CODE-1")).toBe("Il codice può contenere solo lettere maiuscole e numeri");
      expect(validateCouponCode("CODE123")).toBeNull();
    });
  });
});
