import { getThemeClass, getThemeStyleVariables } from "@pizzaos/brand";
import { BottomNav } from "@/features/navigation/BottomNav";
import { ClientApiProvider } from "@/composition/api/client-api-provider";
import type { Metadata } from "next";
import type { CSSProperties, ReactElement, ReactNode } from "react";
import "./globals.css";
import { GoogleTag } from "./google-tag";
import { MicrosoftClarity } from "./microsoft-clarity";
import { cookies, headers } from "next/headers";
import { getExperienceMode } from "@/composition/session-mode";
import { checkOrderingSite, resolveClientHost } from "@/composition/ordering-host";
import { SignOutButton } from "@/features/identity/components/sign-in-screen";
import demoStyles from "@/composition/demo-banner.module.css";

export const metadata: Metadata = {
  title: "PizzaOS Client",
  description: "Ordina con PizzaOS"
};

interface RootLayoutProps
{
  readonly children: ReactNode;
}

export default async function RootLayout(props: RootLayoutProps): Promise<ReactElement>
{
  const surface = "client";
  const host = await resolveClientHost((await headers()).get("host"));
  const site = host?.storefront ? host.site ?? await checkOrderingSite(host.origin)
    : !host && process.env.PIZZAOS_ORDERING_DOMAIN ? "unassigned" : "ready";
  const demo = site === "ready" && !host?.storefront && await getExperienceMode((await cookies()).toString()) === "demo";

  return (
    <html lang="it">
      <body
        className={getThemeClass(surface)}
        style={{
          ...(getThemeStyleVariables(surface) as CSSProperties),
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column"
        }}
      >
        {demo && <aside className={demoStyles.banner} aria-label="Modalità demo"><p><strong>Modalità demo</strong> · Dati fittizi e pagamenti simulati</p><SignOutButton /></aside>}
        <main style={{ flex: 1, paddingBottom: "100px" }}>
          {site === "ready" ? (demo ? <ClientApiProvider>{props.children}</ClientApiProvider> : props.children) :
            <section style={{ maxWidth: "36rem", margin: "4rem auto", padding: "0 1.5rem" }}>
              <h1>{site === "unassigned" ? "Sito ordini non configurato" : "Sito ordini temporaneamente non disponibile"}</h1>
              <p>{site === "unassigned" ? "Verifica l’indirizzo con il ristorante." : "Riprova tra qualche minuto."}</p>
            </section>}
        </main>
        {site === "ready" && <BottomNav live={!demo} />}
        <GoogleTag />
        <MicrosoftClarity />
      </body>
    </html>
  );
}
