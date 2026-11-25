import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanupDom, domScreen, renderDom } from "@pizzaos/testing";
import type { IndividualStore } from "@pizzaos/domain";
import { OrderSlotSelect } from "../features/individual-ordering/components/order-slot-select";

const instant = new Date("2026-11-25T18:00:00Z");
const store: IndividualStore = {
  id: "roma", name: "Roma", latitude: 41, longitude: 12, acceptingOrders: true,
  ingredients: [], products: [], deliveryBands: [],
  slots: [{ id: "soon", startsAt: instant.toISOString(), endsAt: "2026-11-25T18:01:00Z", capacity: 1 }]
};

describe("scadenze delle fasce nel browser", () => {
  beforeEach(() => { vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true); vi.useFakeTimers(); vi.setSystemTime(instant); });
  afterEach(() => { cleanupDom(); vi.useRealTimers(); vi.unstubAllGlobals(); });

  it("rimuove la fascia alla fine senza aspettare una risposta del servizio", async () => {
    renderDom(<OrderSlotSelect store={store} value={null} onChange={() => undefined} />);
    expect(domScreen.getAllByRole("option")).toHaveLength(2);
    await act(async () => { await vi.advanceTimersByTimeAsync(60_001); });
    expect(domScreen.getAllByRole("option")).toHaveLength(1);
    expect(domScreen.getByRole<HTMLOptionElement>("option", { name: "Appena possibile" }).disabled).toBe(true);
  });

  it("non ripete timer immediati per una fascia oltre il limite dei timer del browser", async () => {
    const far = { ...store, slots: [{ ...store.slots[0]!, endsAt: "2030-01-01T19:00:00Z" }] };
    renderDom(<OrderSlotSelect store={far} value={null} onChange={() => undefined} />);
    expect(vi.getTimerCount()).toBe(1);
    await act(async () => { await vi.advanceTimersByTimeAsync(2_147_483_647); });
    expect(vi.getTimerCount()).toBe(1);
    expect(domScreen.getAllByRole("option")).toHaveLength(2);
  });
});
