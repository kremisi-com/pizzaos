import { getThemeClass, getThemeStyleVariables } from "@pizzaos/brand";
import type { Metadata } from "next";
import type { CSSProperties, ReactElement, ReactNode } from "react";
import "./globals.css";
import { GoogleTag } from "./google-tag";
import { MicrosoftClarity } from "./microsoft-clarity";

export const metadata: Metadata = {
  title: "PizzaOS Admin",
  description: "Superficie admin del POC PizzaOS"
};

interface RootLayoutProps
{
  readonly children: ReactNode;
}

export default function RootLayout(props: RootLayoutProps): ReactElement
{
  const surface = "admin";

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
        <GoogleTag />
        <MicrosoftClarity />
      </body>
    </html>
  );
}
