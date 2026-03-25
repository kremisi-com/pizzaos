"use client";

import { getThemeClass } from "@pizzaos/brand";
import {
  getDemoStateStorageKey,
  loadDemoState,
  resetDemoState,
  type ClientSeed
} from "@pizzaos/mock-data";
import { Button, ShellCard } from "@pizzaos/ui";
import { useState, type ReactElement } from "react";

const APP_ID = "client" as const;

function resolveStorage(): Storage | undefined
{
  if (typeof window === "undefined")
  {
    return undefined;
  }

  return window.localStorage;
}

export function ClientShell(): ReactElement
{
  const [seed, setSeed] = useState<ClientSeed>(() => loadDemoState(APP_ID, { storage: resolveStorage() }));

  function handleResetClick(): void
  {
    const resetSeed = resetDemoState(APP_ID, { storage: resolveStorage() });

    setSeed(resetSeed);
  }

  return (
    <main className={getThemeClass(seed.surface)}>
      <h1>{seed.title}</h1>
      <p>{seed.subtitle}</p>
      <ShellCard title="Entrata rapida">
        <p>Home mobile con accesso immediato a riordino e nuovo ordine.</p>
        <p>Prodotti seed: {seed.products.length}</p>
        <p>Storage key: {getDemoStateStorageKey(APP_ID)}</p>
        <Button onClick={handleResetClick} data-testid="client-reset-button" variant="secondary">
          Reset demo
        </Button>
      </ShellCard>
    </main>
  );
}
