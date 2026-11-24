import type { IndividualIngredient, MenuDraft, PizzaCatalog } from "@pizzaos/domain";

/** Pure; menu-wide standard/allowed choices replace per-entry choices, keeping base prices and IDs. */
export declare function applyPizzaDefaults(catalog: PizzaCatalog): PizzaCatalog;

/** Pure; eligible extra prices/doses become a deterministic draft snapshot, independent of stock. */
export declare function syncPizzaInventory(draft: MenuDraft, ingredients: readonly IndividualIngredient[]): MenuDraft;
