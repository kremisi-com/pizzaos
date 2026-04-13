import { beforeEach, describe, expect, it } from "vitest";
import {
  cleanupDom,
  domFireEvent,
  domScreen,
  renderDom,
} from "@pizzaos/testing";
import { MenuScreen } from "../features/menu/components/menu-screen";

describe("menu screen", () => {
  beforeEach(() => {
    cleanupDom();
    window.localStorage.clear();
  });

  it("renders the menu header, category tabs, and visible products", () => {
    renderDom(<MenuScreen />);

    expect(
      domScreen
        .getByRole("img", { name: "Anteprima pizza" })
        .getAttribute("src"),
    ).toBe("/images/pizza/rossa-classica.png");
    expect(
      domScreen.getByRole("heading", { name: "La pizza a modo tuo" })
        .textContent,
    ).toBe("La pizza a modo tuo");
    expect(
      domScreen.getByRole("tablist", { name: "Sezioni menu" }),
    ).toBeTruthy();
    expect(
      domScreen.getByRole("heading", { name: "Da dove vuoi iniziare?" }).textContent,
    ).toBe("Da dove vuoi iniziare?");
    expect(
      document.querySelector('[src="/images/topping/margherita.png"]'),
    ).not.toBeNull();
    expect(
      document.querySelector('[src="/images/topping/diavola.png"]'),
    ).not.toBeNull();
    expect(
      domScreen
        .getByRole("radio", { name: /Rossa/i })
        .getAttribute("aria-checked"),
    ).toBe("true");


    domFireEvent.click(
      domScreen.getByRole("tab", { name: /Speciali Della Casa/i }),
    );

    expect(domScreen.getByText("Tonno e Cipolla").textContent).toBe(
      "Tonno e Cipolla",
    );
    expect(
      document.querySelector('[src="/images/topping/vegetariana.png"]'),
    ).not.toBeNull();
    expect(
      document.querySelector('[src="/images/topping/formaggi.png"]'),
    ).not.toBeNull();
    expect(
      document.querySelector('[src="/images/topping/tonno.png"]'),
    ).not.toBeNull();

    expect(
      domScreen.queryByRole("tab", { name: /Forno Espresso/i }),
    ).toBeNull();
    expect(domScreen.queryByText("Focaccia al Rosmarino")).toBeNull();
    expect(domScreen.queryByText("Calzone Tradizione")).toBeNull();
  });

  it("updates the preview image when base and dough change", () => {
    renderDom(<MenuScreen />);

    expect(domScreen.getAllByText("✓")).toHaveLength(2);
    domFireEvent.click(domScreen.getByRole("radio", { name: /Bianca/i }));
    domFireEvent.click(domScreen.getByRole("radio", { name: /Integrale/i }));

    expect(
      domScreen
        .getByRole("img", { name: "Anteprima pizza" })
        .getAttribute("src"),
    ).toBe("/images/pizza/bianca-integrale.png");
    expect(domScreen.getAllByText("✓")).toHaveLength(2);
    expect(
      domScreen.getByRole("radio", { name: /Bianca/i }).getAttribute("aria-checked"),
    ).toBe("true");
    expect(
      domScreen.getByRole("radio", { name: /Rossa/i }).getAttribute("aria-checked"),
    ).toBe("false");
    expect(
      domScreen.getByRole("radio", { name: /Integrale/i }).getAttribute("aria-checked"),
    ).toBe("true");
  });

  it("honors the initial section id and updates the selected tab", () => {
    renderDom(<MenuScreen initialSectionId="section-speciali" />);

    const selectedTab = domScreen.getByRole("tab", {
      name: /Speciali Della Casa/i,
    });

    expect(selectedTab.getAttribute("aria-selected")).toBe("true");
    expect(domScreen.getByText("Tonno e Cipolla").textContent).toBe(
      "Tonno e Cipolla",
    );
    expect(
      domScreen
        .getByRole("tab", { name: /Speciali Della Casa/i })
        .getAttribute("aria-selected"),
    ).toBe("true");
    expect(
      domScreen.queryByRole("tab", { name: /Forno Espresso/i }),
    ).toBeNull();
  });
});
