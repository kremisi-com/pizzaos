import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Navbar } from "../features/home/components/navbar";

describe("landing navbar", () => {
  it("links to the primary demo storytelling sections", () => {
    const markup = renderToString(
      createElement(Navbar, { onRequestDemo: () => undefined }),
    );

    expect(markup).toContain("Piattaforma");
    expect(markup).toContain("#soluzione-completa");
    expect(markup).toContain("Ordini");
    expect(markup).toContain("#gestione-ordini");
    expect(markup).toContain("Crescita");
    expect(markup).toContain("#dati-crescita");
    expect(markup).toContain("Funzionalità");
    expect(markup).toContain("#ecosistema");
    expect(markup).toContain("Prezzi");
    expect(markup).toContain("#piani");
    expect(markup).toContain("Contatti");
    expect(markup).toContain("#contatti");
    expect(markup).toContain("Apri la demo");
  });
});
