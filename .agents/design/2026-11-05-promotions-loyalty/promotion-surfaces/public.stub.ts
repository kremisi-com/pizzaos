import type { IndividualProduct, IndividualQuote, PromotionsApi, PromotionSelection } from "@pizzaos/domain";
export interface PromotionSelectionProps { api: PromotionsApi; storeId: string; selection?: PromotionSelection; disabled?: boolean; refreshVersion?: number; onChange: (selection: PromotionSelection) => void; onTermsChange?: () => void; }
export declare function PromotionSelectionPanel(props: PromotionSelectionProps): import("react").ReactNode;
export declare function PromotionSummary(props: { quote: IndividualQuote }): import("react").ReactNode;
export declare function PromotionAdminPanel(props: { api: PromotionsApi; storeId: string; products: IndividualProduct[]; refreshVersion?: number }): import("react").ReactNode;
