import "@testing-library/jest-dom/vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { IndividualStore } from "@pizzaos/domain";
import { StoreConfiguration } from "../features/individual-ordering/components/store-configuration";

afterEach(cleanup);

function setup(section: "inventory" | "profile" = "inventory") {
  const store: IndividualStore = {
    id: "roma", name: "Roma", latitude: 41.9, longitude: 12.5, acceptingOrders: true,
    ingredients: [{ id: "farina", name: "Farina", stock: 10 }], products: [], slots: [], deliveryBands: []
  };
  const onSave = vi.fn<(draft: IndividualStore, original: IndividualStore) => Promise<boolean>>().mockResolvedValue(true);
  render(<StoreConfiguration store={store} isNew={false} section={section} busy={false}
    onSearchAddress={vi.fn()} onSave={onSave} />);
  return { store, onSave };
}

describe("salvataggio automatico del magazzino", () => {
  it("salva scorte e nomi solo all'uscita dal campo, senza pulsante Salva", async () => {
    const { onSave } = setup();
    expect(screen.queryByRole("button", { name: "Salva configurazione" })).toBeNull();
    const stock = screen.getByLabelText("Scorta Farina");
    fireEvent.change(stock, { target: { value: "12" } });
    expect(onSave).not.toHaveBeenCalled();
    fireEvent.blur(stock);
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    await act(async () => {});
    fireEvent.blur(stock);
    expect(onSave).toHaveBeenCalledTimes(1);
    const name = screen.getByLabelText("Nome ingrediente 1");
    fireEvent.change(name, { target: { value: "Farina integrale" } });
    expect(onSave).toHaveBeenCalledTimes(1);
    fireEvent.blur(name);
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(2));
    expect(onSave.mock.lastCall?.[0].ingredients[0]).toMatchObject({ name: "Farina integrale", stock: 12 });
  });

  it("mantiene i campi editabili e salva in sequenza usando la precedente bozza riuscita", async () => {
    const { onSave, store } = setup();
    let finish!: (value: boolean) => void;
    onSave.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    const stock = screen.getByLabelText("Scorta Farina");
    fireEvent.change(stock, { target: { value: "12" } });
    fireEvent.blur(stock);
    expect(stock).toBeEnabled();
    fireEvent.change(stock, { target: { value: "15" } });
    fireEvent.blur(stock);
    expect(onSave).toHaveBeenCalledTimes(1);
    await act(async () => finish(true));
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(2));
    expect(onSave.mock.calls[0][1]).toEqual(store);
    expect(onSave.mock.calls[1][1].ingredients[0].stock).toBe(12);
    expect(onSave.mock.calls[1][0].ingredients[0].stock).toBe(15);
    expect(stock).toHaveValue(15);
  });

  it("conserva le modifiche dopo un errore e permette un nuovo tentativo esplicito", async () => {
    const { onSave } = setup();
    onSave.mockResolvedValueOnce(false);
    const stock = screen.getByLabelText("Scorta Farina");
    fireEvent.change(stock, { target: { value: "15" } });
    fireEvent.blur(stock);
    fireEvent.click(await screen.findByRole("button", { name: "Riprova salvataggio" }));
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(2));
    expect(stock).toHaveValue(15);
    await waitFor(() => expect(screen.queryByRole("button", { name: "Riprova salvataggio" })).toBeNull());
  });

  it("salva selezioni e rimozioni subito, ma attende un nome valido per un ingrediente nuovo", async () => {
    const { onSave } = setup();
    fireEvent.click(screen.getByLabelText("Possibile extra Farina"));
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    await act(async () => {});
    fireEvent.click(screen.getByRole("button", { name: "Aggiungi ingrediente" }));
    expect(onSave).toHaveBeenCalledTimes(1);
    const name = screen.getByLabelText("Nome ingrediente 2");
    fireEvent.change(name, { target: { value: "Latte" } });
    fireEvent.blur(name);
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(2));
    await act(async () => {});
    fireEvent.click(screen.getAllByRole("button", { name: "Rimuovi ingrediente" })[1]);
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(3));
    expect(onSave.mock.lastCall?.[0].ingredients).toHaveLength(1);
  });

  it("salva automaticamente anche il Profilo", async () => {
    const { onSave } = setup("profile");
    const name = screen.getByLabelText("Nome sede");
    fireEvent.change(name, { target: { value: "Roma centro" } });
    fireEvent.blur(name);
    expect(screen.queryByRole("button", { name: "Salva configurazione" })).toBeNull();
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
  });
});
