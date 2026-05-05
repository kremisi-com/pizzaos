import { getThemeClass, getThemeStyleVariables } from "@pizzaos/brand";
import type { Metadata, Viewport } from "next";
import type { CSSProperties, ReactElement, ReactNode } from "react";
import "./globals.css";
import { landingMetadata, landingViewport } from "./seo";

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
      </head>
      <body
        className={getThemeClass(surface)}
        style={getThemeStyleVariables(surface) as CSSProperties}
      >
        {props.children}
      </body>
    </html>
  );
}
