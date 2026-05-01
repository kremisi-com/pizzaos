"use client";

import { loadDemoState, resetDemoState, type LandingSeed } from "@pizzaos/mock-data";
import { useState, type ReactElement } from "react";
import { AnalyticsGrowthSection } from "./analytics-growth-section";
import { DemoRequestModal } from "./demo-request-modal";
import { ChainManagementSection } from "./chain-management-section";
import { CompletePlatformSection } from "./complete-platform-section";
import { DifferentiationSection } from "./differentiation-section";
import { EcosystemSection } from "./ecosystem-section";
import { FaqSection } from "./faq-section";
import { FeatureDifferenceSection } from "./feature-difference-section";
import { FeatureSection } from "./feature-section";
import { FinalCtaSection } from "./final-cta-section";
import { Footer } from "./footer";
import { HeroSection } from "./hero-section";
import { IntelligentOrdersSection } from "./intelligent-orders-section";
import { ChallengesSection } from "./challenges-section";
import { MarginComparisonSection } from "./margin-comparison-section";
import { Navbar } from "./navbar";
import { PricingSection } from "./pricing-section";
import { StatsSection } from "./stats-section";

const APP_ID = "landing" as const;

const CLIENT_DEMO_URL = "/client" as const;
const ADMIN_DEMO_URL = "/admin" as const;

function resolveStorage(): Storage | undefined
{
  if (typeof window === "undefined")
  {
    return undefined;
  }

  return window.localStorage;
}

const ORDERING_FEATURES = [
  { text: "Personalizzazione impasto, dimensione e ingredienti" },
  { text: "Menù dinamico con disponibilità in tempo reale" },
  { text: "Riordino intelligente con un tap" },
  { text: "Ordine di gruppo collaborativo (prossimamente)" }
] as const;

const MARKETING_FEATURES = [
  { text: "Campagna di riattivazione automatica per clienti inattivi" },
  { text: "Sconto compleanno personalizzato con trigger automatico" },
  { text: "Upsell post-ordine con suggerimenti contestuali" },
  { text: "Programma fedeltà a punti e card mensili" }
] as const;

const ANALYTICS_FEATURES = [
  { text: "Dashboard fatturato con variazioni in tempo reale" },
  { text: "Previsione della domanda per giorno e fascia oraria" },
  { text: "Insight AI su pricing, prodotti e conversioni" },
  { text: "Heatmap ordini e analisi dei prodotti più cliccati" }
] as const;

const DELIVERY_FEATURES = [
  { text: "Tracciamento in tempo reale per il cliente" },
  { text: "Gestione rider integrata con ottimizzazione percorsi" },
  { text: "Slot di consegna configurabili per ogni turno" },
  { text: "Notifiche automatiche a ogni cambio di stato" }
] as const;

const OPERATIONS_FEATURES = [
  { text: "Coda ordini con priorità configurabile" },
  { text: "Aggiornamento stato in tempo reale via interfaccia cucina" },
  { text: "Gestione inventario collegata al menù" },
  { text: "Multi-sede con switch istantaneo tra locali" }
] as const;

