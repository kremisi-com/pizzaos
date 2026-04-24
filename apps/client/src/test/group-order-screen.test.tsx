import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanupDom,
  domFireEvent,
  domScreen,
  renderDom
} from "@pizzaos/testing";
import { GroupOrderScreen } from "../features/group-order/components/group-order-screen";

describe("group order screen", () => {
  beforeEach(() => {
    cleanupDom();
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it("renders the shared cart hub with updated copy and actions", () => {
    renderDom(<GroupOrderScreen />);

    expect(
      domScreen.getByRole("heading", { name: "Carrello condiviso" }).textContent
    ).toBe("Carrello condiviso");
    expect(domScreen.queryByText("Demo sociale")).toBeNull();
    expect(domScreen.queryByText("Ordine condiviso")).toBeNull();
    expect(
      domScreen.getByText(
        "Ognuno può prendere la pizza dal proprio cellulare e pagare quello che vuole."
      ).textContent
    ).toBe("Ognuno può prendere la pizza dal proprio cellulare e pagare quello che vuole.");
    expect(
      domScreen.getByLabelText("QR code del carrello condiviso")
    ).not.toBeNull();
    expect(
      domScreen.getByRole("button", { name: "condividi link" }).textContent
    ).toBe("condividi link");
    expect(
      domScreen.getByRole("button", { name: "nascondi QR code" }).getAttribute("aria-expanded")
    ).toBe("true");
    expect(domScreen.getByText("Sara").textContent).toBe("Sara");
    expect(
      domScreen.getByRole("link", { name: "Aggiungi la tua pizza" }).getAttribute("href")
    ).toBe("/menu");
    expect(
      domScreen.getByRole("link", { name: "Apri il carrello del gruppo" }).getAttribute("href")
    ).toBe("/cart");
  });

  it("toggles the QR code while keeping the share link visible", () => {
    renderDom(<GroupOrderScreen />);

    domFireEvent.click(domScreen.getByRole("button", { name: "nascondi QR code" }));

    expect(domScreen.queryByLabelText("QR code del carrello condiviso")).toBeNull();
    expect(
      domScreen.getByRole("button", { name: "condividi link" }).textContent
    ).toBe("condividi link");
    expect(
      domScreen.getByRole("button", { name: "mostra QR code" }).getAttribute("aria-expanded")
    ).toBe("false");
  });

  it("copies the shared cart link when the share action is pressed", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);

    Object.defineProperty(window.navigator, "clipboard", {
      configurable: true,
      value: {
        writeText
      }
    });

    renderDom(<GroupOrderScreen />);
    domFireEvent.click(domScreen.getByRole("button", { name: "condividi link" }));

    expect(writeText).toHaveBeenCalledWith("https://demo.pizzaos.app/gruppo/stasera-da-dividere");
    expect(await domScreen.findByText("Link copiato")).not.toBeNull();
  });
});
