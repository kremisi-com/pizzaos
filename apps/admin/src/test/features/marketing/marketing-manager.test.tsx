import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { MarketingManager } from "../../../features/marketing/components/marketing-manager";
import type { LoyaltySystemConfig } from "@pizzaos/domain";

const mockLoyaltyConfig: LoyaltySystemConfig = {
  pointsPerEuro: 10,
  tiers: [
    { id: "tier-1", name: "Tier 1", minPoints: 0, perks: ["Perk 1"] }
  ]
};

describe("MarketingManager", () => {
  it("renders loading state when loyaltyConfig is missing", () => {
    render(<MarketingManager coupons={[]} />);
    expect(screen.getByText(/Caricamento configurazione fedeltà/i)).toBeDefined();
  });

  it("renders content when loyaltyConfig is provided", () => {
    render(<MarketingManager coupons={[]} loyaltyConfig={mockLoyaltyConfig} />);
    expect(screen.getByText("Configurazione Fedeltà")).toBeDefined();
    expect(screen.getByText("Tier 1")).toBeDefined();
  });
});
