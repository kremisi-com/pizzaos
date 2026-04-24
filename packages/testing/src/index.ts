import type { ReactElement } from "react";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";

export interface StorageAdapter
{
  clear(): void;
  getItem(key: string): string | null;
  removeItem(key: string): void;
  setItem(key: string, value: string): void;
}

export interface InMemoryStorage extends StorageAdapter
{
  snapshot(): Record<string, string>;
}

export function createInMemoryStorage(initialData: Readonly<Record<string, string>> = {}): InMemoryStorage
{
  const dataByKey = new Map<string, string>(Object.entries(initialData));

  return {
    clear: () =>
    {
      dataByKey.clear();
    },
    getItem: (key: string) =>
    {
      if (!dataByKey.has(key))
        return null;

      return dataByKey.get(key) ?? null;
    },
    removeItem: (key: string) =>
    {
      dataByKey.delete(key);
    },
    setItem: (key: string, value: string) =>
    {
      dataByKey.set(key, value);
    },
    snapshot: () => Object.fromEntries(dataByKey)
  };
}

export function resetStorage(storage: Pick<StorageAdapter, "clear">): void
{
  storage.clear();
}

export function resetStorageKeys(storage: Pick<StorageAdapter, "removeItem">, keys: readonly string[]): void
{
  for (const key of keys)
    storage.removeItem(key);
}

export function renderForTest(element: ReactElement): string
{
  return renderToStaticMarkup(element);
}

export function renderDom(element: ReactElement)
{
  return render(element);
}

export function cleanupDom(): void
{
  cleanup();
}

export const domFireEvent = fireEvent;
export const domScreen = screen;
export const domWithin = within;

export function withFrozenDateNow<Result>(isoTimestamp: string, callback: () => Result): Result
{
  const originalDateNow = Date.now;
  const fixedTimestamp = new Date(isoTimestamp).getTime();

  Date.now = () => fixedTimestamp;

  try
  {
    return callback();
  }
  finally
  {
    Date.now = originalDateNow;
  }
}

export interface DeterministicClock
{
  nextIso(): string;
  peekIso(): string;
  reset(): void;
}

export function createDeterministicClock(startIso: string, stepMilliseconds: number): DeterministicClock
{
  let currentTimestamp = new Date(startIso).getTime();

  return {
    nextIso: () =>
    {
      const isoValue = new Date(currentTimestamp).toISOString();

      currentTimestamp += stepMilliseconds;

      return isoValue;
    },
    peekIso: () => new Date(currentTimestamp).toISOString(),
    reset: () =>
    {
      currentTimestamp = new Date(startIso).getTime();
    }
  };
}
