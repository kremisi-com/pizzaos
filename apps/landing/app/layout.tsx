import { getThemeClass, getThemeStyleVariables } from "@pizzaos/brand";
import type { Metadata } from "next";
import type { CSSProperties, ReactElement, ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "PizzaOS – Il software più elegante per pizzerie serie",
  description:
    "Ordini online, marketing automatico, analytics AI e gestione operativa in un unico sistema. PizzaOS trasforma ogni pizzeria in un brand digitale di successo.",
  keywords: ["pizzeria software", "ordini online pizzeria", "gestione pizzeria", "food tech", "POS pizzeria"],
  authors: [{ name: "PizzaOS" }],
  openGraph: {
    title: "PizzaOS – Il software più elegante per pizzerie serie",
    description: "Ordini, marketing, analytics e operazioni. Tutto in uno.",
    type: "website",
    locale: "it_IT"
  },
  robots: {
    index: true,
    follow: true
  }
};

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
