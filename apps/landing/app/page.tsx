import { LandingShell } from "@/features/home/components/landing-shell";
import { createDemoSuccessLinks } from "@/features/home/demo-links";
import type { ReactElement } from "react";

export default function LandingPage(): ReactElement
{
  const demoLinks = createDemoSuccessLinks({
    clientHref: process.env["LINK_CLIENT"],
    adminHref: process.env["LINK_ADMIN"],
  });

  return <LandingShell demoLinks={demoLinks} />;
}
