import { cleanupDom, domFireEvent, domScreen, renderDom } from "@pizzaos/testing";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BottomNav } from "../features/navigation/BottomNav";

const pushMock = vi.fn();
const usePathnameMock = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => usePathnameMock(),
  useRouter: () => ({
    push: pushMock
  })
}));

describe("bottom nav", () =>
{
  beforeEach(() =>
  {
    pushMock.mockReset();
    usePathnameMock.mockReset();
    window.history.replaceState(null, "", "/");
  });

  afterEach(() =>
  {
    cleanupDom();
  });

  it("renders a cart item instead of the profile entry and routes to the cart", () =>
  {
    usePathnameMock.mockReturnValue("/");

    renderDom(<BottomNav />);

    expect(domScreen.queryByRole("button", { name: "Profilo" })).toBeNull();

    const cartButton = domScreen.getByRole("button", { name: "Carrello" });

    domFireEvent.click(cartButton);

    expect(pushMock).toHaveBeenCalledWith("/cart");
  });

  it("marks cart as the active destination for cart and checkout routes", () =>
  {
    usePathnameMock.mockReturnValue("/checkout");

    renderDom(<BottomNav />);

    expect(domScreen.getByRole("button", { name: "Carrello" }).style.color).toBe("var(--pizzaos-color-primary)");
    expect(domScreen.getByRole("button", { name: "Ordini" }).style.color).toBe("var(--pizzaos-color-foreground-muted)");
  });

  it("opens the dedicated operational orders page", () => {
    usePathnameMock.mockReturnValue("/ordina");
    renderDom(<BottomNav live />);
    domFireEvent.click(domScreen.getByRole("button", { name: "Ordini" }));
    expect(pushMock).toHaveBeenCalledWith("/ordina/ordini");
  });

  it.each(["/ordina/ordini", "/ordina/ordini/ordine-123"])("keeps orders selected at %s", path => {
    usePathnameMock.mockReturnValue(path);
    window.history.replaceState(null, "", path);
    renderDom(<BottomNav live />);
    expect(domScreen.getByRole("button", { name: "Ordini" }).style.color).toBe("var(--pizzaos-color-primary)");
    expect(domScreen.getByRole("button", { name: "Carrello" }).style.color).toBe("var(--pizzaos-color-foreground-muted)");
  });

  it("keeps the demo orders destination separate", () => {
    usePathnameMock.mockReturnValue("/");
    renderDom(<BottomNav />);
    domFireEvent.click(domScreen.getByRole("button", { name: "Ordini" }));
    expect(pushMock).toHaveBeenCalledWith("/orders");
  });

  it("follows pathname changes between checkout, orders and menu", () => {
    usePathnameMock.mockReturnValue("/ordina/checkout");
    const view = renderDom(<BottomNav live />);
    expect(domScreen.getByRole("button", { name: "Carrello" }).style.color).toBe("var(--pizzaos-color-primary)");
    usePathnameMock.mockReturnValue("/ordina/ordini");
    view.rerender(<BottomNav live />);
    expect(domScreen.getByRole("button", { name: "Ordini" }).style.color).toBe("var(--pizzaos-color-primary)");
    usePathnameMock.mockReturnValue("/ordina");
    view.rerender(<BottomNav live />);
    expect(domScreen.getByRole("button", { name: "Ordini" }).style.color).toBe("var(--pizzaos-color-foreground-muted)");
  });
});
