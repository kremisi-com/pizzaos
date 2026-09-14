import { beforeEach, describe, expect, it, vi } from "vitest";
import { cleanupDom, domFireEvent, domScreen, renderDom } from "@pizzaos/testing";
import { GroupOrderScreen } from "../features/group-order/components/group-order-screen";
import { addGroupOrderItem, CLIENT_GROUP_ORDER_STORAGE_KEY, GROUP_ORDER_CURRENT_PARTICIPANT_ID, loadGroupOrderState } from "../features/group-order/group-order-model";

describe("group order screen", () =>
{
  beforeEach(() => { cleanupDom(); window.localStorage.clear(); vi.restoreAllMocks(); });

  it("renders participants, local-only sharing, and the group summary", () =>
  {
    renderDom(<GroupOrderScreen />);
    expect(domScreen.getByRole("heading", { name: "Pizza insieme stasera" })).toBeDefined();
    expect(domScreen.getByText("Sara · Host")).toBeDefined();
    expect(domScreen.getByText("4 partecipanti")).toBeDefined();
    expect(domScreen.getByText(/Totale gruppo/)).toBeDefined();
    expect(domScreen.getByText("Nessuna scelta ancora")).toBeDefined();
    expect(domScreen.getByText(/nessun invito reale viene inviato/i)).toBeDefined();
    expect(domScreen.getByRole("link", { name: "Aggiungi al tuo contributo" }).getAttribute("href")).toBe("/menu?order=group");
    expect(domScreen.getByRole("link", { name: "Checkout unico dell'host" }).getAttribute("href")).toBe("/checkout?order=group");
  });

  it("updates and removes only the current participant contribution", () =>
  {
    addGroupOrderItem({ productId: "product-margherita", productName: "Margherita Classica", unitPriceCents: 900 }, window.localStorage);
    renderDom(<GroupOrderScreen />);
    domFireEvent.click(domScreen.getByRole("button", { name: "Aumenta quantità Margherita Classica" }));
    expect(domScreen.getByText(/Il tuo subtotale 18,00/)).toBeDefined();
    domFireEvent.click(domScreen.getByRole("button", { name: "Rimuovi" }));
    expect(domScreen.getByText("Nessuna scelta ancora")).toBeDefined();
    expect(loadGroupOrderState(window.localStorage).items.some((item) => item.participantId === GROUP_ORDER_CURRENT_PARTICIPANT_ID)).toBe(false);
  });

  it("copies the simulated share link", async () =>
  {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(window.navigator, "clipboard", { configurable: true, value: { writeText } });
    renderDom(<GroupOrderScreen />);
    domFireEvent.click(domScreen.getByRole("button", { name: "Condividi link" }));
    expect(writeText).toHaveBeenCalledWith("https://demo.pizzaos.app/gruppo/stasera-da-dividere");
    expect(await domScreen.findByText("Link copiato")).toBeDefined();
    expect(window.localStorage.getItem(CLIENT_GROUP_ORDER_STORAGE_KEY)).not.toBeNull();
  });
});
