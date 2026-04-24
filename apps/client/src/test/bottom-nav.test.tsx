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
});
