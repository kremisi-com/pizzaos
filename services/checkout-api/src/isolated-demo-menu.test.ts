// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { resolveMenuComposition, type IndividualProduct } from "@pizzaos/domain";
import { planIsolatedDemoMenu, type IsolatedDemoMenuSource } from "./isolated-demo-menu";
import type { OrderingState } from "./ordering-contract";

function source(): IsolatedDemoMenuSource {
  return JSON.parse(readFileSync(new URL("../data/menu-demo-2026-11-25.json", import.meta.url), "utf8"));
}
function fixture(): OrderingState {
  return { stores: { "verifica-online": {
    id: "verifica-online", name: "La Pizza Speciale", latitude: 45, longitude: 9,
    acceptingOrders: true, ingredients: [{ id: "pomodoro", name: "Pomodoro", stock: null }],
    products: [], slots: [], deliveryBands: [], menu: { id: "published", name: "Menu precedente", sections: [] }
  } }, memberships: [], orders: {}, idempotency: {}, events: [], cursor: 3,
  menuDrafts: { "verifica-online": { revision: 4, drafts: [{ id: "previous", name: "Bozza precedente", products: [], sections: [] }] } } };
}
function imported() {
  const result = planIsolatedDemoMenu(fixture(), source());
  const store = result.state.stores["verifica-online"];
  const draft = result.state.menuDrafts![store.id].drafts.at(-1)!;
  const product = (name: string): IndividualProduct => draft.products.find(item => item.name === name)!;
  return { ...result, store, draft, product };
}

describe("importazione isolata del menu dimostrativo", () => {
  it("aggiunge soltanto scorte demo e una bozza, conservando lo snapshot precedente", () => {
    const before = fixture();
    const saved = structuredClone(before);
    const { state, report } = planIsolatedDemoMenu(before, source());
    expect(before).toEqual(saved);
    expect(report.createdDraft).toBe(true);
    expect(report.products).toBe(33);
    expect(report.sections.map(section => section.products)).toEqual([14, 2, 5, 8, 4]);
    expect(state.menuDrafts!["verifica-online"].revision).toBe(5);
    const restored = structuredClone(state);
    restored.stores["verifica-online"].ingredients = restored.stores["verifica-online"].ingredients.filter(item => !item.id.startsWith(source().inventoryPrefix));
    restored.menuDrafts!["verifica-online"].drafts.pop();
    restored.menuDrafts!["verifica-online"].revision--;
    expect(restored).toEqual(saved);
  });

  it("è ripetibile anche dopo la normalizzazione JSONB senza cambiare revisioni", () => {
    const { state } = imported();
    const normalized = JSON.parse(JSON.stringify(state, (_key, value: unknown) => {
      if (value && typeof value === "object" && !Array.isArray(value)) return Object.fromEntries(Object.entries(value).reverse());
      return value;
    }));
    const repeated = planIsolatedDemoMenu(normalized, source());
    expect(repeated.state).toEqual(state);
    expect(repeated.report.createdDraft).toBe(false);
    expect(repeated.report.createdIngredients).toEqual([]);
  });

  it("rifiuta atomicamente sede errata, scorte condivise e collisioni con dati modificati", () => {
    const original = fixture();
    const wrong = source(); wrong.storeName = "Altra sede";
    expect(() => planIsolatedDemoMenu(original, wrong)).toThrow("Sede");
    const shared = source(); shared.draft.products[0].ingredients = { pomodoro: 1 };
    expect(() => planIsolatedDemoMenu(original, shared)).toThrow("scorte condivise");
    const { state } = imported();
    state.stores["verifica-online"].ingredients.at(-1)!.stock = 99;
    const saved = structuredClone(state);
    expect(() => planIsolatedDemoMenu(state, source())).toThrow("Scorta demo già modificata");
    expect(state).toEqual(saved);
    const edited = imported().state;
    edited.menuDrafts!["verifica-online"].drafts.at(-1)!.products[0].priceCents++;
    expect(() => planIsolatedDemoMenu(edited, source())).toThrow("non verrà sovrascritta");
  });

  it("conserva i prezzi delle pizze e applica un solo supplemento per impasto", () => {
    const { draft, product } = imported();
    expect(draft.pizzaCatalog!.tastes.map(item => item.priceCents)).toEqual([1300, 1100, 1000, 1040, 1220, 1340, 1090, 1070, 940, 1280, 1190, 1390, 700, 700]);
    const pizza = product("La Pizza Speciale");
    for (const [dough, total] of [["tradizionale", 1300], ["castagne", 1550], ["mais", 1400]] as const) {
      const resolved = resolveMenuComposition(pizza, [{ optionId: `dough:${dough}`, quantity: 1 }, { optionId: "format:tonda", quantity: 1 }]);
      expect(resolved.valid).toBe(true);
      expect(resolved.unitCents).toBe(total);
      expect(resolved.recipe[`demo-menu-20261125-impasto-${dough}`]).toBe(1);
    }
    expect(product("Baby").ingredients).toMatchObject({ "demo-menu-20261125-pane": 1, "demo-menu-20261125-nutella": 1 });
  });

  it.each([[3, 1650, 1], [6, 3100, 2]])("box %s: vincola cardinalità, ripetizioni, prezzo e consumo dell'omaggio", (size, price, gifts) => {
    const { product } = imported();
    const box = product(`Componi la tua box (${size} birre)`);
    const selected = resolveMenuComposition(box, [{ optionId: box.options[0].id, quantity: size }]);
    expect(selected.valid).toBe(true);
    expect(selected.unitCents).toBe(price);
    expect(selected.recipe).toEqual({ "demo-menu-20261125-apribottiglie": gifts, "demo-menu-20261125-birra-chiara": size });
    for (const quantity of [size - 1, size + 1]) expect(resolveMenuComposition(box, [{ optionId: box.options[0].id, quantity }]).valid).toBe(false);
    expect(resolveMenuComposition(box, [{ optionId: box.options[0].id, quantity: size - 1 }, { optionId: box.options[1].id, quantity: 1 }]).valid).toBe(true);
  });

  it("mantiene esauriti, quantità iniziali e allergeni da verificare senza inventare certificazioni", () => {
    const { store, draft, product } = imported();
    const counts = (suffix: string) => store.ingredients.find(item => item.id === `demo-menu-20261125-${suffix}`)!.stock;
    expect(["castagne", "mais", "integrale", "tradizionale"].map(key => counts(`impasto-${key}`))).toEqual([5, 16, 0, 16]);
    expect([counts("sacher"), counts("cheesecake-rossi"), counts("cheesecake-pistacchio")]).toEqual([1, 2, 2]);
    for (const name of ["Bocconcini di pane", "Barchetta", "Bocconcini di pane alla Nutella (6 pz.)"]) expect(product(name).available).toBe(false);
    expect(store.ingredients.every(item => item.food === undefined)).toBe(true);
    expect(draft.products.every(item => !item.food && item.allergens.length === 0)).toBe(true);
    expect(resolveMenuComposition(product("Sacher"), []).composition.foodComplete).toBe(false);
  });
});
