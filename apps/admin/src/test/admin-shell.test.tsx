import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { AdminShell } from "@/features/home/components/admin-shell";

describe("admin shell", () =>
{
  it("mounts with the expected sections", () =>
  {
    const markup = renderToString(createElement(AdminShell));

    expect(markup).toContain("PizzaOS");
    expect(markup).toContain("Dashboard");
    expect(markup).toContain("Ordini");
    expect(markup).toContain("Reset Demo");
    expect(markup).toContain("Avanza Simulazione");
    expect(markup).toContain("Stato Negozio");
    expect(markup).toContain("Operatività Ordini");
    expect(markup).toContain("Stato Magazzino");
    expect(markup).toContain("Flotta Consegne");
    expect(markup).toContain("Configurazione Menu");
    expect(markup).toContain("Insight AI");
    expect(markup).toContain("Integrazioni");
  });
});
