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
    expect(markup).toContain("%2Fimages%2Flogo.png");
    expect(markup).toContain('alt="PizzaOS Admin"');
    expect(markup).toContain("Dashboard");
    expect(markup).toContain("Ordini");
    expect(markup).toContain("Reset Demo");
    expect(markup).toContain("Pausa simulazione");
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
