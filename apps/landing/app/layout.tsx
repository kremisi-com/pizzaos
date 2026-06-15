import { getThemeClass, getThemeStyleVariables } from "@pizzaos/brand";
import {
  IUBENDA_SCRIPT_SRC,
  IUBENDA_WIDGET_SCRIPT_SRC,
} from "@/features/home/policy-links";
import type { Metadata, Viewport } from "next";
import Script from "next/script";
import type { CSSProperties, ReactElement, ReactNode } from "react";
import "./globals.css";
import { GoogleTag } from "./google-tag";
import { MicrosoftClarity } from "./microsoft-clarity";
import {
  createLandingJsonLd,
  landingMetadata,
  landingViewport,
} from "./seo";

export const metadata: Metadata = landingMetadata;
export const viewport: Viewport = landingViewport;

interface RootLayoutProps
{
  readonly children: ReactNode;
}

export default function RootLayout(props: RootLayoutProps): ReactElement
{
  const surface = "landing";

  return (
    <html lang="it">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(createLandingJsonLd()),
          }}
        />
      </head>
      <body
        className={getThemeClass(surface)}
        style={getThemeStyleVariables(surface) as CSSProperties}
      >
        {props.children}
        <GoogleTag />
        <MicrosoftClarity />
        <Script
          id="iubenda-widget"
          src={IUBENDA_WIDGET_SCRIPT_SRC}
          strategy="afterInteractive"
        />
        <Script
          id="iubenda-embed"
          src={IUBENDA_SCRIPT_SRC}
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
