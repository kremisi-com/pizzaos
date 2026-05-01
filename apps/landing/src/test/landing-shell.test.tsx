import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { AnalyticsGrowthSection } from "../features/home/components/analytics-growth-section";
import { ChainManagementSection } from "../features/home/components/chain-management-section";
import { ChallengesSection } from "../features/home/components/challenges-section";
import { CompletePlatformSection } from "../features/home/components/complete-platform-section";
import { FaqSection } from "../features/home/components/faq-section";
import { FeatureDifferenceSection } from "../features/home/components/feature-difference-section";
import { FinalCtaSection } from "../features/home/components/final-cta-section";
import { IntelligentOrdersSection } from "../features/home/components/intelligent-orders-section";
import { LandingShell } from "../features/home/components/landing-shell";
import { MarginComparisonSection } from "../features/home/components/margin-comparison-section";
import { PricingSection } from "../features/home/components/pricing-section";

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
    expect(markup).toContain("gestione-ordini");
    expect(markup).toContain("GESTIONE CATENE");
    expect(markup).toContain("PREZZI SEMPLICI");
    expect(markup).toContain("Hai domande?");
    expect(markup).toContain("PRONTO A FAR CRESCERE LA TUA PIZZERIA?");
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

  it("renders the seventh intelligent orders section from the supplied dashboard screen", () =>
  {
    const markup = renderToString(createElement(IntelligentOrdersSection));

    expect(markup).toContain("GESTIONE ORDINI INTELLIGENTE");
    expect(markup).toContain("Tutto sotto controllo");
    expect(markup).toContain("ogni ordine al posto giusto");
    expect(markup).toContain("Smistamento automatico");
    expect(markup).toContain("Rush Hours");
    expect(markup).toContain("Ordini in tempo reale");
    expect(markup).toContain("#1258");
    expect(markup).toContain("Pizzeria Bella Napoli");
    expect(markup).toContain("Integrazioni attive");
    expect(markup).toContain("Invio comande automatico");
    expect(markup).toContain("Scopri tutte le funzionalità");
  });

  it("renders the eighth chain management section from the supplied screen", () =>
  {
    const markup = renderToString(createElement(ChainManagementSection));

    expect(markup).toContain("GESTIONE CATENE");
    expect(markup).toContain("Una piattaforma. Tutte le tue pizzerie.");
    expect(markup).toContain("Controllo totale, ovunque tu sia.");
    expect(markup).toContain("Gestione centralizzata");
    expect(markup).toContain("Dati consolidati");
    expect(markup).toContain("Standard e qualità");
    expect(markup).toContain("Pricing e menu coordinati");
    expect(markup).toContain("Ruoli e permessi");
    expect(markup).toContain("Panoramica network");
    expect(markup).toContain("Performance per pizzeria");
    expect(markup).toContain("Mappa pizzerie");
    expect(markup).toContain("Report automatici");
    expect(markup).toContain("Alert intelligenti");
    expect(markup).toContain("Sincronizzazione totale");
    expect(markup).toContain("Gestisci tutte le tue pizzerie");
  });

  it("renders the ninth pricing section from the supplied screen", () =>
  {
    const markup = renderToString(createElement(PricingSection, { onRequestDemo: () => undefined }));

    expect(markup).toContain("PREZZI SEMPLICI");
    expect(markup).toContain("Scegli il piano.");
    expect(markup).toContain("Cresci <span>senza commissioni.</span>");
    expect(markup).toContain("START");
    expect(markup).toContain("49 €");
    expect(markup).toContain("GROW");
    expect(markup).toContain("PIÙ SCELTO");
    expect(markup).toContain("99 €");
    expect(markup).toContain("SCALE");
    expect(markup).toContain("199 €");
    expect(markup).toContain("ENTERPRISE");
    expect(markup).toContain("Su misura");
    expect(markup).toContain("Confronto piani");
    expect(markup).toContain("Trasparenza totale");
    expect(markup).toContain("Risparmi fino al 30%");
    expect(markup).toContain("Prova gratuita di 14 giorni");
  });

  it("renders the FAQ section from the supplied screen", () =>
  {
    const markup = renderToString(createElement(FaqSection));

    expect(markup).toContain("FAQ");
    expect(markup).toContain("Hai domande?");
    expect(markup).toContain("Abbiamo <span>le risposte.</span>");
    expect(markup).toContain("Tutto quello che serve per usare PizzaOS al meglio.");
    expect(markup).toContain("Riders e consegne");
    expect(markup).toContain("Come posso effettuare un ordine con PizzaOS?");
    expect(markup).toContain("Posso ordinare insieme ad amici o familiari?");
    expect(markup).toContain("Come funziona la tessera fedeltà?");
    expect(markup).toContain("I miei dati e i pagamenti sono sicuri?");
    expect(markup).toContain("Serve ancora aiuto?");
    expect(markup).toContain("WhatsApp");
    expect(markup).toContain("Centro assistenza");
    expect(markup).toContain("La piattaforma completa per pizzerie moderne.");
  });

  it("renders the eleventh CTA section from the supplied screen", () =>
  {
    const markup = renderToString(createElement(FinalCtaSection, { onRequestDemo: () => undefined }));

    expect(markup).toContain("PRONTO A FAR CRESCERE LA TUA PIZZERIA?");
    expect(markup).toContain("Inizia oggi.");
    expect(markup).toContain("Trasforma la tua pizzeria.");
    expect(markup).toContain("Più ordini, più clienti, più fatturato");
    expect(markup).toContain("Prova PizzaOS gratis per 14 giorni");
    expect(markup).toContain("Senza impegno. Senza carta di credito.");
    expect(markup).toContain("Inizia la prova gratuita");
    expect(markup).toContain("Prenota una demo personalizzata");
    expect(markup).toContain("Oltre 300 pizzerie già con PizzaOS");
    expect(markup).toContain("Integrato con i migliori partner");
    expect(markup).toContain("4,8 su 5 su Trustpilot");
    expect(markup).toContain("Onboarding rapido");
    expect(markup).toContain("Risultati misurabili");
  });
});
