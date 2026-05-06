import { LandingShell } from "@/features/home/components/landing-shell";
import {
  shouldShowChainManagementSection,
  type LandingSearchParams,
} from "@/features/home/chain-section-visibility";
import { createDemoSuccessLinks } from "@/features/home/demo-links";
import type { ReactElement } from "react";

interface LandingPageProps {
  readonly searchParams?: Promise<LandingSearchParams>;
}

export default async function LandingPage(
  props: LandingPageProps,
): Promise<ReactElement>
{
  const searchParams = await props.searchParams;
  const demoLinks = createDemoSuccessLinks({
    clientHref: process.env["LINK_CLIENT"],
    adminHref: process.env["LINK_ADMIN"],
  });

  return (
    <LandingShell
      demoLinks={demoLinks}
      showChainManagementSection={shouldShowChainManagementSection(
        searchParams,
      )}
    />
  );
}
