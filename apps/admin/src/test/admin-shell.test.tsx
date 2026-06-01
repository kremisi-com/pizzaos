import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import {
  ADMIN_SIMULATION_INTERVAL_MS,
  getDemoStateStorageKey,
  ORDER_SIMULATION_STEP_MS,
  type AdminSeed,
} from "@pizzaos/mock-data";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AdminShell } from "@/features/home/components/admin-shell";

const ADMIN_STORAGE_KEY = getDemoStateStorageKey("admin");

function createMemoryStorage(): Storage {
  const values = new Map<string, string>();

  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key: string) => values.get(key) ?? null,
    key: (index: number) => Array.from(values.keys())[index] ?? null,
    removeItem: (key: string) => values.delete(key),
    setItem: (key: string, value: string) => values.set(key, value),
  };
}

const testStorage = createMemoryStorage();

function readPersistedAdminSeed(): AdminSeed {
  const persistedValue = window.localStorage.getItem(ADMIN_STORAGE_KEY);

  expect(persistedValue).toBeTypeOf("string");

  return JSON.parse(persistedValue ?? "") as AdminSeed;
}

function getExpectedNextCursorIso(cursorIso: string): string {
  return new Date(Date.parse(cursorIso) + ORDER_SIMULATION_STEP_MS).toISOString();
}

beforeEach(() => {
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: testStorage,
  });

  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  window.localStorage.clear();
});

describe("admin shell", () =>
{
  it("mounts with the expected sections", () =>
  {
    const markup = renderToString(createElement(AdminShell));

    expect(markup).toContain("PizzaOS");
    expect(markup).toContain("%2Fimages%2Flogo.png");
    expect(markup).toContain('alt="PizzaOS Admin"');
    expect(markup).toContain("Dashboard");
    expect(markup).toContain("Ordini");
    expect(markup).toContain("Reset Demo");
    expect(markup).toContain("Pausa simulazione");
    expect(markup).toContain("Ordini Live");
    expect(markup).toContain("Aggiornato in tempo reale");
    expect(markup).toContain("da confermare");
    expect(markup).toContain("in cucina");
    expect(markup).toContain("in consegna");
    expect(markup).toContain("pronto");
    expect(markup).toContain("Tempo medio");
    expect(markup).toContain("24 min");
    expect(markup).toContain("8% vs ieri");
    expect(markup).toContain("Apri coda ordini");
    expect(markup).toContain("Nuovo ordine manuale");
    expect(markup).toContain("Attenzione");
    expect(markup).toContain("%2Fimages%2Fattention%2Fexclamation.png");
    expect(markup).toContain("%2Fimages%2Fattention%2Fdanger.png");
    expect(markup).toContain("2 ingredienti sotto scorta");
    expect(markup).toContain("Mozzarella, Rucola");
    expect(markup).toContain("1 prodotto esaurito");
    expect(markup).toContain("Birra IPA 33cl");
    expect(markup).toContain("Gestisci magazzino");
    expect(markup).toContain("Azioni rapide");
    expect(markup).toContain("Metti in pausa");
    expect(markup).toContain("Aggiorna tempi");
    expect(markup).toContain("Crea coupon");
    expect(markup).toContain("Modifica menu");
    expect(markup).toContain("Assegna rider");
    expect(markup).toContain("Stato Negozio");
    expect(markup).toContain("Operatività Ordini");
    expect(markup).toContain("Stato Magazzino");
    expect(markup).toContain("Flotta Consegne");
    expect(markup).toContain("Configurazione Menu");
    expect(markup).toContain("Insight AI");
    expect(markup).toContain("Integrazioni");
    expect(markup).toContain("Analytics and AI");
    expect(markup).toContain("Profilo");
    expect(markup).toContain("Simulation loop: Automatico ogni 5s");
    expect(markup).toContain("Stato:");
    expect(markup).toContain("Live");
    expect(markup).not.toContain("Avanza Simulazione");
  });

  it("renders the attention card as static inventory guidance", () => {
    render(<AdminShell />);

    expect(screen.getByText("2 ingredienti sotto scorta")).toBeDefined();
    expect(screen.getByText("Mozzarella, Rucola")).toBeDefined();
    expect(screen.getByText("1 prodotto esaurito")).toBeDefined();
    expect(screen.getByText("Birra IPA 33cl")).toBeDefined();
    expect(screen.getByText("Gestisci magazzino")).toBeDefined();
    expect(
      screen.queryByRole("button", { name: "Gestisci magazzino" }),
    ).toBeNull();
  });

  it("opens the orders queue from the live orders card", () => {
    render(<AdminShell />);

    fireEvent.click(screen.getByRole("button", { name: "Apri coda ordini" }));

    expect(screen.getByText("Ordini Attivi")).toBeDefined();
    expect(screen.getByText("Totale oggi")).toBeDefined();
  });

  it("navigates from quick actions to operational sections", () => {
    render(<AdminShell />);

    fireEvent.click(screen.getByRole("button", { name: "Modifica menu" }));
    expect(screen.getByText("Gestione Catalogo")).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: "Dashboard" }));
    fireEvent.click(screen.getByRole("button", { name: "Assegna rider" }));
    expect(screen.getByText("Gestione Consegne")).toBeDefined();
  });

  it("automatically advances the active store simulation on the timer", () => {
    vi.useFakeTimers();
    render(<AdminShell />);

    const initialSeed = readPersistedAdminSeed();
    const initialDataset =
      initialSeed.datasetsByStoreId[initialSeed.activeStoreId];
    const expectedNextCursorIso = getExpectedNextCursorIso(
      initialDataset.simulationCursorIso,
    );

    act(() => {
      vi.advanceTimersByTime(ADMIN_SIMULATION_INTERVAL_MS);
    });

    const updatedSeed = readPersistedAdminSeed();
    const updatedDataset =
      updatedSeed.datasetsByStoreId[updatedSeed.activeStoreId];

    expect(updatedDataset.simulationCursorIso).toBe(expectedNextCursorIso);
  });

  it("pauses and resumes automatic simulation", () => {
    vi.useFakeTimers();
    render(<AdminShell />);

    const initialSeed = readPersistedAdminSeed();
    const initialDataset =
      initialSeed.datasetsByStoreId[initialSeed.activeStoreId];

    fireEvent.click(screen.getByRole("button", { name: "Pausa simulazione" }));

    act(() => {
      vi.advanceTimersByTime(ADMIN_SIMULATION_INTERVAL_MS);
    });

    const pausedSeed = readPersistedAdminSeed();
    const pausedDataset = pausedSeed.datasetsByStoreId[pausedSeed.activeStoreId];

    expect(
      screen.getByRole("button", { name: "Riprendi simulazione" }),
    ).toBeDefined();
    expect(pausedDataset.simulationCursorIso).toBe(
      initialDataset.simulationCursorIso,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Riprendi simulazione" }),
    );

    act(() => {
      vi.advanceTimersByTime(ADMIN_SIMULATION_INTERVAL_MS);
    });

    const resumedSeed = readPersistedAdminSeed();
    const resumedDataset =
      resumedSeed.datasetsByStoreId[resumedSeed.activeStoreId];

    expect(resumedDataset.simulationCursorIso).toBe(
      getExpectedNextCursorIso(initialDataset.simulationCursorIso),
    );
  });
});
