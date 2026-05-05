"use client";

import {
  loadDemoState,
  type LandingSeed,
} from "@pizzaos/mock-data";
import { useState, type ReactElement } from "react";
import {
  DEFAULT_DEMO_SUCCESS_LINKS,
  type DemoSuccessLinks,
} from "../demo-links";
import { AnalyticsGrowthSection } from "./analytics-growth-section";
import { DemoRequestModal } from "./demo-request-modal";
import { ChainManagementSection } from "./chain-management-section";
import { CompletePlatformSection } from "./complete-platform-section";
import { EcosystemSection } from "./ecosystem-section";
import { FaqSection } from "./faq-section";
import { Footer } from "./footer";
import { HeroSection } from "./hero-section";
import { IntelligentOrdersSection } from "./intelligent-orders-section";
import { ChallengesSection } from "./challenges-section";
import { MarginComparisonSection } from "./margin-comparison-section";
import { Navbar } from "./navbar";
import { PricingSection } from "./pricing-section";

const APP_ID = "landing" as const;

interface LandingShellProps {
  readonly demoLinks?: DemoSuccessLinks;
}

function resolveStorage(): Storage | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }

  return window.localStorage;
}

export function LandingShell({
  demoLinks = DEFAULT_DEMO_SUCCESS_LINKS,
}: LandingShellProps): ReactElement {
  const [seed] = useState<LandingSeed>(() =>
    loadDemoState(APP_ID, { storage: resolveStorage() }),
  );
  const [isModalOpen, setIsModalOpen] = useState(false);

  void seed; /* Used to trigger hydration from mock-data — future sections can consume seed data */

  function handleOpenModal(): void {
    setIsModalOpen(true);
  }

  function handleCloseModal(): void {
    setIsModalOpen(false);
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

        {/* Margin comparison section */}
        <MarginComparisonSection />

        {/* Analytics growth visual section */}
        <AnalyticsGrowthSection />

        {/* Intelligent orders visual section */}
        <IntelligentOrdersSection />

        {/* Ordering section */}

        {/* Marketing section */}

        {/* Analytics section */}

        {/* Chain management section */}
        <ChainManagementSection />

        {/* Pricing section */}
        <PricingSection onRequestDemo={handleOpenModal} />

        {/* Operations section */}

        {/* Ecosystem */}
        <EcosystemSection />

        {/* FAQ */}
        <FaqSection />
      </main>

      {/* Footer */}
      <Footer />

      {/* Demo request modal */}
      <DemoRequestModal
        demoLinks={demoLinks}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />
    </>
  );
}
