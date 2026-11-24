import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveMenuComposition, type IndividualIngredient, type IndividualProduct } from "@pizzaos/domain";
import { MenuProductForm } from "../features/catalog/components/menu-product-form";
import { MenuFoodFields } from "../features/catalog/components/catalog-form-fields";

afterEach(cleanup);

describe("Allergeni dal Magazzino", () => {
  it("modifica la ricetta senza dichiarazioni manuali su prodotto e opzioni", () => {
    const ingredients: IndividualIngredient[] = [
      { id: "farina", name: "Farina", stock: 20, food: { contains: ["Glutine"], mayContain: [] } },
      { id: "formaggio", name: "Formaggio", stock: 20, food: { contains: ["Latte", "Glutine"], mayContain: ["Senape"] } }
    ];
    const product: IndividualProduct = {
      id: "prodotto", name: "Prodotto", description: "", priceCents: 800, available: true,
      allergens: [], ingredients: { farina: 1, formaggio: 1 }, foodIngredients: ingredients,
      options: [{ id: "extra", name: "Extra", priceCents: 100, ingredients: { formaggio: 1 } }]
    };
    const onChange = vi.fn();
    render(<MenuProductForm storeId="sede" product={product} index={0} ingredients={ingredients}
      products={[product]} sections={[]} onChange={onChange} onMove={vi.fn()}
      onRemove={vi.fn()} onClose={vi.fn()} onUpload={vi.fn()} />);
    expect(screen.queryByText(/^Allergeni ·/)).toBeNull();
    expect(screen.queryByLabelText("Informazioni allergeni verificate")).toBeNull();
    expect(resolveMenuComposition(product, []).composition).toMatchObject({
      contains: ["Glutine", "Latte"], mayContain: ["Senape"], foodComplete: true
    });
    fireEvent.click(screen.getByRole("button", { name: "Rimuovi Formaggio da Ricetta base" }));
    const updated = { ...product, ...onChange.mock.lastCall![0] };
    expect(resolveMenuComposition(updated, []).composition).toMatchObject({
      contains: ["Glutine"], mayContain: [], foodComplete: true
    });
    expect(resolveMenuComposition(updated, [{ optionId: "extra", quantity: 1 }]).composition).toMatchObject({
      contains: ["Glutine", "Latte"], mayContain: ["Senape"], foodComplete: true
    });
  });

  it("mantiene la dichiarazione degli allergeni sulle schede del Magazzino", () => {
    const onChange = vi.fn();
    render(<MenuFoodFields onChange={onChange} />);
    fireEvent.click(screen.getByLabelText("Informazioni allergeni verificate"));
    expect(onChange).toHaveBeenCalledWith({ contains: [], mayContain: [] });
  });
});
