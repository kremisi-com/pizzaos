import { getThemeClass, getThemeStyleVariables } from "@pizzaos/brand";
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
        style={getThemeStyleVariables(surface) as CSSProperties}
      >
        {props.children}
      </body>
    </html>
  );
}