export function LandingShell(): ReactElement
{
  const [seed, setSeed] = useState<LandingSeed>(() => loadDemoState(APP_ID, { storage: resolveStorage() }));
  const [isModalOpen, setIsModalOpen] = useState(false);

  void seed; /* Used to trigger hydration from mock-data — future sections can consume seed data */

  function handleOpenModal(): void
  {
    setIsModalOpen(true);
  }

  function handleCloseModal(): void
  {
    setIsModalOpen(false);
  }

  function handleResetDemo(): void
  {
    const resetSeed = resetDemoState(APP_ID, { storage: resolveStorage() });

    setSeed(resetSeed);
  }

  return (
    <>
      {/* Navigation */}
      <Navbar onRequestDemo={handleOpenModal} />

      {/* Main content */}
      <main id="main-content">

        {/* Hero */}
        <HeroSection onRequestDemo={handleOpenModal} />

        {/* Challenges Section */}
        <ChallengesSection />

        {/* Complete platform visual section */}
        <CompletePlatformSection />

        {/* Feature difference visual section */}
        <FeatureDifferenceSection />

        {/* Margin comparison section */}
        <MarginComparisonSection onRequestDemo={handleOpenModal} />

        {/* Analytics growth visual section */}
        <AnalyticsGrowthSection />

        {/* Intelligent orders visual section */}
        <IntelligentOrdersSection />

        {/* Stats strip */}
        <StatsSection />

        {/* Ordering section */}
        <FeatureSection
          id="ordinazione"
          eyebrow="Ordinazione avanzata"
          title="Il menù digitale che i tuoi clienti ameranno."
          description="Ogni dettaglio personalizzabile, ogni scelta visibile in tempo reale. PizzaOS trasforma l'ordine in un'esperienza premium che invoglia a tornare."
          features={ORDERING_FEATURES}
          ctaLabel="Prova il menù"
          ctaHref={CLIENT_DEMO_URL}
          visual="ordering"
          variant="white"
        />

        {/* Marketing section */}
        <FeatureSection
          id="marketing"
          eyebrow="Marketing automation"
          title="Fai tornare i clienti. In automatico."
          description="PizzaOS invia il messaggio giusto, al momento giusto, alla persona giusta — senza che tu debba alzare un dito. Più ritorni, più fattura."
          features={MARKETING_FEATURES}
          ctaLabel="Guarda le campagne"
          ctaHref={ADMIN_DEMO_URL}
          visual="marketing"
          reversed
          variant="beige"
        />

        {/* Analytics section */}
        <FeatureSection
          id="analytics"
          eyebrow="Analytics & AI"
          title="Conosci la tua pizzeria come non hai mai fatto."
          description="Dati in tempo reale, previsioni intelligenti e insight azionabili. L'AI di PizzaOS non ti sommerge di numeri: ti dice cosa fare."
          features={ANALYTICS_FEATURES}
          ctaLabel="Esplora la dashboard"
          ctaHref={ADMIN_DEMO_URL}
          visual="analytics"
          variant="white"
        />

        {/* Chain management section */}
        <ChainManagementSection />

        {/* Pricing section */}
        <PricingSection onRequestDemo={handleOpenModal} />

        {/* Delivery section */}
        <FeatureSection
          id="delivery"
          eyebrow="Delivery & tracciamento"
          title="La consegna che il cliente si aspetta."
          description="Zero telefonate al cliente, zero ansia. Il tracciamento in tempo reale e le notifiche automatiche tengono tutti tranquilli — e aumentano le recensioni positive."
          features={DELIVERY_FEATURES}
          ctaLabel="Prova l'app cliente"
          ctaHref={CLIENT_DEMO_URL}
          visual="delivery"
          reversed
          variant="beige"
        />

        {/* Operations section */}
        <FeatureSection
          id="operazioni"
          eyebrow="Operazioni"
          title="La cucina sotto controllo. Sempre."
          description="Dalla coda ordini alla gestione del magazzino: PizzaOS porta ordine (letteralmente) nel tuo locale, anche nelle serate più intense."
          features={OPERATIONS_FEATURES}
          ctaLabel="Vedi la dashboard operativa"
          ctaHref={ADMIN_DEMO_URL}
          visual="operations"
          variant="white"
        />

        {/* Ecosystem */}
        <EcosystemSection />

        {/* Differentiation */}
        <DifferentiationSection />

        {/* FAQ */}
        <FaqSection />

        {/* Final CTA */}
        <FinalCtaSection onRequestDemo={handleOpenModal} />

      </main>

      {/* Footer */}
      <Footer onResetDemo={handleResetDemo} />

      {/* Demo request modal */}
      <DemoRequestModal isOpen={isModalOpen} onClose={handleCloseModal} />
    </>
  );
}
