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
    expect(markup).not.toContain("Dashboard operativa desktop-first.");
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
    expect(markup).toContain("Analytics and AI");
    expect(markup).toContain("Profilo");
    expect(markup).toContain("Insight AI");
    expect(markup).toContain("Applica suggerimento");
    expect(markup).toContain("Timeline operativa");
    expect(markup).toContain("%2Fimages%2Fdashboard%2Fclock.png");
    expect(markup).toContain("12:14");
    expect(markup).toContain("Ordine #104 ricevuto");
    expect(markup).toContain("2 margherite, 1 diavola");
    expect(markup).toContain("Rider assegnato a #103");
    expect(markup).toContain("Marco Bianchi");
    expect(markup).toContain("Menu pranzo attivato");
    expect(markup).toContain("Menu Pranzo Centro");
    expect(markup).toContain("Birra IPA sotto scorta");
    expect(markup).toContain("Disponibilita: 0");
    expect(markup).toContain("Vedi tutta");
    expect(markup).toContain("Revenue Oggi");
    expect(markup).toContain("1.414,30 €");
    expect(markup).toContain("16% vs ieri");
    expect(markup).toContain('viewBox="0 0 220 82"');
    expect(markup).toContain("revenue-today-fill");
    expect(markup).toContain("L220 82 L0 82 Z");
    expect(markup).toContain("00:00");
    expect(markup).toContain("24:00");
    expect(markup).toContain("Ordini oggi");
    expect(markup).toContain("Scontrino medio");
    expect(markup).toContain("27,20 €");
    expect(markup).toContain("Flotta Consegne");
    expect(markup).toContain("%2Fimages%2Fsidebar%2Fscooter.png");
    expect(markup).toContain("6 rider disponibili e 2 occupati");
    expect(markup).toContain("rider attivi");
    expect(markup).toContain("6 disponibili");
    expect(markup).toContain("2 occupati");
    expect(markup).toContain("Gestisci flotta");
    expect(markup).toContain("Marketing Attivo");
    expect(markup).toContain("%2Fimages%2Fsidebar%2Fmegaphone.png");
    expect(markup).toContain("%2Fimages%2Fdashboard%2Fstar.png");
    expect(markup).toContain("%2Fimages%2Fdashboard%2Fgift.png");
    expect(markup).toContain("Coupon attivi");
    expect(markup).toContain("Vedi dettagli");
    expect(markup).toContain("Clienti fedelta");
    expect(markup).toContain("234");
    expect(markup).toContain("12%");
    expect(markup).toContain("Opportunita automatiche");
    expect(markup).toContain("Vedi tutte");
    expect(markup).toContain("Cliente inattivo da 21 giorni");
    expect(markup).toContain("Invia coupon -10% per riattivarlo");
    expect(markup).toContain("Compleanno cliente domani");
    expect(markup).toContain("Programma promo auguri");
    expect(markup).toContain("Picco uffici alle 12:30");
    expect(markup).toContain("Attiva menu pranzo rapido");
    expect(markup).not.toContain("Incasso store");
    expect(markup).not.toContain("Dispatch");
    expect(markup).not.toContain("Stato Negozio");
    expect(markup).not.toContain("Operatività Ordini");
    expect(markup).not.toContain("Stato Magazzino");
    expect(markup).not.toContain("Configurazione Menu");
    expect(markup).not.toContain("Info Demo");
    expect(markup).not.toContain("Simulation loop: Automatico ogni 5s");
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

    expect(screen.getByText("Gestione ordini in tempo reale")).toBeDefined();
    expect(screen.getByText("Totali oggi")).toBeDefined();
  });

  it("opens the orders queue from the operational timeline card", () => {
    render(<AdminShell />);

    fireEvent.click(
      screen.getByRole("button", { name: /Vedi tutta l'attivit/i }),
    );

    expect(screen.getByText("Gestione ordini in tempo reale")).toBeDefined();
    expect(screen.getByText("Totali oggi")).toBeDefined();
  });

  it("opens delivery management from the fleet card", () => {
    render(<AdminShell />);

    fireEvent.click(screen.getByRole("button", { name: "Gestisci flotta" }));

    expect(screen.getByLabelText("Mappa consegne")).toBeDefined();
    expect(screen.getByText("Rider Attivi")).toBeDefined();
  });

  it("opens marketing from the dashboard marketing cards", () => {
    render(<AdminShell />);

    fireEvent.click(screen.getByRole("button", { name: "Vedi dettagli" }));

    expect(screen.getByText("Configurazione Fedeltà")).toBeDefined();
    expect(screen.getByText("Automazioni Marketing")).toBeDefined();
  });

  it("opens analytics from the lunch spike opportunity", () => {
    render(<AdminShell />);

    fireEvent.click(
      screen.getByRole("button", {
        name: /Picco uffici alle 12:30\s*Attiva menu pranzo rapido/i,
      }),
    );

    expect(screen.getAllByText("Analytics and AI").length).toBeGreaterThan(0);
    expect(screen.getByText(/Prodotti pi/)).toBeDefined();
  });

  it("navigates from quick actions to operational sections", () => {
    render(<AdminShell />);

    fireEvent.click(screen.getByRole("button", { name: "Modifica menu" }));
    expect(screen.getByText("Gestione Catalogo")).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: "Dashboard" }));
    fireEvent.click(screen.getByRole("button", { name: "Assegna rider" }));
    expect(screen.getByLabelText("Mappa consegne")).toBeDefined();
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
