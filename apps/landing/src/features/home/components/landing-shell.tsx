"use client";

import { loadDemoState, type LandingSeed } from "@pizzaos/mock-data";
import { useState, type ReactElement } from "react";
import {
  DEFAULT_DEMO_SUCCESS_LINKS,
  type DemoSuccessLinks,
} from "../demo-links";
import type { DemoRequestIntent } from "../demo-request-mail";
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
import { MotionReveal } from "./motion-reveal";
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
  const [requestIntent, setRequestIntent] =
    useState<DemoRequestIntent>("demo-access");

  void seed; /* Used to trigger hydration from mock-data — future sections can consume seed data */

  function handleOpenModal(intent: DemoRequestIntent = "demo-access"): void {
    setRequestIntent(intent);
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
        <MotionReveal delay={80} stagger variant="fade-up">
          <HeroSection onRequestDemo={handleOpenModal} />
        </MotionReveal>

        {/* Challenges Section */}
        <MotionReveal delay={40} stagger variant="fade-up">
          <ChallengesSection />
        </MotionReveal>

        {/* Complete platform visual section */}
        <MotionReveal delay={60} stagger variant="fade-up">
          <CompletePlatformSection />
        </MotionReveal>

        {/* Margin comparison section */}
        <MotionReveal delay={60} stagger variant="fade-scale">
          <MarginComparisonSection />
        </MotionReveal>

        {/* Analytics growth visual section */}
        <MotionReveal delay={60} stagger variant="fade-up">
          <AnalyticsGrowthSection onRequestDemo={handleOpenModal} />
        </MotionReveal>

        {/* Intelligent orders visual section */}
        <MotionReveal delay={60} stagger variant="fade-up">
          <IntelligentOrdersSection />
        </MotionReveal>

        {/* Ordering section */}

        {/* Marketing section */}

        {/* Analytics section */}

        {/* Chain management section */}
        <MotionReveal delay={60} stagger variant="fade-up">
          <ChainManagementSection />
        </MotionReveal>

        {/* Pricing section */}
        <MotionReveal delay={60} stagger variant="fade-up">
          <PricingSection onRequestDemo={handleOpenModal} />
        </MotionReveal>

        {/* Operations section */}

        {/* Ecosystem */}
        <MotionReveal delay={60} stagger variant="fade-up">
          <EcosystemSection />
        </MotionReveal>

        {/* FAQ */}
        <MotionReveal delay={60} stagger variant="fade-up">
          <FaqSection />
        </MotionReveal>
      </main>

      {/* Footer */}
      <Footer onRequestDemo={handleOpenModal} />

      {/* Demo request modal */}
      <DemoRequestModal
        demoLinks={demoLinks}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        requestIntent={requestIntent}
      />
    </>
  );
}
