"use client";

import { getThemeClass } from "@pizzaos/brand";
import {
  getDemoStateStorageKey,
  loadDemoState,
  resetDemoState,
  type AdminSeed
} from "@pizzaos/mock-data";
import { Button, ShellCard } from "@pizzaos/ui";
import { useState, type ReactElement } from "react";

const APP_ID = "admin" as const;

function resolveStorage(): Storage | undefined
{
  if (typeof window === "undefined")
  {
    return undefined;
  }

  return window.localStorage;
}

export function AdminShell(): ReactElement
{
  const [seed, setSeed] = useState<AdminSeed>(() => loadDemoState(APP_ID, { storage: resolveStorage() }));

  function handleResetClick(): void
  {
    const resetSeed = resetDemoState(APP_ID, { storage: resolveStorage() });

    setSeed(resetSeed);
  }

  return (
    <main className={getThemeClass(seed.surface)}>
      <h1>{seed.title}</h1>
      <p>{seed.subtitle}</p>
      <ShellCard title="Contesto operativo">
        <p>Dashboard desktop con spazio per ordini, analytics e gestione negozio.</p>
        <p>Negozi disponibili: {seed.stores.length}</p>
        <p>Storage key: {getDemoStateStorageKey(APP_ID)}</p>
        <Button onClick={handleResetClick} data-testid="admin-reset-button" variant="secondary">
          Reset demo
        </Button>
      </ShellCard>
    </main>
  );
}
