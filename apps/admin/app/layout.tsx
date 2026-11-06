import { getThemeClass, getThemeStyleVariables } from "@pizzaos/brand";
import type { Metadata } from "next";
import type { CSSProperties, ReactElement, ReactNode } from "react";
import "./globals.css";
import { GoogleTag } from "./google-tag";
import { MicrosoftClarity } from "./microsoft-clarity";
import { cookies } from "next/headers";
import { getExperienceMode } from "@/composition/session-mode";
import { SignOutButton } from "@/features/identity/components/sign-in-screen";
import demoStyles from "@/composition/demo-banner.module.css";
import { getRequestOperationalHost } from "@/composition/operational-page";

export async function generateMetadata(): Promise<Metadata> {
  const host = await getRequestOperationalHost();
  return host?.surface === "rider"
    ? { title: "PizzaOS Rider", description: "Gestisci le tue consegne con PizzaOS" }
    : { title: "PizzaOS Admin", description: "Gestisci il tuo ristorante con PizzaOS" };
}

interface RootLayoutProps
{
  readonly children: ReactNode;
}

export default async function RootLayout(props: RootLayoutProps): Promise<ReactElement>
{
  const surface = "admin";
  const host = await getRequestOperationalHost();
  const demo = host?.surface === "admin" && await getExperienceMode((await cookies()).toString(), host.origin) === "demo";

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
        {demo && <aside className={demoStyles.banner} aria-label="Modalità demo"><p><strong>Modalità demo</strong> · Dati fittizi e operazioni simulate</p><SignOutButton /></aside>}
        {props.children}
        <GoogleTag />
        <MicrosoftClarity />
      </body>
    </html>
  );
}
