import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { ChallengesSection } from "../features/home/components/challenges-section";
import { LandingShell } from "../features/home/components/landing-shell";

describe("landing shell", () =>
{
  it("mounts the primary landing sections", () =>
  {
    const markup = renderToString(createElement(LandingShell));

    expect(markup).toContain("Trasforma la tua");
    expect(markup).toContain("LE SFIDE DI OGNI PIZZERIA");
    expect(markup).toContain("Ecosistema");
    expect(markup).toContain("Reset demo");
  });

  it("renders the challenges section with all demo problem cards", () =>
  {
    const markup = renderToString(createElement(ChallengesSection));

    expect(markup).toContain("Ti riconosci in");
    expect(markup).toContain("Troppe chiamate, troppo caos");
    expect(markup).toContain("Commissioni che mangiano i profitti");
    expect(markup).toContain("Clienti che ordinano una volta e spariscono");
    expect(markup).toContain("Consegne disordinate e zero controllo");
    expect(markup).toContain("Menu statico, poco flessibile");
    expect(markup).toContain("Nessun dato, nessuna crescita");
    expect(markup).toContain("Scopri come funziona");
  });
});
