import { getThemeClass } from "@pizzaos/brand";
import { createClientSeed } from "@pizzaos/mock-data";
import { ShellCard } from "@pizzaos/ui";
import type { ReactElement } from "react";

export function ClientShell(): ReactElement
{
  const seed = createClientSeed();

  return (
    <main className={getThemeClass(seed.surface)}>
      <h1>{seed.title}</h1>
      <p>{seed.subtitle}</p>
      <ShellCard title="Entrata rapida">
        <p>Home mobile con accesso immediato a riordino e nuovo ordine.</p>
      </ShellCard>
    </main>
  );
}
