export interface PromotionSelection { couponCodes: string[]; redeemReward: boolean; }
export interface PromotionProgram { enabled: boolean; pointsPerEuro: number; rewardPoints: number; rewardCents: number; revision: number; }
export interface PromotionCoupon {
  id: string; code: string; active: boolean; kind: "percent" | "fixed"; value: number;
  startsAt: string | null; endsAt: string | null; minimumCents: number; productIds: string[];
  globalLimit: number | null; perCustomerLimit: number | null; revision: number;
}
export interface PromotionConfiguration { program: PromotionProgram; coupons: PromotionCoupon[]; usage: { couponId: string; reserved: number; consumed: number }[]; }
export interface LoyaltyMovement { id: string; orderId: string; kind: "earn" | "reward"; points: number; status: "posted" | "reserved" | "spent" | "released"; createdAt: string; }
export interface LoyaltyWallet { storeId: string; program: PromotionProgram; balancePoints: number; heldPoints: number; availablePoints: number; movements: LoyaltyMovement[]; }
export interface PromotionBreakdown {
  originalSubtotalCents: number; discountCents: number; netSubtotalCents: number;
  coupons: { id: string; code: string; discountCents: number }[];
  rewardDiscountCents: number; redeemedPoints: number; pointsPerEuro: number;
  lines: { productId: string; grossCents: number; discountCents: number; netCents: number }[];
}
export type PromotionProgramInput = Omit<PromotionProgram, "revision"> & { revision: number };
export type PromotionCouponInput = Omit<PromotionCoupon, "id" | "revision"> & { id?: string; revision?: number };
export interface PromotionsApi {
  configuration(storeId: string): Promise<PromotionConfiguration>;
  saveProgram(storeId: string, input: PromotionProgramInput): Promise<PromotionProgram>;
  saveCoupon(storeId: string, input: PromotionCouponInput): Promise<PromotionCoupon>;
  wallet(storeId: string): Promise<LoyaltyWallet>;
}
