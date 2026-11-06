import type { IndividualActor } from "@pizzaos/domain";
export interface PromotionSelection { couponCodes: string[]; redeemReward: boolean; }
export interface PromotionProgram { enabled: boolean; pointsPerEuro: number; rewardPoints: number; rewardCents: number; revision: number; }
export interface PromotionCoupon { id: string; code: string; active: boolean; kind: "percent" | "fixed"; value: number; startsAt: string | null; endsAt: string | null; minimumCents: number; productIds: string[]; globalLimit: number | null; perCustomerLimit: number | null; revision: number; }
export interface PromotionConfiguration { program: PromotionProgram; coupons: PromotionCoupon[]; usage: { couponId: string; reserved: number; consumed: number }[]; }
export interface LoyaltyMovement { id: string; orderId: string; kind: "earn" | "reward"; points: number; status: "posted" | "reserved" | "spent" | "released"; createdAt: string; }
export interface LoyaltyWallet { storeId: string; program: PromotionProgram; balancePoints: number; heldPoints: number; availablePoints: number; movements: LoyaltyMovement[]; }
export interface PromotionsServiceStub {
  configuration(actor: IndividualActor | null, storeId: string): Promise<PromotionConfiguration>;
  saveProgram(actor: IndividualActor | null, storeId: string, input: PromotionProgram): Promise<PromotionProgram>;
  saveCoupon(actor: IndividualActor | null, storeId: string, input: Omit<PromotionCoupon, "id" | "revision"> & { id?: string; revision?: number }): Promise<PromotionCoupon>;
  /** Only the authenticated actor's tenant-scoped wallet; no caller-selected customer. */
  wallet(actor: IndividualActor | null, storeId: string): Promise<LoyaltyWallet>;
}
