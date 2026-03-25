import { getThemeClass, getThemeStyleVariables } from "@pizzaos/brand";
import type { Metadata } from "next";
import type { CSSProperties, ReactElement, ReactNode } from "react";
import "./globals.css";

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
      <body
        className={getThemeClass(surface)}
        style={getThemeStyleVariables(surface) as CSSProperties}
      >
        {props.children}
      </body>
    </html>
  );
}
