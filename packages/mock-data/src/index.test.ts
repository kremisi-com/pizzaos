import { describe, expect, it } from "vitest";
import {
  APP_SURFACES,
  ORDER_STATUS,
  getNextOrderStatuses
} from "@pizzaos/domain";
import {
  ADMIN_STORE_IDS,
  advanceOrderSimulation,
  createAdminSeed,
  createClientSeed,
  createLandingSeed,
  getDemoStateStorageKey,
  loadDemoState,
  recoverPersistedDemoState,
  reseedDemoState,
  resetDemoState
} from "./index";

class InMemoryStorage
{
  private readonly storageMap = new Map<string, string>();

  getItem(key: string): string | null
  {
    return this.storageMap.has(key) ? this.storageMap.get(key) ?? null : null;
  }

  setItem(key: string, value: string): void
  {
    this.storageMap.set(key, value);
  }

  removeItem(key: string): void
  {
    this.storageMap.delete(key);
  }
}

describe("seed factories", () =>
{
  it("creates deterministic landing, client, and admin seeds", () =>
  {
    const landingSeedA = createLandingSeed();
    const landingSeedB = createLandingSeed();
    const clientSeedA = createClientSeed();
    const clientSeedB = createClientSeed();
    const adminSeedA = createAdminSeed();
    const adminSeedB = createAdminSeed();

    expect(landingSeedA).toEqual(landingSeedB);
    expect(clientSeedA).toEqual(clientSeedB);
    expect(adminSeedA).toEqual(adminSeedB);
    expect(landingSeedA).not.toBe(landingSeedB);
    expect(clientSeedA).not.toBe(clientSeedB);
    expect(adminSeedA).not.toBe(adminSeedB);
  });

  it("stays compatible with domain contracts", () =>
  {
    const clientSeed = createClientSeed();
    const adminSeed = createAdminSeed();

    expect(APP_SURFACES).toContain(clientSeed.surface);
    expect(APP_SURFACES).toContain(adminSeed.surface);
    expect(clientSeed.menu.storeId).toBe(clientSeed.store.id);

    for (const order of clientSeed.activeOrders)
    {
      expect(ORDER_STATUS).toContain(order.status);
    }

    for (const storeId of ADMIN_STORE_IDS)
    {
      expect(adminSeed.datasetsByStoreId[storeId]).toBeDefined();
    }
  });
});

describe("admin multi-store dataset", () =>
{
  it("switches active store and exposes real dataset differences", () =>
  {
    const romaSeed = createAdminSeed("store-roma-centro");
    const milanoSeed = createAdminSeed("store-milano-navigli");
    const torinoSeed = createAdminSeed("store-torino-porta-nuova");

    expect(romaSeed.activeStoreId).toBe("store-roma-centro");
    expect(milanoSeed.activeStoreId).toBe("store-milano-navigli");
    expect(torinoSeed.activeStoreId).toBe("store-torino-porta-nuova");

    expect(romaSeed.datasetsByStoreId[romaSeed.activeStoreId].analytics.ordersToday).not.toBe(
      milanoSeed.datasetsByStoreId[milanoSeed.activeStoreId].analytics.ordersToday
    );
    expect(milanoSeed.datasetsByStoreId[milanoSeed.activeStoreId].menu.status).not.toBe(
      torinoSeed.datasetsByStoreId[torinoSeed.activeStoreId].menu.status
    );
    expect(romaSeed.datasetsByStoreId[romaSeed.activeStoreId].orders.length).not.toBe(
      torinoSeed.datasetsByStoreId[torinoSeed.activeStoreId].orders.length
    );
  });

  it("falls back to default store for unknown store id", () =>
  {
    const seed = createAdminSeed("store-unknown");

    expect(seed.activeStoreId).toBe("store-roma-centro");
  });
});

