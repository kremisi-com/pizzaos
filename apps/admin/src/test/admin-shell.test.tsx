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

function readPersistedAdminSeed(): AdminSeed {
  const persistedValue = window.localStorage.getItem(ADMIN_STORAGE_KEY);

  expect(persistedValue).toBeTypeOf("string");

  return JSON.parse(persistedValue ?? "") as AdminSeed;
}

function getExpectedNextCursorIso(cursorIso: string): string {
  return new Date(Date.parse(cursorIso) + ORDER_SIMULATION_STEP_MS).toISOString();
}

beforeEach(() => {
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
    expect(markup).toContain("Dashboard");
    expect(markup).toContain("Ordini");
    expect(markup).toContain("Reset Demo");
    expect(markup).toContain("Pausa simulazione");
    expect(markup).toContain("Centro operativo del negozio");
    expect(markup).toContain("Mer 21 Mag 2025, 12:15");
    expect(markup).toContain("Ordini Live");
    expect(markup).toContain("da confermare");
    expect(markup).toContain("in cucina");
    expect(markup).toContain("in consegna");
    expect(markup).toContain("pronto");
    expect(markup).toContain("Attenzione");
    expect(markup).toContain("Azioni rapide");
    expect(markup).toContain("Timeline operativa");
    expect(markup).toContain("Revenue Oggi");
    expect(markup).toContain("Flotta Consegne");
    expect(markup).toContain("Insight AI");
    expect(markup).toContain("Marketing Attivo");
    expect(markup).toContain("Integrazioni");
    expect(markup).toContain("Analytics &amp; AI");
    expect(markup).toContain("Profilo");
    expect(markup).toContain("Apri coda ordini");
    expect(markup).toContain("Gestisci magazzino");
    expect(markup).toContain("Gestisci flotta");
    expect(markup).not.toContain("Avanza Simulazione");
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

  it("uses dashboard quick actions to pause and navigate operational tabs", () => {
    render(<AdminShell />);

    fireEvent.click(screen.getByRole("button", { name: "Metti in pausa" }));

    expect(
      screen.getByRole("button", { name: "Riprendi demo" }),
    ).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: "Apri coda ordini" }));
    expect(screen.getByText("Ordini Attivi")).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: "Dashboard" }));
    fireEvent.click(screen.getByRole("button", { name: "Gestisci magazzino" }));
    expect(screen.getByText("Gestione Magazzino")).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: "Dashboard" }));
    fireEvent.click(screen.getByRole("button", { name: "Gestisci flotta" }));
    expect(screen.getByText("Rider Attivi")).toBeDefined();
  });
});
