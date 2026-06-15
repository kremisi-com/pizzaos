import { getThemeClass, getThemeStyleVariables } from "@pizzaos/brand";
import { BottomNav } from "../src/features/navigation/BottomNav";
import type { Metadata } from "next";
import type { CSSProperties, ReactElement, ReactNode } from "react";
import "./globals.css";
import styles from "./layout.module.css";

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
        className={`${getThemeClass(surface)} ${styles.body}`}
        style={{
          ...(getThemeStyleVariables(surface) as CSSProperties)
        }}
      >
        <div className={styles.clientFrame} data-testid="client-phone-frame">
          <main className={styles.content}>
            {props.children}
          </main>
          <BottomNav />
        </div>
      </body>
    </html>
  );
}
