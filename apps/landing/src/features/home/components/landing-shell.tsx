import { getThemeClass } from "@pizzaos/brand";
import { createLandingSeed } from "@pizzaos/mock-data";
import { ShellCard } from "@pizzaos/ui";
import type { ReactElement } from "react";

export function LandingShell(): ReactElement
{
  const seed = createLandingSeed();

  return (
    <main className={getThemeClass(seed.surface)}>
      <h1>{seed.title}</h1>
      <p>{seed.subtitle}</p>
      <ShellCard title="Superficie">
        <p>Landing introduttiva pronta per i prossimi step del POC.</p>
      </ShellCard>
    </main>
  );
}
