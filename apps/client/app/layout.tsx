import { getThemeClass, getThemeStyleVariables } from "@pizzaos/brand";
import { BottomNav } from "@/features/navigation/BottomNav";
import type { Metadata } from "next";
import type { CSSProperties, ReactElement, ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "PizzaOS Client",
  description: "Superficie client del POC PizzaOS"
};

interface RootLayoutProps
{
  readonly children: ReactNode;
}

export default function RootLayout(props: RootLayoutProps): ReactElement
{
  const surface = "client";

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
        <main style={{ flex: 1, paddingBottom: "100px" }}>
          {props.children}
        </main>
        <BottomNav />
      </body>
    </html>
  );
}
