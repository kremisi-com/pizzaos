import { getThemeClass } from "@pizzaos/brand";
import { createAdminSeed } from "@pizzaos/mock-data";
import { ShellCard } from "@pizzaos/ui";
import type { ReactElement } from "react";

export function AdminShell(): ReactElement
{
  const seed = createAdminSeed();

  return (
    <main className={getThemeClass(seed.surface)}>
      <h1>{seed.title}</h1>
      <p>{seed.subtitle}</p>
      <ShellCard title="Contesto operativo">
        <p>Dashboard desktop con spazio per ordini, analytics e gestione negozio.</p>
      </ShellCard>
    </main>
  );
}
