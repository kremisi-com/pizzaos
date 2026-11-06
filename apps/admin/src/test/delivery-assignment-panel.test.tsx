import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AdminDeliveryItem, DeliveryAdminApi, DeliveryRider, IndividualOrder } from "@pizzaos/domain";
import { DeliveryAssignmentsPanel } from "../features/delivery-assignment-panel";

const mario: DeliveryRider = { id: "mario", storeId: "roma", email: "mario@example.test", name: "Mario", active: true };
const luisa: DeliveryRider = { id: "luisa", storeId: "roma", email: "luisa@example.test", name: "Luisa", active: false };

function order(id = "o1", changes: Partial<IndividualOrder> = {}): IndividualOrder {
  return { id, storeId: "roma", customerId: "customer", contact: { name: "Cliente", email: "private@example.test", phone: "3331234567" },
    cart: { storeId: "roma", mode: "delivery", slotId: null, notes: "", address: { text: "Via Roma 1", latitude: 41.9, longitude: 12.5 }, lines: [] },
    quote: { fingerprint: id, subtotalCents: 1000, deliveryCents: 200, totalCents: 1200, slotId: "slot", slotStartsAt: "2026-11-05T18:00:00.000Z", lines: [] },
    status: "ready", payment: "cash_due", method: "cash", notes: "", createdAt: "2026-11-05T12:00:00.000Z", submittedAt: null,
    acceptanceDeadline: null, reservationExpiresAt: null, reservationReleased: false, unavailableProductIds: [], providerIntentId: null,
    refundId: null, refundAttempt: 0, revision: 1, ...changes };
}

function port(riders = [mario, luisa], assignments: AdminDeliveryItem[] = []): DeliveryAdminApi {
  return { riders: vi.fn().mockResolvedValue(riders), assignments: vi.fn().mockResolvedValue(assignments),
    inviteRider: vi.fn().mockResolvedValue(mario), setRiderActive: vi.fn().mockResolvedValue(mario), assign: vi.fn().mockResolvedValue(undefined) };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(accept => { resolve = accept; });
  return { promise, resolve };
}

afterEach(cleanup);

