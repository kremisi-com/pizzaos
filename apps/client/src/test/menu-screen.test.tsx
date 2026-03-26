import { beforeEach, describe, expect, it } from "vitest";
import {
  cleanupDom,
  domFireEvent,
  domScreen,
  domWithin,
  renderDom
} from "@pizzaos/testing";
import { MenuScreen } from "../features/menu/components/menu-screen";

describe("menu screen", () =>
{
  beforeEach(() =>
  {
    cleanupDom();
    window.localStorage.clear();
  });

  it("renders menu browsing with slots and visible sold out product state", () =>
  {
    renderDom(<MenuScreen />);

    expect(domScreen.getByRole("heading", { name: "Menu di oggi" }).textContent).toBe("Menu di oggi");
    expect(domScreen.getByRole("heading", { name: "Consegna e ritiro" }).textContent).toBe("Consegna e ritiro");
    expect(domScreen.getByRole("heading", { name: "Sfoglia per sezione" }).textContent).toBe("Sfoglia per sezione");

    domFireEvent.click(domScreen.getByRole("tab", { name: /Speciali Della Casa/i }));

    expect(domScreen.getByText("Tonno e Cipolla").textContent).toBe("Tonno e Cipolla");
    expect(domScreen.getByText("Servita cruda").textContent).toBe("Servita cruda");

    domFireEvent.click(domScreen.getByRole("tab", { name: /Forno Espresso/i }));

    expect(domScreen.getByText("Calzone Tradizione").textContent).toBe("Calzone Tradizione");
    expect(domScreen.getByText("Esaurita ora").textContent).toBe("Esaurita ora");
    expect(domScreen.getByRole("button", { name: "Non disponibile" }).hasAttribute("disabled")).toBe(true);
  });

  it("switches section and keeps sold out slots visible but disabled", () =>
  {
    renderDom(<MenuScreen initialSectionId="section-speciali" />);

    const selectedTab = domScreen.getByRole("tab", { name: /Speciali Della Casa/i });
    expect(selectedTab.getAttribute("aria-selected")).toBe("true");

    const slotList = domScreen.getByRole("list", { name: "Slot disponibili" });
    const slotItems = domWithin(slotList).getAllByRole("listitem");
    const soldOutSlot = slotItems[2];

    expect(soldOutSlot.textContent).toContain("Oggi, 19:50");
    expect(soldOutSlot.hasAttribute("disabled")).toBe(true);

    domFireEvent.click(slotItems[1]);

    expect(domScreen.getByText("Slot selezionato").textContent).toBe("Slot selezionato");
    expect(domScreen.getByText(/Arrivo stimato in circa 40 minuti/i).textContent).toContain("40 minuti");
  });
});