describe("reset, reseed, and recovery", () =>
{
  it("reseed and reset write deterministic data to storage", () =>
  {
    const storage = new InMemoryStorage();
    const clientStorageKey = getDemoStateStorageKey("client");

    storage.setItem(clientStorageKey, JSON.stringify({ surface: "client", title: "Alterato", subtitle: "X" }));

    const reseededClient = reseedDemoState("client", { storage });

    expect(reseededClient).toEqual(createClientSeed());
    expect(JSON.parse(storage.getItem(clientStorageKey) ?? "{}")).toEqual(createClientSeed());

    storage.setItem(clientStorageKey, JSON.stringify({ surface: "client", title: "Ancora alterato", subtitle: "Y" }));

    const resetClient = resetDemoState("client", { storage });

    expect(resetClient).toEqual(createClientSeed());
    expect(JSON.parse(storage.getItem(clientStorageKey) ?? "{}")).toEqual(createClientSeed());
  });

  it("recovers when persisted payload is missing or corrupted", () =>
  {
    const storage = new InMemoryStorage();
    const adminStorageKey = getDemoStateStorageKey("admin");

    const missingLoadedState = loadDemoState("admin", { storage });

    expect(missingLoadedState).toEqual(createAdminSeed());
    expect(JSON.parse(storage.getItem(adminStorageKey) ?? "{}")).toEqual(createAdminSeed());

    storage.setItem(adminStorageKey, "{broken-json");

    const corruptedLoadedState = loadDemoState("admin", { storage });

    expect(corruptedLoadedState).toEqual(createAdminSeed());
  });

  it("recovers when persisted object has wrong shape", () =>
  {
    const recovered = recoverPersistedDemoState("landing", { surface: "admin", title: "X", subtitle: "Y" });

    expect(recovered).toEqual(createLandingSeed());
  });

  it("recovers admin state when persisted payload has malformed datasets or active store id", () =>
  {
    const adminSeed = createAdminSeed();

    const malformedPersistedAdminPayloads: readonly unknown[] = [
      {
        ...adminSeed,
        datasetsByStoreId: "not-an-object"
      },
      {
        ...adminSeed,
        datasetsByStoreId: {}
      },
      {
        ...adminSeed,
        datasetsByStoreId: {
          ...adminSeed.datasetsByStoreId,
          [adminSeed.activeStoreId]: null
        }
      },
      {
        ...adminSeed,
        activeStoreId: 42
      }
    ];

    for (const payload of malformedPersistedAdminPayloads)
    {
      const recoverMalformedPayload = () => recoverPersistedDemoState("admin", payload);

      expect(recoverMalformedPayload).not.toThrow();
      expect(recoverMalformedPayload()).toEqual(createAdminSeed());
    }
  });
});

describe("order simulation", () =>
{
  it("deterministically progresses order statuses based on explicit time", () =>
  {
    const clientSeed = createClientSeed();

    const initialState = {
      orders: clientSeed.activeOrders,
      simulationCursorIso: clientSeed.simulationCursorIso
    };

    const oneStepTimestamp = "2026-03-25T18:45:00.000Z";
    const oneStepProgressed = advanceOrderSimulation(initialState, oneStepTimestamp);

    expect(oneStepProgressed.orders[0].status).toBe("preparing");
    expect(oneStepProgressed.simulationCursorIso).toBe(oneStepTimestamp);

    const noExtraStep = advanceOrderSimulation(oneStepProgressed, oneStepTimestamp);

    expect(noExtraStep).toEqual(oneStepProgressed);

    const twoMoreStepsTimestamp = "2026-03-25T18:51:00.000Z";
    const twoMoreStepsProgressed = advanceOrderSimulation(oneStepProgressed, twoMoreStepsTimestamp);

    expect(getNextOrderStatuses("preparing")).toContain("ready");
    expect(twoMoreStepsProgressed.orders[0].status).toBe("out_for_delivery");
    expect(ORDER_STATUS).toContain(twoMoreStepsProgressed.orders[0].status);
  });

  it("is deterministic for same input state and timestamp", () =>
  {
    const clientSeed = createClientSeed();

    const state = {
      orders: clientSeed.activeOrders,
      simulationCursorIso: clientSeed.simulationCursorIso
    };

    const timestamp = "2026-03-25T18:48:00.000Z";

    expect(advanceOrderSimulation(state, timestamp)).toEqual(advanceOrderSimulation(state, timestamp));
  });
});
