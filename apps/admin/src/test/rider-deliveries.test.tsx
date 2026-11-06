import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { IndividualActor, RiderDelivery, RiderDeliveryApi } from "@pizzaos/domain";
import { RiderDeliveriesScreen } from "../features/rider-deliveries";

const rider: IndividualActor = { id: "rider", email: "rider@example.test", name: "Rider" };
const delivery = (status: "ready" | "out_for_delivery" = "ready"): RiderDelivery => ({
  orderId: "ordine-123", storeId: "roma", storeName: "Sede Roma", status,
  address: { text: "Via Roma 1", latitude: 41.9, longitude: 12.5 }, contact: { name: "Destinatario", phone: "3331234567" },
  notes: "Citofono 3", items: [{ name: "Margherita", quantity: 2 }], cashDueCents: 1200, issue: null
});

function port(deliveries: RiderDelivery[] = [delivery()]): RiderDeliveryApi {
  return { session: vi.fn().mockResolvedValue({ actor: rider, storeIds: ["roma"] }),
    deliveries: vi.fn().mockResolvedValue(deliveries), dispatch: vi.fn().mockResolvedValue(undefined),
    complete: vi.fn().mockResolvedValue(undefined), reportFailure: vi.fn().mockResolvedValue(undefined) };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(accept => { resolve = accept; });
  return { promise, resolve };
}

afterEach(() => { cleanup(); vi.useRealTimers(); });

