import type {
  AiInsight,
  AnalyticsSnapshot,
  AppShellSeed,
  AppSurface,
  Coupon,
  EntityIdentifier,
  InventoryItem,
  LoyaltyState,
  Menu,
  Order,
  Product,
  StoreProfile
} from "@pizzaos/domain";

export interface LandingSeed extends AppShellSeed
{
  readonly highlights: readonly string[];
  readonly primaryCtaLabel: string;
  readonly secondaryCtaLabel: string;
}

export interface ClientSeed extends AppShellSeed
{
  readonly store: StoreProfile;
  readonly menu: Menu;
  readonly products: readonly Product[];
  readonly loyalty: LoyaltyState;
  readonly coupons: readonly Coupon[];
  readonly activeOrders: readonly Order[];
  readonly orderHistory: readonly Order[];
  readonly simulationCursorIso: string;
}

export interface AdminStoreDataset
{
  readonly store: StoreProfile;
  readonly menu: Menu;
  readonly menus: readonly Menu[];
  readonly products: readonly Product[];
  readonly orders: readonly Order[];
  readonly inventory: readonly InventoryItem[];
  readonly analytics: AnalyticsSnapshot;
  readonly insights: readonly AiInsight[];
  readonly isDynamicPricingEnabled: boolean;
  readonly simulationCursorIso: string;
}

export interface AdminSeed extends AppShellSeed
{
  readonly activeStoreId: EntityIdentifier;
  readonly stores: readonly StoreProfile[];
  readonly datasetsByStoreId: Readonly<Record<EntityIdentifier, AdminStoreDataset>>;
  readonly simulationCursorIso: string;
}

export interface DemoStorage
{
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export type DemoAppId = AppSurface;

export interface SeedOptions
{
  readonly storeId?: EntityIdentifier;
}

export interface PersistOptions extends SeedOptions
{
  readonly storage?: DemoStorage;
}

export interface OrderSimulationState
{
  readonly orders: readonly Order[];
  readonly simulationCursorIso: string;
}

export interface DemoStateByApp
{
  readonly landing: LandingSeed;
  readonly client: ClientSeed;
  readonly admin: AdminSeed;
}

export interface AdminDatasetTemplate
{
  readonly menu: Menu;
  readonly menus: readonly Menu[];
  readonly orders: readonly Order[];
  readonly inventory: readonly InventoryItem[];
  readonly analytics: AnalyticsSnapshot;
  readonly insights: readonly AiInsight[];
  readonly isDynamicPricingEnabled: boolean;
}
