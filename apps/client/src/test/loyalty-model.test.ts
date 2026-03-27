import { createClientSeed } from "@pizzaos/mock-data";
import { describe, expect, it } from "vitest";
import {
  applyCouponCode,
  deriveCheckoutCoupons,
  deriveGeneratedCouponsFromLoyalty,
  deriveLoyaltyPresentation,
  deriveRedeemableRewards
} from "../features/loyalty/loyalty-model";

describe("loyalty model", () =>
{
  it("derives loyalty presentation and points to next tier", () =>
  {
    const seed = createClientSeed();
    const presentation = deriveLoyaltyPresentation(seed.loyalty);

    expect(presentation.tierLabel).toBe("Argento");
    expect(presentation.pointsBalanceLabel).toBe("740 pt");
    expect(presentation.nextTierLabel).toBe("Oro");
    expect(presentation.pointsToNextTier).toBe(260);
  });

  it("returns reward catalog with locked and redeemable states", () =>
  {
    const rewards = deriveRedeemableRewards(520);

    expect(rewards.find((reward) => reward.couponCode === "BIBITAFREE")?.isRedeemable).toBe(true);
    expect(rewards.find((reward) => reward.couponCode === "PREMIO8")?.isRedeemable).toBe(false);
  });

  it("applies coupon when code is valid and subtotal passes threshold", () =>
  {
    const seed = createClientSeed();
    const generatedCoupons = deriveGeneratedCouponsFromLoyalty(seed.loyalty);
    const coupons = deriveCheckoutCoupons(seed.coupons, seed.loyalty);

    expect(generatedCoupons[0]?.code).toBe("PREMIO8");

    const result = applyCouponCode({
      rawCode: "  premio8  ",
      coupons,
      subtotalCents: 2900,
      referenceIso: "2026-03-27T10:30:00.000Z"
    });

    expect(result.status).toBe("applied");
    expect(result.discountCents).toBe(800);
    expect(result.coupon?.code).toBe("PREMIO8");
  });

  it("rejects coupon with minimum order not met", () =>
  {
    const seed = createClientSeed();
    const result = applyCouponCode({
      rawCode: "BENTORNATO5",
      coupons: seed.coupons,
      subtotalCents: 900,
      referenceIso: "2026-03-27T10:30:00.000Z"
    });

    expect(result.status).toBe("minimum_not_met");
    expect(result.message).toContain("Aggiungi");
    expect(result.discountCents).toBe(0);
  });
});