describe("RiderDeliveriesScreen public contract", () => {
  it("shows the supplied login URL without fetching private deliveries when anonymous", async () => {
    const api = port();
    vi.mocked(api.session).mockResolvedValue({ actor: null, storeIds: [] });
    render(<RiderDeliveriesScreen api={api} loginUrl="/auth/rider-login" />);
    const login = await screen.findByRole("link", { name: /accedi|login/i });
    expect(login.getAttribute("href")).toBe("/auth/rider-login");
    expect(api.deliveries).not.toHaveBeenCalled();
    expect(screen.queryByText("Via Roma 1")).toBeNull();
  });

  it("explains missing rider membership and never supplies mock deliveries", async () => {
    const api = port();
    vi.mocked(api.session).mockResolvedValue({ actor: rider, storeIds: [] });
    render(<RiderDeliveriesScreen api={api} loginUrl="/auth/login" />);
    await screen.findByText(/non (?:è )?abilitat|accesso.*(?:negato|autorizzat)/i);
    expect(api.deliveries).not.toHaveBeenCalled();
    expect(screen.queryByText("Via Roma 1")).toBeNull();
  });

  it("announces loading and renders only the supplied actionable delivery details in Italian", async () => {
    const pending = deferred<RiderDelivery[]>();
    const api = port(); vi.mocked(api.deliveries).mockReturnValue(pending.promise);
    render(<RiderDeliveriesScreen api={api} loginUrl="/auth/login" />);
    await waitFor(() => expect(api.deliveries).toHaveBeenCalledOnce());
    expect(screen.getByRole("status").textContent).toMatch(/caricament/i);
    await act(async () => pending.resolve([delivery()]));
    for (const text of ["Sede Roma", "Via Roma 1", "Destinatario", "3331234567", "Citofono 3", "Margherita"]) {
      expect(screen.getByText(text, { exact: false })).toBeTruthy();
    }
    expect(screen.getByText(/12,00\s*€/)).toBeTruthy();
    expect(screen.getByRole("button", { name: /avvia/i })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /completa/i })).toBeNull();
  });

  it("delegates dispatch once while pending and refreshes authoritative state afterwards", async () => {
    const api = port(); const pending = deferred<void>();
    vi.mocked(api.dispatch).mockReturnValue(pending.promise);
    vi.mocked(api.deliveries).mockResolvedValueOnce([delivery()]).mockResolvedValueOnce([delivery("out_for_delivery")]);
    render(<RiderDeliveriesScreen api={api} loginUrl="/auth/login" />);
    const start = await screen.findByRole("button", { name: /avvia/i });
    fireEvent.click(start); fireEvent.click(start);
    expect(api.dispatch).toHaveBeenCalledTimes(1);
    expect(api.dispatch).toHaveBeenCalledWith("ordine-123");
    expect(api.complete).not.toHaveBeenCalled();
    expect(screen.getByText("Via Roma 1")).toBeTruthy();
    await act(async () => pending.resolve());
    await screen.findByRole("button", { name: /completa/i });
    expect(api.deliveries).toHaveBeenCalledTimes(2);
  });

  it("completes through the supplied port and trusts the subsequent list", async () => {
    const api = port([delivery("out_for_delivery")]);
    vi.mocked(api.deliveries).mockResolvedValueOnce([delivery("out_for_delivery")]).mockResolvedValueOnce([]);
    render(<RiderDeliveriesScreen api={api} loginUrl="/auth/login" />);
    fireEvent.click(await screen.findByRole("button", { name: /completa/i }));
    await waitFor(() => expect(api.complete).toHaveBeenCalledWith("ordine-123"));
    expect(api.complete).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByText("Via Roma 1")).toBeNull());
    expect(api.deliveries).toHaveBeenCalledTimes(2);
  });

  it("submits a problem note and blocks completion after the server reports an open issue", async () => {
    const api = port([delivery("out_for_delivery")]);
    const issue = { ...delivery("out_for_delivery"), issue: { note: "Cliente assente", reportedAt: "2026-11-05T13:00:00.000Z" } };
    vi.mocked(api.deliveries).mockResolvedValueOnce([delivery("out_for_delivery")]).mockResolvedValueOnce([issue]);
    render(<RiderDeliveriesScreen api={api} loginUrl="/auth/login" />);
    const report = await screen.findByRole("button", { name: /segnala.*problema/i });
    // The form may be inline or opened by the action; both are valid public presentations.
    if (!screen.queryByRole("textbox")) fireEvent.click(report);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Cliente assente" } });
    const submit = screen.queryByRole("button", { name: /invia|conferma/i }) ?? screen.getByRole("button", { name: /segnala.*problema/i });
    fireEvent.click(submit);
    await waitFor(() => expect(api.reportFailure).toHaveBeenCalledWith("ordine-123", "Cliente assente"));
    expect(api.reportFailure).toHaveBeenCalledTimes(1);
    await screen.findByText("Cliente assente");
    expect(screen.queryByRole("button", { name: /completa/i })).toBeNull();
    expect(screen.getByText(/attesa|intervento.*ristorante/i)).toBeTruthy();
  });

  it("renders an existing open issue without exposing progress actions", async () => {
    const current = { ...delivery("out_for_delivery"), issue: { note: "Citofono guasto", reportedAt: "2026-11-05T13:00:00.000Z" } };
    const api = port([current]);
    render(<RiderDeliveriesScreen api={api} loginUrl="/auth/login" />);
    await screen.findByText("Citofono guasto");
    expect(screen.queryByRole("button", { name: /avvia|completa/i })).toBeNull();
    expect(api.dispatch).not.toHaveBeenCalled(); expect(api.complete).not.toHaveBeenCalled();
  });

  it("shows service errors and supports an explicit manual refresh", async () => {
    const api = port();
    vi.mocked(api.deliveries).mockRejectedValueOnce(new Error("Connessione interrotta")).mockResolvedValueOnce([delivery()]);
    render(<RiderDeliveriesScreen api={api} loginUrl="/auth/login" />);
    expect((await screen.findByRole("alert")).textContent).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /aggiorna|riprova/i }));
    await screen.findByText("Via Roma 1");
    expect(api.deliveries).toHaveBeenCalledTimes(2);
  });

  it("polls only while authenticated and removes stale deliveries when the session is revoked", async () => {
    const api = port();
    vi.mocked(api.session).mockResolvedValueOnce({ actor: rider, storeIds: ["roma"] }).mockResolvedValue({ actor: null, storeIds: [] });
    vi.useFakeTimers();
    await act(async () => { render(<RiderDeliveriesScreen api={api} loginUrl="/auth/login" refreshMs={1000} />); });
    expect(screen.getByText("Via Roma 1")).toBeTruthy();
    await act(async () => { await vi.advanceTimersByTimeAsync(1000); });
    expect(screen.queryByText("Via Roma 1")).toBeNull();
    expect(screen.getByRole("link", { name: /accedi|login/i })).toBeTruthy();
    const fetched = vi.mocked(api.deliveries).mock.calls.length;
    await act(async () => { await vi.advanceTimersByTimeAsync(3000); });
    expect(api.deliveries).toHaveBeenCalledTimes(fetched);
  });
});
