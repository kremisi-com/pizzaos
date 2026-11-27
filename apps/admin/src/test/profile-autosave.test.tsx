import "@testing-library/jest-dom/vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import type { IndividualStore } from "@pizzaos/domain";
import { StoreConfiguration } from "../features/individual-ordering/components/store-configuration";

afterEach(cleanup);

function setup(isNew = false) {
  const store: IndividualStore = {
    id: "roma", name: "Roma", address: "Via Roma 1", latitude: 41.9, longitude: 12.5,
    acceptingOrders: true, ingredients: [], products: [], slots: [], deliveryBands: []
  };
  const onSave = vi.fn<(draft: IndividualStore, original: IndividualStore, confirmation?: string) => Promise<boolean | IndividualStore>>().mockResolvedValue(true);
  const onSearchAddress = vi.fn(async () => [{ address: "Via Roma 2", confirmation: "confirmed" }]);
  const props = { store, isNew, section: "profile" as const, busy: false, onSave, onSearchAddress };
  const view = render(<StoreConfiguration {...props} />);
  return { ...view, props, onSave };
}

it("serializza le modifiche del Profilo e lascia i campi editabili durante il salvataggio", async () => {
  const { onSave, rerender, props } = setup();
  let finish!: (value: boolean) => void;
  onSave.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  const name = screen.getByLabelText("Nome sede");
  fireEvent.change(name, { target: { value: "Roma centro" } });
  expect(onSave).not.toHaveBeenCalled();
  fireEvent.blur(name);
  rerender(<StoreConfiguration {...props} busy />);
  expect(name).toBeEnabled();
  fireEvent.click(screen.getByLabelText("Accetta nuovi ordini"));
  expect(onSave).toHaveBeenCalledTimes(1);
  await act(async () => finish(true));
  await waitFor(() => expect(onSave).toHaveBeenCalledTimes(2));
  expect(onSave.mock.calls[1][0]).toMatchObject({ name: "Roma centro", acceptingOrders: false });
  expect(onSave.mock.calls[1][1]).toMatchObject({ name: "Roma centro", acceptingOrders: true });
});

it("attende valori validi e consente di riprovare dopo un errore senza perdere la bozza", async () => {
  const { onSave } = setup();
  const email = screen.getByLabelText("Email del ristorante");
  fireEvent.change(email, { target: { value: "incompleta" } });
  fireEvent.blur(email);
  expect(onSave).not.toHaveBeenCalled();
  onSave.mockResolvedValueOnce(false);
  fireEvent.change(email, { target: { value: "roma@example.test" } });
  fireEvent.blur(email);
  const retry = await screen.findByRole("button", { name: "Riprova salvataggio" });
  expect(onSave).toHaveBeenCalledTimes(1);
  expect(email).toHaveValue("roma@example.test");
  fireEvent.click(retry);
  await waitFor(() => expect(onSave).toHaveBeenCalledTimes(2));
});

it("usa la revisione del calendario salvato conservando le modifiche in coda e i dati aggiornati dal servizio", async () => {
  const { onSave } = setup();
  let finish!: (value: IndividualStore) => void;
  onSave.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  const capacity = screen.getAllByRole("spinbutton", { name: /^Massimo ordini/ })[0];
  fireEvent.change(capacity, { target: { value: "12" } });
  fireEvent.blur(capacity);
  const submitted = onSave.mock.calls[0][0];
  fireEvent.change(capacity, { target: { value: "17" } });
  fireEvent.blur(capacity);
  const saved = { ...submitted, contactPhone: "0612345", orderSchedule: { ...submitted.orderSchedule!, revision: 1 } };
  await act(async () => finish(saved));
  await waitFor(() => expect(onSave).toHaveBeenCalledTimes(2));
  expect(onSave.mock.calls[1][1]).toEqual(saved);
  expect(onSave.mock.calls[1][0]).toMatchObject({ contactPhone: "0612345", orderSchedule: { revision: 1 } });
  expect(capacity).toHaveValue(17);
  expect(screen.getByLabelText("WhatsApp del ristorante")).toHaveValue("0612345");
});

it("salva l'indirizzo dopo la conferma e non riusa il token nei salvataggi successivi", async () => {
  const { onSave } = setup();
  const address = screen.getByLabelText("Indirizzo della sede");
  fireEvent.change(address, { target: { value: "Via Roma" } });
  fireEvent.blur(address);
  expect(onSave).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Cerca indirizzo" }));
  fireEvent.click(await screen.findByRole("button", { name: "Conferma Via Roma 2" }));
  await waitFor(() => expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ address: "Via Roma 2" }), expect.anything(), "confirmed"));
  await act(async () => {});
  fireEvent.click(screen.getByLabelText("Accetta nuovi ordini"));
  await waitFor(() => expect(onSave).toHaveBeenCalledTimes(2));
  expect(onSave.mock.calls[1][2]).toBeUndefined();
});

it("salva capacità, rimozioni del calendario e zone di consegna", async () => {
  const { onSave } = setup();
  const capacity = screen.getAllByRole("spinbutton", { name: /^Massimo ordini/ })[0];
  fireEvent.change(capacity, { target: { value: "12" } });
  fireEvent.blur(capacity);
  await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
  await act(async () => {});
  fireEvent.click(screen.getAllByRole("button", { name: /^Rimuovi fascia/ })[0]);
  await waitFor(() => expect(onSave).toHaveBeenCalledTimes(2));
  await act(async () => {});
  fireEvent.click(screen.getByRole("button", { name: "Aggiungi zona di consegna" }));
  await waitFor(() => expect(onSave).toHaveBeenCalledTimes(3));
  expect(onSave.mock.lastCall?.[0].deliveryBands).toEqual([{ upToKm: 1, feeCents: 0, minimumCents: 0 }]);
});

it("mantiene la creazione sede esplicita", () => {
  const { onSave } = setup(true);
  fireEvent.change(screen.getByLabelText("Nome sede"), { target: { value: "Roma centro" } });
  fireEvent.blur(screen.getByLabelText("Nome sede"));
  expect(onSave).not.toHaveBeenCalled();
  expect(screen.getByRole("button", { name: "Crea sede" })).toBeInTheDocument();
});
