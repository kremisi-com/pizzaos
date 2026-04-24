import { cleanupDom, domScreen, renderDom } from "@pizzaos/testing";
import { beforeEach, describe, expect, it } from "vitest";
import { RewardsScreen } from "../features/loyalty/components/rewards-screen";

describe("rewards screen", () =>
{
  beforeEach(() =>
  {
    cleanupDom();
    window.localStorage.clear();
  });

  it("renders loyalty overview and reward list", async () =>
  {
    renderDom(<RewardsScreen />);

    expect(await domScreen.findByRole("heading", { name: "Programma fedelta e vantaggi" })).toBeDefined();
    expect(domScreen.getByText("Saldo fedelta")).toBeDefined();
    expect(domScreen.getByText("Reward riscattabili")).toBeDefined();
  });

  it("shows coupon states including generated coupon from points", async () =>
  {
    renderDom(<RewardsScreen />);

    expect(await domScreen.findByText("Attivo")).toBeDefined();
    expect(domScreen.getByText("Non attivo")).toBeDefined();
    expect(domScreen.getByText("Generato dai punti")).toBeDefined();
    expect(domScreen.getByTestId("rewards-generated-coupon").textContent).toContain("PREMIO8");
  });

  it("renders subscription card", async () =>
  {
    renderDom(<RewardsScreen />);

    expect(await domScreen.findByTestId("rewards-subscription-card")).toBeDefined();
    expect(domScreen.getByText("Pizza Pass Mensile")).toBeDefined();
  });
});
