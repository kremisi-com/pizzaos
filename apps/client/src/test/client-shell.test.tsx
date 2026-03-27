import { getThemeClass } from "@pizzaos/brand";
import { createClientSeed } from "@pizzaos/mock-data";
import { cleanupDom, domScreen, renderDom } from "@pizzaos/testing";
import { beforeEach, describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { ClientShell } from "../features/home/components/client-shell";
import { getClientDemoStateStorageKey } from "../features/home/client-demo-state";

describe("client shell", () =>
{
  beforeEach(() =>
  {
    cleanupDom();
    window.localStorage.clear();
  });

  it("mounts with the expected mobile-first entry points", () =>
  {
    const markup = renderToString(createElement(ClientShell));

    expect(markup).toContain(getThemeClass("client"));
    expect(markup).toContain("Bentornato");
    expect(markup).toContain("Riordina ora");
    expect(markup).toContain("Crea la tua pizza");
    expect(markup).toContain("Riordino rapido");
    expect(markup).toContain("Promo di stagione");
    expect(markup).toContain("Reset demo");
    expect(markup).toContain('href="/menu"');
    expect(markup).toContain('href="/menu?section=section-speciali"');
  });

  it("does not crash when persisted slot values are non-ISO labels", async () =>
  {
    const seed = createClientSeed();
    const persistedSeed = {
      ...seed,
      activeOrders: [
        {
          ...seed.activeOrders[0],
          scheduledSlot: "Oggi, 19:10"
        }
      ]
    };

    window.localStorage.setItem(getClientDemoStateStorageKey(), JSON.stringify(persistedSeed));

    renderDom(<ClientShell />);

    expect(await domScreen.findByText(/Slot previsto Oggi, 19:10/i)).toBeDefined();
  });
});
