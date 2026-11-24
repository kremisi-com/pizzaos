import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { menuImagePath, type IndividualProduct } from "@pizzaos/domain";
import { MenuProductForm } from "../features/catalog/components/menu-product-form";

afterEach(cleanup);
const product: IndividualProduct = {
  id: "bibita", name: "Bibita", description: "", priceCents: 300,
  available: true, ingredients: {}, allergens: [], options: []
};
function editor(imageId?: string) {
  const onChange = vi.fn();
  const onUpload = vi.fn();
  const view = render(<MenuProductForm storeId="sede" product={{ ...product, imageId }} index={0}
    ingredients={[]} products={[product]} sections={[]} onChange={onChange} onUpload={onUpload}
    onMove={vi.fn()} onRemove={vi.fn()} onClose={vi.fn()} />);
  return { ...view, onChange, onUpload };
}

it("mostra il placeholder e consente il caricamento dalla card finale", () => {
  const { onUpload } = editor();
  const card = screen.getByRole("region", { name: "Foto del prodotto" });
  expect(within(card).getByRole("img", { name: "Nessuna foto disponibile" })).toBeVisible();
  expect(card.nextElementSibling).toHaveTextContent("Rimuovi prodotto dalla bozza");
  const file = new File(["foto"], "bibita.png", { type: "image/png" });
  fireEvent.change(within(card).getByLabelText(/Carica foto del prodotto/), { target: { files: [file] } });
  expect(onUpload).toHaveBeenCalledWith(file);
});

it("mostra la foto salvata e torna al placeholder se non è disponibile", () => {
  const { onChange } = editor("foto");
  const image = screen.getByRole("img", { name: "Foto di Bibita" });
  expect(new URL(image.getAttribute("src")!, window.location.origin).pathname).toBe(menuImagePath("sede", "foto"));
  fireEvent.error(image);
  expect(screen.getByRole("img", { name: "Nessuna foto disponibile" })).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Rimuovi foto" }));
  expect(onChange).toHaveBeenCalledWith({ imageId: undefined });
});