describe("DeliveryAssignmentsPanel public operator contract", () => {
  it("links the rider area to the dedicated entry supplied by the application", async () => {
    render(<DeliveryAssignmentsPanel storeId="roma" orders={[]} api={port()} riderHref="https://rider.pizzaos.app" />);
    expect((await screen.findByRole("link", { name: "Area rider" })).getAttribute("href")).toBe("https://rider.pizzaos.app");
  });

  it("loads the selected store, trims valid enablement inputs, refreshes and reports one successful change", async () => {
    const api = port(); const onChanged = vi.fn();
    render(<DeliveryAssignmentsPanel storeId="roma" orders={[order()]} api={api} onChanged={onChanged} />);
    await screen.findByRole("button", { name: "Disattiva Mario" });
    expect(api.riders).toHaveBeenCalledWith("roma"); expect(api.assignments).toHaveBeenCalledWith("roma");
    const email = screen.getByLabelText("Email rider"); const name = screen.getByLabelText("Nome rider");
    expect(email.getAttribute("type")).toBe("email");
    expect(email.hasAttribute("required")).toBe(true); expect(name.hasAttribute("required")).toBe(true);
    fireEvent.change(email, { target: { value: "  new@example.test  " } });
    fireEvent.change(name, { target: { value: "  Nuovo Rider  " } });
    fireEvent.click(screen.getByRole("button", { name: "Abilita rider" }));
    await waitFor(() => expect(api.inviteRider).toHaveBeenCalledWith("roma", "new@example.test", "Nuovo Rider"));
    await waitFor(() => expect(onChanged).toHaveBeenCalledTimes(1));
    expect(api.riders).toHaveBeenCalledTimes(2); expect(api.assignments).toHaveBeenCalledTimes(2);
    expect(document.body.textContent).not.toMatch(/(?:email|e-mail)\s+(?:è stata\s+)?inviata|inviat[oa]\s+(?:un[’']?\s*)?(?:email|e-mail)/i);
  });

  it("prevents blank or whitespace-only enablement and distinguishes activate/deactivate controls by rider name", async () => {
    const api = port(); const onChanged = vi.fn();
    render(<DeliveryAssignmentsPanel storeId="roma" orders={[]} api={api} onChanged={onChanged} />);
    await screen.findByRole("button", { name: "Disattiva Mario" });
    fireEvent.click(screen.getByRole("button", { name: "Abilita rider" }));
    fireEvent.change(screen.getByLabelText("Email rider"), { target: { value: "new@example.test" } });
    fireEvent.change(screen.getByLabelText("Nome rider"), { target: { value: "   " } });
    fireEvent.click(screen.getByRole("button", { name: "Abilita rider" }));
    expect(api.inviteRider).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Disattiva Mario" }));
    await waitFor(() => expect(api.setRiderActive).toHaveBeenCalledWith("roma", "mario", false));
    await waitFor(() => expect(onChanged).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole("button", { name: "Riattiva Luisa" }));
    await waitFor(() => expect(api.setRiderActive).toHaveBeenCalledWith("roma", "luisa", true));
    await waitFor(() => expect(onChanged).toHaveBeenCalledTimes(2));
    expect(screen.getByText("mario@example.test", { exact: false })).toBeTruthy();
    expect(screen.getByText("luisa@example.test", { exact: false })).toBeTruthy();
  });

  it("filters orders by store, delivery mode and lifecycle, and offers only active riders", async () => {
    const pickup = order("pickup"); pickup.cart.mode = "pickup";
    const api = port();
    render(<DeliveryAssignmentsPanel storeId="roma" orders={[order(), order("travelling", { status: "out_for_delivery" }), pickup,
      order("foreign", { storeId: "milano" }), order("completed", { status: "completed" }), order("cancelled", { status: "cancelled" })]} api={api} />);
    const select = await screen.findByLabelText("Rider per ordine o1");
    expect(screen.getByLabelText("Rider per ordine travelling")).toBeTruthy();
    for (const id of ["pickup", "foreign", "completed", "cancelled"]) expect(screen.queryByLabelText(`Rider per ordine ${id}`)).toBeNull();
    expect(screen.getAllByText("Cliente", { exact: false }).length).toBeGreaterThan(0);
    expect(screen.getAllByText("Via Roma 1", { exact: false }).length).toBeGreaterThan(0);
    const options = Array.from((select as HTMLSelectElement).options);
    expect(options.some(option => option.value === "mario")).toBe(true);
    expect(options.some(option => option.value === "luisa")).toBe(false);
    expect((screen.getByRole("button", { name: "Assegna per ordine o1" }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getAllByText("Non assegnato").length).toBeGreaterThan(0);
  });

  it("shows the assigned rider and issue, allows same-rider retry and links canonical cancellation guidance", async () => {
    const api = port([mario, luisa], [{ orderId: "o1", riderId: "mario", issue: { note: "Cliente assente", reportedAt: "2026-11-05T12:00:00.000Z" } }]);
    const onChanged = vi.fn();
    render(<DeliveryAssignmentsPanel storeId="roma" orders={[order("o1", { status: "out_for_delivery" })]} api={api} onChanged={onChanged} />);
    await screen.findByText("Cliente assente");
    expect(screen.getByText("Consegna da risolvere")).toBeTruthy();
    expect(screen.getAllByText(/Mario/).length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: "Area rider" }).getAttribute("href")).toBe("/rider");
    expect(screen.getByText("Per annullare un ordine e avviare il rimborso usa le azioni dell'ordine.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /annulla|rimborso/i })).toBeNull();
    fireEvent.change(screen.getByLabelText("Rider per ordine o1"), { target: { value: "mario" } });
    fireEvent.click(screen.getByRole("button", { name: "Assegna per ordine o1" }));
    await waitFor(() => expect(api.assign).toHaveBeenCalledWith("o1", "mario"));
    expect(api.assign).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(onChanged).toHaveBeenCalledTimes(1));
    expect(api.assignments).toHaveBeenCalledTimes(2);
  });

  it("disables mutations while a change is pending and prevents duplicate sends", async () => {
    const api = port(); const pending = deferred<DeliveryRider>(); const onChanged = vi.fn();
    vi.mocked(api.setRiderActive).mockReturnValue(pending.promise);
    render(<DeliveryAssignmentsPanel storeId="roma" orders={[order()]} api={api} onChanged={onChanged} />);
    const deactivate = await screen.findByRole("button", { name: "Disattiva Mario" });
    fireEvent.click(deactivate); fireEvent.click(deactivate);
    expect(api.setRiderActive).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("status").textContent).toContain("Aggiornamento consegne");
    for (const name of ["Abilita rider", "Disattiva Mario", "Riattiva Luisa", "Assegna per ordine o1"]) {
      expect((screen.getByRole("button", { name }) as HTMLButtonElement).disabled).toBe(true);
    }
    expect((screen.getByLabelText("Rider per ordine o1") as HTMLSelectElement).disabled).toBe(true);
    expect(onChanged).not.toHaveBeenCalled();
    await act(async () => pending.resolve({ ...mario, active: false }));
    await waitFor(() => expect(onChanged).toHaveBeenCalledTimes(1));
  });

  it("presents safe load and mutation errors, retries current data, and never claims a failed mutation succeeded", async () => {
    const api = port(); const onChanged = vi.fn();
    vi.mocked(api.riders).mockRejectedValueOnce(new Error("SQL password INTERNAL_SECRET"));
    vi.mocked(api.setRiderActive).mockRejectedValueOnce(new Error("provider stacktrace SECRET"));
    render(<DeliveryAssignmentsPanel storeId="roma" orders={[]} api={api} onChanged={onChanged} />);
    expect((await screen.findByRole("alert")).textContent).toContain("Impossibile caricare le consegne.");
    expect(document.body.textContent).not.toContain("INTERNAL_SECRET");
    fireEvent.click(screen.getByRole("button", { name: "Riprova" }));
    fireEvent.click(await screen.findByRole("button", { name: "Disattiva Mario" }));
    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("Impossibile aggiornare le consegne."));
    expect(document.body.textContent).not.toContain("stacktrace");
    expect(onChanged).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Riprova" }));
    await screen.findByRole("button", { name: "Disattiva Mario" });
    expect(api.riders).toHaveBeenLastCalledWith("roma");
  });

  it("reloads on refreshVersion changes and responds to authoritative orders prop updates", async () => {
    const api = port();
    const { rerender } = render(<DeliveryAssignmentsPanel storeId="roma" orders={[order()]} api={api} refreshVersion={1} />);
    await screen.findByLabelText("Rider per ordine o1");
    rerender(<DeliveryAssignmentsPanel storeId="roma" orders={[order("o2")]} api={api} refreshVersion={2} />);
    await waitFor(() => expect(api.riders).toHaveBeenCalledTimes(2));
    await screen.findByLabelText("Rider per ordine o2");
    expect(screen.queryByLabelText("Rider per ordine o1")).toBeNull();
    expect(api.assignments).toHaveBeenCalledTimes(2);
  });

  it("shows an empty state and prevents assignment without an active rider", async () => {
    const api = port([luisa]);
    const { rerender } = render(<DeliveryAssignmentsPanel storeId="roma" orders={[]} api={api} />);
    await screen.findByText("Nessuna consegna da assegnare.");
    rerender(<DeliveryAssignmentsPanel storeId="roma" orders={[order()]} api={api} />);
    expect((screen.getByRole("button", { name: "Assegna per ordine o1" }) as HTMLButtonElement).disabled).toBe(true);
    expect(api.assign).not.toHaveBeenCalled();
  });

  it("clears previous store data and ignores a late response for the previous store", async () => {
    const old = deferred<DeliveryRider[]>(); const current = deferred<DeliveryRider[]>();
    const api = port();
    vi.mocked(api.riders).mockReturnValueOnce(old.promise).mockReturnValueOnce(current.promise);
    const { rerender } = render(<DeliveryAssignmentsPanel storeId="roma" orders={[order()]} api={api} />);
    expect(screen.getByRole("status").textContent).toContain("Caricamento consegne");
    rerender(<DeliveryAssignmentsPanel storeId="milano" orders={[order("m1", { storeId: "milano" })]} api={api} />);
    await waitFor(() => expect(api.riders).toHaveBeenLastCalledWith("milano"));
    expect(screen.queryByLabelText("Rider per ordine o1")).toBeNull();
    await act(async () => current.resolve([{ id: "nina", storeId: "milano", email: "nina@example.test", name: "Nina", active: true }]));
    await screen.findByRole("button", { name: "Disattiva Nina" });
    await act(async () => old.resolve([mario]));
    expect(screen.queryByRole("button", { name: "Disattiva Mario" })).toBeNull();
    expect(screen.getByRole("button", { name: "Disattiva Nina" })).toBeTruthy();
  });

  it("removes visible previous-store errors during a store change", async () => {
    const pending = deferred<DeliveryRider[]>(); const api = port();
    vi.mocked(api.riders).mockRejectedValueOnce(new Error("old store failure")).mockReturnValueOnce(pending.promise);
    const { rerender } = render(<DeliveryAssignmentsPanel storeId="roma" orders={[]} api={api} />);
    await screen.findByRole("alert");
    rerender(<DeliveryAssignmentsPanel storeId="milano" orders={[]} api={api} />);
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByRole("status").textContent).toContain("Caricamento consegne");
    await act(async () => pending.resolve([]));
    await screen.findByText("Nessuna consegna da assegnare.");
  });

  it("ignores a successful mutation after unmount and does not call onChanged", async () => {
    const pending = deferred<DeliveryRider>(); const api = port(); const onChanged = vi.fn();
    vi.mocked(api.setRiderActive).mockReturnValue(pending.promise);
    const { unmount } = render(<DeliveryAssignmentsPanel storeId="roma" orders={[]} api={api} onChanged={onChanged} />);
    fireEvent.click(await screen.findByRole("button", { name: "Disattiva Mario" }));
    unmount();
    await act(async () => pending.resolve({ ...mario, active: false }));
    expect(onChanged).not.toHaveBeenCalled();
    expect(api.riders).toHaveBeenCalledTimes(1); expect(api.assignments).toHaveBeenCalledTimes(1);
  });
});
