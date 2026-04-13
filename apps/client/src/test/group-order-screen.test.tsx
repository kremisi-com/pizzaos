import { beforeEach, describe, expect, it } from "vitest";
import { cleanupDom, domScreen, renderDom } from "@pizzaos/testing";
import { GroupOrderScreen } from "../features/group-order/components/group-order-screen";

describe("group order screen", () => {
  beforeEach(() => {
    cleanupDom();
    window.localStorage.clear();
  });

  it("renders the friends group hub with menu and cart actions", () => {
    renderDom(<GroupOrderScreen />);

    expect(
      domScreen.getByRole("heading", { name: "Gruppo amici" }).textContent,
    ).toBe("Gruppo amici");
    expect(domScreen.getByText("Sara").textContent).toBe("Sara");
    expect(
      domScreen.getByRole("link", { name: "Aggiungi la tua pizza" }).getAttribute("href"),
    ).toBe("/menu");
    expect(
      domScreen.getByRole("link", { name: "Apri il carrello del gruppo" }).getAttribute("href"),
    ).toBe("/cart");
  });
});
