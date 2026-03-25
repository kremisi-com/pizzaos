"use client";

import { getThemeClass } from "@pizzaos/brand";
import {
  getDemoStateStorageKey,
  loadDemoState,
  resetDemoState,
  type LandingSeed
} from "@pizzaos/mock-data";
import { Button, ShellCard } from "@pizzaos/ui";
import { useState, type ReactElement } from "react";

const APP_ID = "landing" as const;

function resolveStorage(): Storage | undefined
{
  if (typeof window === "undefined")
  {
    return undefined;
  }

  return window.localStorage;
}

export function LandingShell(): ReactElement
{
  const [seed, setSeed] = useState<LandingSeed>(() => loadDemoState(APP_ID, { storage: resolveStorage() }));

  function handleResetClick(): void
  {
    const resetSeed = resetDemoState(APP_ID, { storage: resolveStorage() });

    setSeed(resetSeed);
  }

  return (
    <main className={getThemeClass(seed.surface)}>
      <h1>{seed.title}</h1>
      <p>{seed.subtitle}</p>
      <ShellCard title="Superficie">
        <p>Landing introduttiva pronta per i prossimi step del POC.</p>
        <p>Highlights disponibili: {seed.highlights.length}</p>
        <p>Storage key: {getDemoStateStorageKey(APP_ID)}</p>
        <Button onClick={handleResetClick} data-testid="landing-reset-button" variant="secondary">
          Reset demo
        </Button>
      </ShellCard>
    </main>
  );
}
