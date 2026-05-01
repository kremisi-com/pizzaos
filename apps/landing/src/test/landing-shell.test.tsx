import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { AnalyticsGrowthSection } from "../features/home/components/analytics-growth-section";
import { ChallengesSection } from "../features/home/components/challenges-section";
import { CompletePlatformSection } from "../features/home/components/complete-platform-section";
import { FeatureDifferenceSection } from "../features/home/components/feature-difference-section";
import { LandingShell } from "../features/home/components/landing-shell";
import { MarginComparisonSection } from "../features/home/components/margin-comparison-section";

describe("landing shell", () =>
{
  it("mounts the primary landing sections", () =>
  {
    const markup = renderToString(createElement(LandingShell));

    expect(markup).toContain("Trasforma la tua");
    expect(markup).toContain("LE SFIDE DI OGNI PIZZERIA");
    expect(markup).toContain("soluzione-completa");
    expect(markup).toContain("funzionalita-differenza");
    expect(markup).toContain("MENO COSTI, PIÙ MARGINE");
    expect(markup).toContain("dati-crescita");
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

  it("renders the complete platform section as coded landing content", () =>
  {
    const markup = renderToString(createElement(CompletePlatformSection));

    expect(markup).toContain("LA SOLUZIONE COMPLETA");
    expect(markup).toContain("Tutto ciò che ti serve");
    expect(markup).toContain("Delivery Control");
    expect(markup).toContain("Growth Engine");
    expect(markup).toContain("Lista allergeni e impasti");
    expect(markup).toContain("Zero commissioni");
  });

  it("renders the fourth feature difference section from the supplied screen", () =>
  {
    const markup = renderToString(createElement(FeatureDifferenceSection));

    expect(markup).toContain("FUNZIONALITÀ CHE FANNO LA DIFFERENZA");
    expect(markup).toContain("Funzionalità pensate");
    expect(markup).toContain("vendere di più");
    expect(markup).toContain("Pizza Builder avanzato");
    expect(markup).toContain("Ordina come l&#x27;ultima volta");
    expect(markup).toContain("Tracciamento live del rider");
    expect(markup).toContain("AI che lavora per te");
    expect(markup).toContain("Tutte le funzionalità sono integrate");
    expect(markup).toContain("Scopri tutte le funzionalità");
  });

  it("renders the fifth margin comparison section from the supplied screen", () =>
  {
    const markup = renderToString(createElement(MarginComparisonSection, { onRequestDemo: () => undefined }));

    expect(markup).toContain("MENO COSTI, PIÙ MARGINE");
    expect(markup).toContain("Più ordini diretti.");
    expect(markup).toContain("Più <span>margine</span> per te.");
    expect(markup).toContain("Marketplace");
    expect(markup).toContain("Pizza<span>OS</span>");
    expect(markup).toContain("Commissioni sugli ordini");
    expect(markup).toContain("Il cliente è tuo");
    expect(markup).toContain("Dati e analytics");
    expect(markup).toContain("0%");
    expect(markup).toContain("500 ordini al mese");
    expect(markup).toContain("9.000 € in più");
    expect(markup).toContain("Scopri quanto puoi risparmiare");
  });

  it("renders the sixth analytics growth section from the supplied screen", () =>
  {
    const markup = renderToString(createElement(AnalyticsGrowthSection));

    expect(markup).toContain("DATI, ANALISI, CRESCITA");
    expect(markup).toContain("Dati che contano.");
    expect(markup).toContain("Decisioni che <span>fanno crescere.</span>");
    expect(markup).toContain("Analytics avanzate");
    expect(markup).toContain("Previsioni di vendita");
    expect(markup).toContain("Panoramica");
    expect(markup).toContain("Fatturato");
    expect(markup).toContain("Vendite per categoria");
    expect(markup).toContain("Insight AI per il tuo business");
    expect(markup).toContain("Hai troppo impasto Kamut");
    expect(markup).toContain("Questo cliente torna ogni venerdì");
    expect(markup).toContain("Trasforma i dati in crescita reale");
    expect(markup).toContain("Scopri come i dati fanno la differenza");
  });
});
