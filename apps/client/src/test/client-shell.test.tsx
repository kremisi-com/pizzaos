import { getThemeClass } from "@pizzaos/brand";
import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { ClientShell } from "../features/home/components/client-shell";

describe("client shell", () =>
{
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
    expect(markup).toContain('href="#riordino-rapido"');
    expect(markup).toContain('href="#costruisci-la-tua-pizza"');
  });
});
