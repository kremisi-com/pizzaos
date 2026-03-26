import {
  getDemoStateStorageKey,
  loadDemoState,
  resetDemoState,
  type ClientSeed,
  type DemoStorage
} from "@pizzaos/mock-data";

export const CLIENT_APP_ID = "client" as const;

export function getClientDemoStateStorageKey(): string
{
  return getDemoStateStorageKey(CLIENT_APP_ID);
}

export function loadClientDemoState(storage?: DemoStorage): ClientSeed
{
  return loadDemoState(CLIENT_APP_ID, { storage });
}

export function resetClientDemoState(storage?: DemoStorage): ClientSeed
{
  return resetDemoState(CLIENT_APP_ID, { storage });
}
