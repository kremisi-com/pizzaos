import { createClientSeed } from "@pizzaos/mock-data";
import { describe, expect, it } from "vitest";
import {
  getClientDemoStateStorageKey,
  loadClientDemoState,
  resetClientDemoState
} from "../features/home/client-demo-state";

class InMemoryStorage
{
  private readonly dataByKey = new Map<string, string>();

  getItem(key: string): string | null
  {
    return this.dataByKey.has(key) ? this.dataByKey.get(key) ?? null : null;
  }

  setItem(key: string, value: string): void
  {
    this.dataByKey.set(key, value);
  }

  removeItem(key: string): void
  {
    this.dataByKey.delete(key);
  }
}

describe("client demo state", () =>
{
  it("hydrates the client demo state on first load", () =>
  {
    const storage = new InMemoryStorage();

    const hydratedSeed = loadClientDemoState(storage);

    expect(hydratedSeed).toEqual(createClientSeed());
    expect(JSON.parse(storage.getItem(getClientDemoStateStorageKey()) ?? "{}")).toEqual(createClientSeed());
  });

  it("resets persisted client demo state back to the curated seed", () =>
  {
    const storage = new InMemoryStorage();

    storage.setItem(
      getClientDemoStateStorageKey(),
      JSON.stringify({
        surface: "client",
        title: "Alterato",
        subtitle: "Stato non valido"
      })
    );

    const resetSeed = resetClientDemoState(storage);

    expect(resetSeed).toEqual(createClientSeed());
    expect(JSON.parse(storage.getItem(getClientDemoStateStorageKey()) ?? "{}")).toEqual(createClientSeed());
  });
});
