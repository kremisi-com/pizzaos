import { cleanupDom as cleanup, renderDom as render, domScreen as screen } from "@pizzaos/testing";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { IndividualStore } from "@pizzaos/domain";
import { OperationalMenu } from "../features/menu/components/operational-menu";

afterEach(cleanup);

const preferences = { avoid: [], save: async () => true, busy: false, message: "", authenticated: false, retry: () => undefined, available: true };

function store(soldOut?: boolean): IndividualStore {
  return {
    id: "store", name: "Sede", latitude: 45, longitude: 9, acceptingOrders: true,
    ingredients: [{ id: "ingredient", name: "Pomodoro", stock: 0 }],
    products: [{ id: "product", name: "Pizza", description: "", priceCents: 800, available: false, soldOut, allergens: [], ingredients: { ingredient: 1 }, options: [] }],
    slots: [{ id: "slot", startsAt: "2030-01-01T19:00:00Z", capacity: 50 }], deliveryBands: [],
  };
}

describe("disponibilità pubblica", () => {
  it("distingue Esaurito dalla disabilitazione manuale e impedisce la selezione", () => {
    const onAdd = vi.fn();
    render(<OperationalMenu store={store(true)} preferences={preferences} onAdd={onAdd} />);
    expect(screen.getAllByText("Esaurito").length).toBeGreaterThan(0);
    expect(screen.queryByText("Non disponibile")).toBeNull();
    const buttons = screen.queryAllByRole("button");
    expect(buttons.some((button) => (button as HTMLButtonElement).disabled)).toBe(true);
    expect(onAdd).not.toHaveBeenCalled();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("conserva Non disponibile per un prodotto disabilitato manualmente", () => {
    render(<OperationalMenu store={store()} preferences={preferences} onAdd={vi.fn()} />);
    expect(screen.getAllByText("Non disponibile").length).toBeGreaterThan(0);
    expect(screen.queryByText("Esaurito")).toBeNull();
  });
});
