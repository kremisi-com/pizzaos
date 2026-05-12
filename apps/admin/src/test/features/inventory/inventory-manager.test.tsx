import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { InventoryManager } from "@/features/inventory/components/inventory-manager";
import type { Ingredient, InventoryItem } from "@pizzaos/domain";

const MOCK_INGREDIENTS: Ingredient[] = [
  {
    id: "ing-1",
    name: "Mozzarella Fior di Latte",
    allergens: []
  }
];

const MOCK_INVENTORY: InventoryItem[] = [
  {
    id: "i1",
    storeId: "s1",
    sku: "SKU1",
    ingredientId: "ing-1",
    availableUnits: 10,
    reorderThreshold: 5,
    status: "in_stock"
  }
];

describe("InventoryManager", () => {
  it("renders inventory table and ingredients", () => {
    render(
      <InventoryManager
        inventory={MOCK_INVENTORY}
        ingredients={MOCK_INGREDIENTS}
        onUpdateInventoryItem={vi.fn()}
      />
    );

    expect(screen.getByText("Disponibilita Ingredienti")).toBeDefined();
    expect(screen.getByText("Mozzarella Fior di Latte")).toBeDefined();
    expect(screen.getByText("SKU1")).toBeDefined();
    expect(screen.getByText("In Stock")).toBeDefined();
  });

  it("does not render dynamic pricing controls in inventory", () => {
    render(
      <InventoryManager
        inventory={MOCK_INVENTORY}
        ingredients={MOCK_INGREDIENTS}
        onUpdateInventoryItem={vi.fn()}
      />
    );

    expect(screen.queryByText(/Dynamic Pricing/i)).toBeNull();
  });

  it("shows low stock alert", () => {
    const lowStockInventory: InventoryItem[] = [
      {
        ...MOCK_INVENTORY[0],
        status: "low_stock",
        availableUnits: 3
      }
    ];

    render(
      <InventoryManager
        inventory={lowStockInventory}
        ingredients={MOCK_INGREDIENTS}
        onUpdateInventoryItem={vi.fn()}
      />
    );

    expect(screen.getByText("Scorte Basse")).toBeDefined();
    expect(screen.getByText("Solo 3 unità rimaste")).toBeDefined();
  });

  it("calls onUpdateInventoryItem with random units when 'Ripristina' is clicked", () => {
    const outOfStockInventory: InventoryItem[] = [
      {
        ...MOCK_INVENTORY[0],
        status: "out_of_stock",
        availableUnits: 0
      }
    ];
    const onUpdateInventoryItem = vi.fn();
    render(
      <InventoryManager
        inventory={outOfStockInventory}
        ingredients={MOCK_INGREDIENTS}
        onUpdateInventoryItem={onUpdateInventoryItem}
      />
    );

    const targetButton = screen.getAllByRole("button", { name: "Ripristina" })[0];
    fireEvent.click(targetButton);
    expect(onUpdateInventoryItem).toHaveBeenCalledWith("i1", "in_stock", expect.any(Number));
    const calls = onUpdateInventoryItem.mock.calls;
    expect(calls[0][2]).toBeGreaterThan(0);
  });
});
