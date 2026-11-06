import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { PilotAnalyticsApi, PilotAnalyticsReport } from "@pizzaos/domain";
import { PilotAnalyticsPanel } from "../features/pilot-analytics";

afterEach(cleanup);

function report(storeId = "roma", salesCents = 3001): PilotAnalyticsReport {
  return { storeId, range: { timeZone: "Europe/Rome", fromDate: "2026-11-05", throughDate: "2026-11-05", startsAt: "2026-11-04T23:00:00.000Z", endsAt: "2026-11-05T23:00:00.000Z" },
    completedOrders: 2, salesCents, averageOrderCents: 1501, cancelledOrders: 1,
    topProducts: [{ productId: "pizza", name: "Margherita", quantity: 3 }] };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((accept, fail) => { resolve = accept; reject = fail; });
  return { promise, resolve, reject };
}

describe("PilotAnalyticsPanel public contract", () => {
  it("loads today through its supplied port and renders Italian metrics, EUR and store timezone", async () => {
    const pending = deferred<PilotAnalyticsReport>();
    const api: PilotAnalyticsApi = { report: vi.fn().mockReturnValue(pending.promise) };
    render(<PilotAnalyticsPanel storeId="roma" api={api} />);
    expect(screen.getByRole("status").textContent).toContain("Caricamento statistiche");
    expect(api.report).toHaveBeenCalledWith({ storeId: "roma", period: "today" });
    await act(async () => pending.resolve(report()));
    expect(screen.getByText("Vendite e ordini")).toBeTruthy();
    for (const label of ["Ordini completati", "Vendite", "Valore medio ordine", "Ordini annullati", "Prodotti più venduti"]) {
      expect(screen.getByText(label)).toBeTruthy();
    }
    expect(screen.getByText(/30,01\s*€/)).toBeTruthy();
    expect(screen.getByText(/15,01\s*€/)).toBeTruthy();
    expect(screen.getByText(/Europe\/Rome/)).toBeTruthy();
    expect(screen.getByText("Margherita")).toBeTruthy();
  });

  it("offers the four Italian periods and immediately loads preset changes", async () => {
    const api: PilotAnalyticsApi = { report: vi.fn().mockResolvedValue(report()) };
    render(<PilotAnalyticsPanel storeId="roma" api={api} />);
    await screen.findByText("Margherita");
    const select = screen.getByLabelText("Periodo");
    for (const name of ["Oggi", "Ultimi 7 giorni", "Ultimi 30 giorni", "Intervallo personalizzato"]) {
      expect(screen.getByRole("option", { name })).toBeTruthy();
    }
    fireEvent.change(select, { target: { value: "last_7_days" } });
    await waitFor(() => expect(api.report).toHaveBeenLastCalledWith({ storeId: "roma", period: "last_7_days" }));
    fireEvent.change(select, { target: { value: "last_30_days" } });
    await waitFor(() => expect(api.report).toHaveBeenLastCalledWith({ storeId: "roma", period: "last_30_days" }));
  });

  it("requires complete ordered custom dates and submits the inclusive interval", async () => {
    const api: PilotAnalyticsApi = { report: vi.fn().mockResolvedValue(report()) };
    render(<PilotAnalyticsPanel storeId="roma" api={api} />);
    await screen.findByText("Margherita");
    fireEvent.change(screen.getByLabelText("Periodo"), { target: { value: "custom" } });
    expect(screen.getByLabelText("Dal").getAttribute("type")).toBe("date");
    expect(screen.getByLabelText("Al").getAttribute("type")).toBe("date");
    expect(api.report).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Applica" }));
    expect(api.report).toHaveBeenCalledTimes(1);
    fireEvent.change(screen.getByLabelText("Dal"), { target: { value: "2026-11-06" } });
    fireEvent.change(screen.getByLabelText("Al"), { target: { value: "2026-11-05" } });
    fireEvent.click(screen.getByRole("button", { name: "Applica" }));
    expect(api.report).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("alert").textContent).toMatch(/data|intervallo|preced|success|iniz|fine/i);
    fireEvent.change(screen.getByLabelText("Dal"), { target: { value: "2026-11-01" } });
    fireEvent.click(screen.getByRole("button", { name: "Applica" }));
    await waitFor(() => expect(api.report).toHaveBeenLastCalledWith({ storeId: "roma", period: "custom", fromDate: "2026-11-01", throughDate: "2026-11-05" }));
  });

  it("hides old store data during a switch and lets the latest request win", async () => {
    const slow = deferred<PilotAnalyticsReport>();
    const current = deferred<PilotAnalyticsReport>();
    const api: PilotAnalyticsApi = { report: vi.fn().mockResolvedValueOnce(report()).mockReturnValueOnce(slow.promise).mockReturnValueOnce(current.promise) };
    const { rerender } = render(<PilotAnalyticsPanel storeId="roma" api={api} />);
    await screen.findByText("Margherita");
    fireEvent.change(screen.getByLabelText("Periodo"), { target: { value: "last_7_days" } });
    await waitFor(() => expect(api.report).toHaveBeenCalledTimes(2));
    rerender(<PilotAnalyticsPanel storeId="milano" api={api} />);
    await waitFor(() => expect(api.report).toHaveBeenLastCalledWith({ storeId: "milano", period: "today" }));
    expect(screen.queryByText("Margherita")).toBeNull();
    expect(screen.getByRole("status")).toBeTruthy();
    const milano = report("milano", 9900); milano.topProducts = [{ productId: "new", name: "Pizza Milano", quantity: 7 }];
    await act(async () => current.resolve(milano));
    await screen.findByText("Pizza Milano");
    await act(async () => slow.resolve(report("roma", 100)));
    expect(screen.queryByText("Margherita")).toBeNull();
    expect(screen.getByText("Pizza Milano")).toBeTruthy();
    expect(screen.getByText(/99,00\s*€/)).toBeTruthy();
  });

  it("ignores stale same-store results when a newer period has completed", async () => {
    const slow = deferred<PilotAnalyticsReport>();
    const api: PilotAnalyticsApi = { report: vi.fn().mockReturnValueOnce(slow.promise).mockResolvedValueOnce(report("roma", 7700)) };
    render(<PilotAnalyticsPanel storeId="roma" api={api} />);
    fireEvent.change(screen.getByLabelText("Periodo"), { target: { value: "last_30_days" } });
    await screen.findByText(/77,00\s*€/);
    await act(async () => slow.resolve(report("roma", 100)));
    expect(screen.getByText(/77,00\s*€/)).toBeTruthy();
    expect(screen.queryByText(/^1,00\s*€/)).toBeNull();
  });

  it("shows a safe Italian error and retries the last valid custom query", async () => {
    const request = vi.fn().mockResolvedValueOnce(report()).mockRejectedValueOnce(new Error("SQL secret stacktrace"))
      .mockResolvedValueOnce(report());
    render(<PilotAnalyticsPanel storeId="roma" api={{ report: request }} />);
    await screen.findByText("Margherita");
    fireEvent.change(screen.getByLabelText("Periodo"), { target: { value: "custom" } });
    fireEvent.change(screen.getByLabelText("Dal"), { target: { value: "2026-11-01" } });
    fireEvent.change(screen.getByLabelText("Al"), { target: { value: "2026-11-05" } });
    fireEvent.click(screen.getByRole("button", { name: "Applica" }));
    expect((await screen.findByRole("alert")).textContent).toContain("Impossibile caricare le statistiche.");
    expect(screen.queryByText(/SQL secret/)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Riprova" }));
    await screen.findByText("Margherita");
    expect(request).toHaveBeenLastCalledWith({ storeId: "roma", period: "custom", fromDate: "2026-11-01", throughDate: "2026-11-05" });
  });

  it("renders empty data with zero amounts and no synthetic insights", async () => {
    const empty = { ...report(), completedOrders: 0, salesCents: 0, averageOrderCents: 0, cancelledOrders: 0, topProducts: [] };
    render(<PilotAnalyticsPanel storeId="roma" api={{ report: vi.fn().mockResolvedValue(empty) }} />);
    await screen.findByText("Nessun prodotto venduto nel periodo.");
    expect(screen.getAllByText(/0,00\s*€/).length).toBeGreaterThanOrEqual(2);
    expect(screen.queryByRole("button", { name: /esporta/i })).toBeNull();
  });

  it("refreshes the chosen custom interval when refreshVersion changes without resetting the user's filters", async () => {
    const api: PilotAnalyticsApi = { report: vi.fn().mockResolvedValue(report()) };
    const { rerender } = render(<PilotAnalyticsPanel storeId="roma" api={api} refreshVersion={0} />);
    await screen.findByText("Margherita");
    fireEvent.change(screen.getByLabelText("Periodo"), { target: { value: "custom" } });
    fireEvent.change(screen.getByLabelText("Dal"), { target: { value: "2026-11-01" } });
    fireEvent.change(screen.getByLabelText("Al"), { target: { value: "2026-11-05" } });
    fireEvent.click(screen.getByRole("button", { name: "Applica" }));
    await waitFor(() => expect(api.report).toHaveBeenCalledTimes(2));
    await screen.findByText("Margherita");
    rerender(<PilotAnalyticsPanel storeId="roma" api={api} refreshVersion={1} />);
    await waitFor(() => expect(api.report).toHaveBeenCalledTimes(3));
    expect(api.report).toHaveBeenLastCalledWith({ storeId: "roma", period: "custom", fromDate: "2026-11-01", throughDate: "2026-11-05" });
    expect((screen.getByLabelText("Periodo") as HTMLSelectElement).value).toBe("custom");
    expect((screen.getByLabelText("Dal") as HTMLInputElement).value).toBe("2026-11-01");
    expect((screen.getByLabelText("Al") as HTMLInputElement).value).toBe("2026-11-05");
  });
});
