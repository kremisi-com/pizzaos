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

  it.each(["#i-tuoi-ordini", "#ordine-123"])("marks orders active when opening /ordina%s directly", hash => {
    window.history.replaceState(null, "", `/ordina${hash}`);
    usePathnameMock.mockReturnValue("/ordina");
    renderDom(<BottomNav live />);
    expect(domScreen.getByRole("button", { name: "Ordini" }).style.color).toBe("var(--pizzaos-color-primary)");
    expect(domScreen.getByRole("button", { name: "Ordina" }).style.transform).toBe("scale(1)");
  });

  it("updates selection when navigating between orders and menu on the same pathname", () => {
    window.history.replaceState(null, "", "/ordina");
    usePathnameMock.mockReturnValue("/ordina");
    renderDom(<BottomNav live />);
    domFireEvent.click(domScreen.getByRole("button", { name: "Ordini" }));
    expect(window.location.hash).toBe("#i-tuoi-ordini");
    expect(domScreen.getByRole("button", { name: "Ordini" }).style.color).toBe("var(--pizzaos-color-primary)");
    domFireEvent.click(domScreen.getByRole("button", { name: "Ordina" }));
    expect(window.location.hash).toBe("");
    expect(window.location.pathname).toBe("/ordina");
    expect(pushMock).not.toHaveBeenCalled();
    expect(domScreen.getByRole("button", { name: "Ordini" }).style.color).toBe("var(--pizzaos-color-foreground-muted)");
    expect(domScreen.getByRole("button", { name: "Ordina" }).style.transform).toBe("scale(1.1)");
  });

  it.each(["hashchange", "popstate"])("follows native anchor and history navigation through %s", event => {
    usePathnameMock.mockReturnValue("/ordina");
    renderDom(<BottomNav live />);
    window.history.replaceState(null, "", "/ordina#i-tuoi-ordini");
    domFireEvent(window, new Event(event));
    expect(domScreen.getByRole("button", { name: "Ordini" }).style.color).toBe("var(--pizzaos-color-primary)");
    window.history.replaceState(null, "", "/ordina#il-menu");
    domFireEvent(window, new Event(event));
    expect(domScreen.getByRole("button", { name: "Ordini" }).style.color).toBe("var(--pizzaos-color-foreground-muted)");
  });

  it("resynchronizes the hash after a pathname transition and keeps cart selected on checkout", () => {
    usePathnameMock.mockReturnValue("/ordina/checkout");
    window.history.replaceState(null, "", "/ordina/checkout#i-tuoi-ordini");
    const view = renderDom(<BottomNav live />);
    expect(domScreen.getByRole("button", { name: "Carrello" }).style.color).toBe("var(--pizzaos-color-primary)");
    usePathnameMock.mockReturnValue("/ordina");
    window.history.replaceState(null, "", "/ordina#i-tuoi-ordini");
    view.rerender(<BottomNav live />);
    expect(domScreen.getByRole("button", { name: "Ordini" }).style.color).toBe("var(--pizzaos-color-primary)");
  });
});
