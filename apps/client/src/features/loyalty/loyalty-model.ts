import type { Coupon, LoyaltyState } from "@pizzaos/domain";

const MONEY_FORMATTER = new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR"
});

const TIER_DEFINITIONS = [
  {
    id: "tier-bronze",
    label: "Bronzo",
    minPoints: 0
  },
  {
    id: "tier-silver",
    label: "Argento",
    minPoints: 500
  },
  {
    id: "tier-gold",
    label: "Oro",
    minPoints: 1000
  }
] as const;

const REWARD_CATALOG = [
  {
    id: "reward-bevanda",
    title: "Bibita premium omaggio",
    description: "Aggiungi una bibita premium gratuita al prossimo ordine.",
    couponCode: "BIBITAFREE",
    requiredPoints: 300,
    discountCents: 300,
    minimumOrderCents: 1200
  },
  {
    id: "reward-dolce",
    title: "Dolce artigianale",
    description: "Sconto dedicato su dessert artigianale a fine ordine.",
    couponCode: "DOLCE4",
    requiredPoints: 550,
    discountCents: 400,
    minimumOrderCents: 1600
  },
  {
    id: "reward-premium",
    title: "Premio pizza premium",
    description: "Sconto esteso per una pizza premium nel prossimo checkout.",
    couponCode: "PREMIO8",
    requiredPoints: 700,
    discountCents: 800,
    minimumOrderCents: 2600
  }
] as const;

const GENERATED_COUPON_VALID_FROM_ISO = "2026-03-01T00:00:00.000Z";
const GENERATED_COUPON_VALID_UNTIL_ISO = "2026-12-31T23:59:59.000Z";

type CouponValidationStatus =
  | "applied"
  | "empty_code"
  | "not_found"
  | "inactive"
  | "minimum_not_met";

export interface LoyaltyPresentation
{
  readonly tierLabel: string;
  readonly pointsBalance: number;
  readonly pointsBalanceLabel: string;
  readonly nextTierLabel: string | null;
  readonly pointsToNextTier: number;
}

export interface RewardView
{
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly couponCode: string;
  readonly requiredPoints: number;
  readonly discountCents: number;
  readonly minimumOrderCents: number;
  readonly isRedeemable: boolean;
  readonly pointsMissing: number;
}

export interface CouponApplicationInput
{
  readonly rawCode: string;
  readonly coupons: readonly Coupon[];
  readonly subtotalCents: number;
  readonly referenceIso?: string;
}

export interface CouponApplicationResult
{
  readonly status: CouponValidationStatus;
  readonly message: string;
  readonly discountCents: number;
  readonly coupon: Coupon | null;
  readonly normalizedCode: string;
}

export interface SubscriptionPlanView
{
  readonly id: string;
  readonly name: string;
  readonly monthlyPriceCents: number;
  readonly includedPizzas: number;
  readonly extraPerks: readonly string[];
  readonly commitmentLabel: string;
}

export function deriveLoyaltyPresentation(loyalty: LoyaltyState): LoyaltyPresentation
{
  const resolvedCurrentTierId = resolveLoyaltyTierId(loyalty.pointsBalance);
  const currentTier = TIER_DEFINITIONS.find((candidateTier) => candidateTier.id === loyalty.currentTierId)
    ?? TIER_DEFINITIONS.find((candidateTier) => candidateTier.id === resolvedCurrentTierId)
    ?? TIER_DEFINITIONS[0];
  const nextTier = TIER_DEFINITIONS.find((candidateTier) => candidateTier.minPoints > loyalty.pointsBalance) ?? null;

  return {
    tierLabel: currentTier.label,
    pointsBalance: loyalty.pointsBalance,
    pointsBalanceLabel: `${loyalty.pointsBalance} pt`,
    nextTierLabel: nextTier?.label ?? null,
    pointsToNextTier: nextTier ? Math.max(0, nextTier.minPoints - loyalty.pointsBalance) : 0
  };
}

export function deriveRedeemableRewards(pointsBalance: number): readonly RewardView[]
{
  return REWARD_CATALOG.map((reward) =>
  {
    const pointsMissing = Math.max(0, reward.requiredPoints - pointsBalance);

    return {
      ...reward,
      isRedeemable: pointsMissing === 0,
      pointsMissing
    };
  });
}

export function deriveGeneratedCouponsFromLoyalty(loyalty: LoyaltyState): readonly Coupon[]
{
  const premiumReward = REWARD_CATALOG.find((reward) => reward.id === "reward-premium");

  if (!premiumReward || loyalty.pointsBalance < premiumReward.requiredPoints)
  {
    return [];
  }

  return [
    {
      id: `coupon-generated-${loyalty.customerId}`,
      code: premiumReward.couponCode,
      status: "active",
      discountAmount: {
        amountCents: premiumReward.discountCents,
        currencyCode: "EUR"
      },
      minOrderAmount: {
        amountCents: premiumReward.minimumOrderCents,
        currencyCode: "EUR"
      },
      validFromIso: GENERATED_COUPON_VALID_FROM_ISO,
      validUntilIso: GENERATED_COUPON_VALID_UNTIL_ISO,
      maxRedemptions: 1
    }
  ];
}

