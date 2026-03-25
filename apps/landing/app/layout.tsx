import { getThemeClass, getThemeStyleVariables } from "@pizzaos/brand";
import type { Metadata } from "next";
import type { CSSProperties, ReactElement, ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "PizzaOS Landing",
  description: "Superficie landing del POC PizzaOS"
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
      <body
        className={getThemeClass(surface)}
        style={getThemeStyleVariables(surface) as CSSProperties}
      >
        {props.children}
      </body>
    </html>
  );
}
