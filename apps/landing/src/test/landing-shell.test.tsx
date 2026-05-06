import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { AnalyticsGrowthSection } from "../features/home/components/analytics-growth-section";
import { ChainManagementSection } from "../features/home/components/chain-management-section";
import { ChallengesSection } from "../features/home/components/challenges-section";
import { CompletePlatformSection } from "../features/home/components/complete-platform-section";
import { EcosystemSection } from "../features/home/components/ecosystem-section";
import { FaqSection } from "../features/home/components/faq-section";
import { FeatureDifferenceSection } from "../features/home/components/feature-difference-section";
import { FinalCtaSection } from "../features/home/components/final-cta-section";
import { Footer } from "../features/home/components/footer";
import { IntelligentOrdersSection } from "../features/home/components/intelligent-orders-section";
import { LandingShell } from "../features/home/components/landing-shell";
import { MarginComparisonSection } from "../features/home/components/margin-comparison-section";
import { PricingSection } from "../features/home/components/pricing-section";

describe("landing shell", () => {
  it("renders entrance motion wrappers for the landing sections", () => {
    const markup = renderToString(createElement(LandingShell));

    expect(markup.match(/data-motion=/g)).toHaveLength(10);
    expect(markup.match(/data-motion-stagger="true"/g)).toHaveLength(10);
    expect(markup).toContain('data-motion="fade-up"');
    expect(markup).toContain('data-motion="fade-scale"');
    expect(markup).toContain('data-motion-state="hidden"');
    expect(markup).toContain("--motion-delay:80ms");
  });

  it("keeps footer links aligned to the current landing sections", () => {
    const markup = renderToString(
      createElement(Footer, { onRequestDemo: () => undefined }),
    );

    expect(markup).toContain('href="#soluzione-completa"');
    expect(markup).toContain('href="#gestione-ordini"');
    expect(markup).toContain('href="#dati-crescita"');
    expect(markup).toContain('href="#gestione-catene"');
    expect(markup).toContain('href="#ecosistema"');
    expect(markup).toContain('href="#prezzi"');
    expect(markup).toContain('href="#piani"');
    expect(markup).toContain('href="#richiedi-demo"');
    expect(markup).toContain('href="#faq"');
    expect(markup).toContain(
      'href="https://www.iubenda.com/privacy-policy/45209498"',
    );
    expect(markup).toContain(
      'href="https://www.iubenda.com/privacy-policy/45209498/cookie-policy"',
    );
    expect(markup).toContain("iubenda-white iubenda-noiframe iubenda-embed");
    expect(markup).toContain(">App cliente</button>");
    expect(markup).toContain(">Dashboard admin</button>");
    expect(markup).not.toContain('href="/client"');
    expect(markup).not.toContain('href="/admin"');
  });

  it("mounts the primary landing sections", () => {
    const markup = renderToString(createElement(LandingShell));

    expect(markup).toContain("Trasforma la tua");
    expect(markup).toContain("LE SFIDE DI OGNI PIZZERIA");
    expect(markup).toContain("soluzione-completa");
    expect(markup).toContain("Tre modi di gestire una pizzeria.");
    expect(markup).toContain("dati-crescita");
    expect(markup).toContain("gestione-ordini");
    expect(markup).toContain("GESTIONE CATENE");
    expect(markup).toContain("PREZZI SEMPLICI");
    expect(markup).toContain("Serve ancora aiuto");
    expect(markup).toContain("Ecosistema");
    expect(markup).toContain("Apri la demo");
    expect(markup).toContain("%2Fimages%2Flogo-light.png");
    expect(markup).toContain("%2Fimages%2Flogo.png");
    expect(markup).not.toContain("hero-composite");
  });

  it("renders the challenges section with all demo problem cards", () => {
    const markup = renderToString(createElement(ChallengesSection));

    expect(markup).toContain("Ti riconosci in");
    expect(markup).toContain("Troppe chiamate, troppo caos");
    expect(markup).toContain("Commissioni che mangiano i profitti");
    expect(markup).toContain("Clienti che ordinano una volta e spariscono");
    expect(markup).toContain("Consegne disordinate e zero controllo");
    expect(markup).toContain("Menu statico");
    expect(markup).toContain("poco flessibile");
    expect(markup).toContain("Nessun dato");
    expect(markup).toContain("nessuna crescita");
  });

  it("renders the complete platform section as coded landing content", () => {
    const markup = renderToString(createElement(CompletePlatformSection));

    expect(markup).toContain("LA SOLUZIONE COMPLETA");
    expect(markup).toContain("Tutto ciò che ti serve");
    expect(markup).toContain("Delivery Control");
    expect(markup).toContain("Growth Engine");
    expect(markup).toContain("Lista allergeni e impasti");
    expect(markup).toContain("Pagamenti online sicuri");
    expect(markup).toContain("Assegnazione rider automatica");
    expect(markup).toContain("Campagne clienti ricorrenti");
    expect(markup).toContain("riordina entro 30 giorni");
    expect(markup).toContain("Secondo ordine");
    expect(markup).toContain("Zero commissioni");
  });

  it("renders the fourth feature difference section from the supplied screen", () => {
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

  it("renders the fifth margin comparison section from the supplied screen", () => {
    const markup = renderToString(createElement(MarginComparisonSection));

    expect(markup).toContain("Tre modi di gestire una pizzeria.");
    expect(markup).toContain("massimizza davvero il margine.");
    expect(markup).toContain("Marketplace");
    expect(markup).toContain("Sito semplice");
    expect(markup).toContain("Il sistema che massimizza il profitto");
    expect(markup).toContain("Margine su ogni ordine");
    expect(markup).toContain("Commissioni 15-30%");
    expect(markup).toContain("Gestione consegne");
    expect(markup).toContain("Cliente e dati");
    expect(markup).toContain("Marketing e fidelizzazione");
    expect(markup).toContain("Riordino e frequenza");
    expect(markup).toContain("Capacità di crescita");
    expect(markup).toContain("Effetto cumulativo");
    expect(markup).toContain("Più consegne");
    expect(markup).toContain("Meno benzina");
    expect(markup).toContain("Più clienti che tornano");
    expect(markup).toContain("Dati e insight");
    expect(markup).toContain("Più profitto finale");
  });

  it("renders the sixth analytics growth section from the supplied screen", () => {
    const markup = renderToString(
      createElement(AnalyticsGrowthSection, {
        onRequestDemo: () => undefined,
      }),
    );

    expect(markup).toContain("DATI, ANALISI, CRESCITA");
    expect(markup).toContain("Dati che contano.");
    expect(markup).toContain("Decisioni che <span>fanno crescere.</span>");
    expect(markup).toContain("Analytics avanzate");
    expect(markup).toContain("Previsioni di vendita");
    expect(markup).toContain("Panoramica");
    expect(markup).toContain("%2Fimages%2Flogo.png");
    expect(markup).toContain("pizza demo");
    expect(markup).not.toContain("Suggerimento AI");
    expect(markup).toContain("Fatturato");
    expect(markup).toContain("Vendite per categoria");
    expect(markup).toContain("Insight AI per il tuo business");
    expect(markup).toContain("Hai troppo impasto Kamut");
    expect(markup).toContain("Questo cliente torna ogni venerdì");
    expect(markup).toContain("Prova la dashboard");
  });

  it("renders the seventh intelligent orders section from the supplied dashboard screen", () => {
    const markup = renderToString(createElement(IntelligentOrdersSection));

    expect(markup).toContain("Tutto sotto controllo");
    expect(markup).toContain("ogni ordine al posto giusto");
    expect(markup).toContain("Smistamento automatico");
    expect(markup).toContain(
      "Al tavolo &gt; Asporto &gt; Delivery.<br/>Tu decidi",
    );
    expect(markup).toContain("Ordini in tempo reale");
    expect(markup).toContain("#1258");
    expect(markup).toContain("%2Fimages%2Flogo.png");
    expect(markup).toContain("pizza demo");
    expect(markup).toContain("Non possiedi riders?");
    expect(markup).toContain("non vuole gestire una flotta di");
    expect(markup).toContain("integrarsi con Deliveroo");
    expect(markup).toContain("%2Fimages%2Fdeliveroo.png");
    expect(markup).toContain("Invio comande automatico");
    expect(markup).toContain("Scopri tutte le funzionalità");
  });

  it("renders the Deliveroo partner as an image in the rider-free delivery message", () => {
    const markup = renderToString(createElement(IntelligentOrdersSection));

    expect(markup).not.toContain("Integrazioni attive");
    expect(markup).toContain("%2Fimages%2Fdeliveroo.png");
    expect(markup).toContain('alt="Deliveroo"');
    expect(markup).not.toContain(">deliveroo</strong>");
  });

  it("renders the eighth chain management section from the supplied screen", () => {
    const markup = renderToString(createElement(ChainManagementSection));

    expect(markup).toContain("GESTIONE CATENE");
    expect(markup).toContain("Una piattaforma.");
    expect(markup).toContain("Tutte le tue pizzerie.");
    expect(markup).toContain("Controllo totale,");
    expect(markup).toContain("ovunque tu sia.");
    expect(markup).toContain("Network in tempo reale");
    expect(markup).toContain("Vista unica su tutta la catena");
    expect(markup).toContain("300+");
    expect(markup).toContain("Gestione centralizzata");
    expect(markup).toContain("Dati consolidati");
    expect(markup).toContain("Standard e qualità");
    expect(markup).toContain("Pricing e menu coordinati");
    expect(markup).toContain("Ruoli e permessi");
    expect(markup).toContain("%2Fimages%2Flogo.png");
    expect(markup).toContain("Panoramica network");
    expect(markup).toContain("Performance per pizzeria");
    expect(markup).toContain("Mappa pizzerie");
    expect(markup).toContain("%2Fimages%2Fmap.png");
    expect(markup).toContain('alt="Mappa delle pizzerie PizzaOS"');
    expect(markup).toContain("Report automatici");
    expect(markup).toContain("Alert intelligenti");
    expect(markup).toContain("Sincronizzazione totale");
  });

  it("renders the ninth pricing section from the supplied screen", () => {
    const markup = renderToString(
      createElement(PricingSection, { onRequestDemo: () => undefined }),
    );

    expect(markup).toContain("PREZZI SEMPLICI");
    expect(markup).toContain("Scegli il piano.");
    expect(markup).toContain("Cresci <span>senza commissioni.</span>");
    expect(markup).toContain("START");
    expect(markup).toContain("49 €");
    expect(markup).toContain("GROW");
    expect(markup).toContain("CONSIGLIATO");
    expect(markup).toContain("99 €");
    expect(markup).toContain("SCALE");
    expect(markup).toContain("199 €");
    expect(markup).toContain("ENTERPRISE");
    expect(markup).toContain("Su misura");
    expect(markup).toContain("Confronto piani");
    expect(markup).toContain("Trasparenza totale");
    expect(markup).toContain("Risparmi fino al 30%");
    expect(markup).toContain("Prova gratuita di 60 giorni");
  });

  it("renders the ecosystem section with the current landing visual language", () => {
    const markup = renderToString(createElement(EcosystemSection));

    expect(markup).toContain("ECOSISTEMA");
    expect(markup).toContain(
      "Tutto il sistema operativo della tua pizzeria",
    );
    expect(markup).toContain(
      "Dagli ordini online alla fidelizzazione, dal magazzino alla consegna",
    );
    expect(markup).toContain("Filtra funzionalità PizzaOS");
    expect(markup).toContain("Live nella demo");
    expect(markup).toContain("Prossimamente");
    expect(markup).toContain("In roadmap");
    expect(markup).toContain("Vedi tutte le funzioni");
    expect(markup).toContain("+8 funzioni incluse");
    expect(markup).toContain("Ordini digitali");
    expect(markup).toContain("Menu digitale personalizzato");
    expect(markup).toContain("Pizza builder");
    expect(markup).toContain("Prezzo aggiornato in tempo reale");
    expect(markup).toContain("Ordine di gruppo");
    expect(markup).toContain("Split conto tra amici");
    expect(markup).toContain("Analytics AI");
    expect(markup).toContain("Transactional clustering");
    expect(markup).toContain("Marketing automation");
    expect(markup).toContain("Cliente inattivo → sconto automatico");
    expect(markup).toContain("Loyalty &amp; abbonamenti");
    expect(markup).toContain("Delivery &amp; tracciamento");
    expect(markup).toContain("Gestione ristorante");
    expect(markup).toContain("Gestione magazzino");
    expect(markup).toContain("Pagamenti &amp; integrazioni");
    expect(markup).toContain("Brand &amp; canali proprietari");
  });

  it("renders the FAQ section from the supplied screen", () => {
    const markup = renderToString(createElement(FaqSection));

    expect(markup).toContain('id="faq"');
    expect(markup).toContain("Serve ancora aiuto o sei interessato a PizzaOS?");
    expect(markup).toContain("Il nostro team è sempre disponibile.");
    expect(markup).toContain("Telefono e WhatsApp");
    expect(markup).toContain("+39 351 744 4749");
    expect(markup).toContain("WhatsApp");
    expect(markup).toContain("Email");
    expect(markup).toContain("info@kremisi.com");
    expect(markup).toContain("%2Fimages%2Flogo.png");
    expect(markup).toContain("La piattaforma completa per pizzerie moderne.");
  });

  it("renders the eleventh CTA section from the supplied screen", () => {
    const markup = renderToString(
      createElement(FinalCtaSection, { onRequestDemo: () => undefined }),
    );

    expect(markup).toContain("PRONTO A FAR CRESCERE LA TUA PIZZERIA?");
    expect(markup).toContain("Inizia oggi.");
    expect(markup).toContain("Trasforma la tua pizzeria.");
    expect(markup).toContain("Più ordini, più clienti, più fatturato");
    expect(markup).toContain("Prova PizzaOS gratis per 14 giorni");
    expect(markup).toContain("Senza impegno. Senza carta di credito.");
    expect(markup).toContain("Inizia la prova gratuita");
    expect(markup).toContain("Prenota una demo personalizzata");
    expect(markup).toContain("Onboarding rapido");
    expect(markup).toContain("Supporto dedicato");
    expect(markup).toContain("Formazione inclusa");
    expect(markup).toContain("Risultati misurabili");
  });
});
