import { beforeEach, describe, expect, it } from "vitest";
import {
  cleanupDom,
  domFireEvent,
  domScreen,
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

  it("renders the menu header, category tabs, and sold out products", () =>
  {
    renderDom(<MenuScreen />);

    expect(domScreen.getByRole("heading", { name: "Scegli la tua pizza" }).textContent).toBe("Scegli la tua pizza");
    expect(domScreen.getByRole("tablist", { name: "Sezioni menu" })).toBeTruthy();
    expect(domScreen.getByRole("button", { name: /Consegna prevista:/i }).textContent).toContain("Oggi, 19:10");
    expect(domScreen.getByRole("heading", { name: "Pizze Classiche" }).textContent).toBe("Pizze Classiche");

    domFireEvent.click(domScreen.getByRole("tab", { name: /Speciali Della Casa/i }));

    expect(domScreen.getByText("Tonno e Cipolla").textContent).toBe("Tonno e Cipolla");
    expect(domScreen.getByText("Servita cruda").textContent).toBe("Servita cruda");

    domFireEvent.click(domScreen.getByRole("tab", { name: /Forno Espresso/i }));

    expect(domScreen.getByText("Calzone Tradizione").textContent).toBe("Calzone Tradizione");
    expect(domScreen.getByText("Esaurita ora").textContent).toBe("Esaurita ora");
    expect(domScreen.getByRole("button", { name: "Esaurito" }).hasAttribute("disabled")).toBe(true);
  });

  it("honors the initial section id and updates the selected tab", () =>
  {
    renderDom(<MenuScreen initialSectionId="section-speciali" />);

    const selectedTab = domScreen.getByRole("tab", { name: /Speciali Della Casa/i });

    expect(selectedTab.getAttribute("aria-selected")).toBe("true");
    expect(domScreen.getByRole("heading", { name: "Speciali Della Casa" }).textContent).toBe("Speciali Della Casa");
    expect(domScreen.getByText("Tonno e Cipolla").textContent).toBe("Tonno e Cipolla");

    domFireEvent.click(domScreen.getByRole("tab", { name: /Forno Espresso/i }));

    expect(selectedTab.getAttribute("aria-selected")).toBe("false");
    expect(domScreen.getByRole("tab", { name: /Forno Espresso/i }).getAttribute("aria-selected")).toBe("true");
    expect(domScreen.getByRole("heading", { name: "Forno Espresso" }).textContent).toBe("Forno Espresso");
  });
});