export function deriveCheckoutCoupons(
  coupons: readonly Coupon[],
  loyalty: LoyaltyState
): readonly Coupon[]
{
  const combinedCoupons = [
    ...coupons,
    ...deriveGeneratedCouponsFromLoyalty(loyalty)
  ];
  const couponsByNormalizedCode = new Map<string, Coupon>();

  for (const coupon of combinedCoupons)
  {
    const normalizedCode = normalizeCouponCode(coupon.code);

    if (!couponsByNormalizedCode.has(normalizedCode))
    {
      couponsByNormalizedCode.set(normalizedCode, coupon);
    }
  }

  return Array.from(couponsByNormalizedCode.values());
}

export function applyCouponCode(input: CouponApplicationInput): CouponApplicationResult
{
  const normalizedCode = normalizeCouponCode(input.rawCode);

  if (normalizedCode.length === 0)
  {
    return {
      status: "empty_code",
      message: "Inserisci un codice coupon.",
      discountCents: 0,
      coupon: null,
      normalizedCode
    };
  }

  const coupon = input.coupons.find((candidateCoupon) => normalizeCouponCode(candidateCoupon.code) === normalizedCode);

  if (!coupon)
  {
    return {
      status: "not_found",
      message: "Codice coupon non valido.",
      discountCents: 0,
      coupon: null,
      normalizedCode
    };
  }

  if (!isCouponActiveAt(coupon, input.referenceIso))
  {
    return {
      status: "inactive",
      message: "Coupon non attivo o scaduto.",
      discountCents: 0,
      coupon,
      normalizedCode
    };
  }

  if (input.subtotalCents < coupon.minOrderAmount.amountCents)
  {
    const missingAmountCents = coupon.minOrderAmount.amountCents - input.subtotalCents;

    return {
      status: "minimum_not_met",
      message: `Aggiungi ${formatMoney(missingAmountCents)} per usare ${coupon.code}.`,
      discountCents: 0,
      coupon,
      normalizedCode
    };
  }

  return {
    status: "applied",
    message: `Coupon ${coupon.code} applicato.`,
    discountCents: Math.min(input.subtotalCents, coupon.discountAmount.amountCents),
    coupon,
    normalizedCode
  };
}

export function deriveEarnedLoyaltyPoints(netSubtotalCents: number): number
{
  if (netSubtotalCents <= 0)
  {
    return 0;
  }

  return Math.floor(netSubtotalCents / 100);
}

export function resolveLoyaltyTierId(pointsBalance: number): string
{
  const sortedTierDefinitions = [...TIER_DEFINITIONS].sort((leftTier, rightTier) => leftTier.minPoints - rightTier.minPoints);
  let resolvedTierId = sortedTierDefinitions[0].id;

  for (const tierDefinition of sortedTierDefinitions)
  {
    if (pointsBalance >= tierDefinition.minPoints)
    {
      resolvedTierId = tierDefinition.id;
    }
  }

  return resolvedTierId;
}

export function deriveSubscriptionPlan(): SubscriptionPlanView
{
  return {
    id: "subscription-pizza-pass",
    name: "Pizza Pass Mensile",
    monthlyPriceCents: 1890,
    includedPizzas: 4,
    extraPerks: [
      "Consegna gratuita oltre 12 euro",
      "Accesso anticipato ai nuovi gusti",
      "1 bonus dessert ogni mese"
    ],
    commitmentLabel: "Disattivabile in qualsiasi momento (demo)"
  };
}

function normalizeCouponCode(code: string): string
{
  return code.trim().toUpperCase();
}

function isCouponActiveAt(coupon: Coupon, referenceIso?: string): boolean
{
  if (coupon.status !== "active")
  {
    return false;
  }

  const referenceTimestamp = referenceIso ? Date.parse(referenceIso) : Date.now();
  const validFromTimestamp = Date.parse(coupon.validFromIso);
  const validUntilTimestamp = Date.parse(coupon.validUntilIso);

  if (Number.isNaN(referenceTimestamp) || Number.isNaN(validFromTimestamp) || Number.isNaN(validUntilTimestamp))
  {
    return false;
  }

  return referenceTimestamp >= validFromTimestamp && referenceTimestamp <= validUntilTimestamp;
}

function formatMoney(amountCents: number): string
{
  return MONEY_FORMATTER.format(amountCents / 100);
}
