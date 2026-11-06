import { getThemeClass, getThemeStyleVariables } from "@pizzaos/brand";
import { BottomNav } from "@/features/navigation/BottomNav";
import { ClientApiProvider } from "@/composition/api/client-api-provider";
import type { Metadata } from "next";
import type { CSSProperties, ReactElement, ReactNode } from "react";
import "./globals.css";
import { GoogleTag } from "./google-tag";
import { MicrosoftClarity } from "./microsoft-clarity";
import { cookies } from "next/headers";
import { getExperienceMode } from "@/composition/session-mode";
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
  const demo = await getExperienceMode((await cookies()).toString()) === "demo";

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
          {demo ? <ClientApiProvider>{props.children}</ClientApiProvider> : props.children}
        </main>
        <BottomNav live={!demo} />
        <GoogleTag />
        <MicrosoftClarity />
      </body>
    </html>
  );
}
