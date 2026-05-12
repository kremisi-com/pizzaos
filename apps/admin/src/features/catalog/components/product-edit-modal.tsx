import type { Ingredient, Product } from "@pizzaos/domain";
import { deriveAllergensFromIngredients } from "@pizzaos/domain";
import { createIngredientFromName, INGREDIENT_CATALOG } from "@pizzaos/mock-data";
import { Button } from "@pizzaos/ui";
import { useEffect, useState, type ReactElement } from "react";
import styles from "./catalog-manager.module.css";

interface ProductEditModalProps {
  readonly product: Product;
  readonly onClose: () => void;
  readonly onSave: (product: Product) => void;
}

export function ProductEditModal({ product, onClose, onSave }: ProductEditModalProps): ReactElement
{
  const [editingName, setEditingName] = useState(product.name);
  const [editingDescription, setEditingDescription] = useState(product.description);
  const [editingBasePriceEuro, setEditingBasePriceEuro] = useState((product.basePrice.amountCents / 100).toFixed(2));
  const [editingIngredients, setEditingIngredients] = useState<string[]>(
    product.ingredients?.map((ingredient) => ingredient.name) ?? []
  );

  useEffect(() => {
    setEditingName(product.name);
    setEditingDescription(product.description);
    setEditingBasePriceEuro((product.basePrice.amountCents / 100).toFixed(2));
    setEditingIngredients(product.ingredients?.map((ingredient) => ingredient.name) ?? []);
  }, [product]);

  function updateIngredient(index: number, nextValue: string): void
  {
    setEditingIngredients((previous) => {
      const next = [...previous];
      next[index] = nextValue;
      return next;
    });
  }

  function saveProduct(): void
  {
    const ingredientObjects: readonly Ingredient[] = editingIngredients.map((name) => createIngredientFromName(name));
    const parsedPriceEuro = Number.parseFloat(editingBasePriceEuro);
    const resolvedPriceCents = Number.isFinite(parsedPriceEuro)
      ? Math.round(parsedPriceEuro * 100)
      : product.basePrice.amountCents;

    onSave({
      ...product,
      name: editingName.trim(),
      description: editingDescription.trim(),
      basePrice: {
        amountCents: Math.max(0, resolvedPriceCents),
        currencyCode: product.basePrice.currencyCode
      },
      ingredients: ingredientObjects,
      allergens: deriveAllergensFromIngredients(ingredientObjects)
    });
  }

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(event) => event.stopPropagation()}>
        <header className={styles.modalHeader}>
          <h3>Modifica Prodotto</h3>
          <button className={styles.closeButton} onClick={onClose}>&times;</button>
        </header>
        <form className={styles.form} noValidate onSubmit={(event) => {
          event.preventDefault();
          saveProduct();
          onClose();
        }}>
          <div className={styles.formGroup}>
            <label htmlFor="product-name">Nome</label>
            <input id="product-name" value={editingName} onChange={(event) => setEditingName(event.target.value)} className={styles.input} required />
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="product-desc">Descrizione</label>
            <textarea id="product-desc" value={editingDescription} onChange={(event) => setEditingDescription(event.target.value)} className={styles.textarea} required />
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="product-price">Prezzo base (EUR)</label>
            <input id="product-price" type="number" min="0" step="0.01" value={editingBasePriceEuro} onChange={(event) => setEditingBasePriceEuro(event.target.value)} className={styles.input} required />
          </div>
          <div className={styles.formGroup}>
            <label>Ingredienti</label>
            <div className={styles.productTags}>
              {editingIngredients.map((ingredientName, index) => (
                <div key={`ingredient-${index}`} className={styles.productActions}>
                  <select
                    aria-label={`Ingrediente ${index + 1}`}
                    value={ingredientName}
                    onChange={(event) => updateIngredient(index, event.target.value)}
                    className={styles.input}
                  >
                    {ingredientName.length > 0 && !INGREDIENT_CATALOG.some((ingredient) => ingredient.name === ingredientName) ? (
                      <option value={ingredientName}>{ingredientName}</option>
                    ) : null}
                    {INGREDIENT_CATALOG.map((ingredient) => (
                      <option key={ingredient.id} value={ingredient.name}>{ingredient.name}</option>
                    ))}
                  </select>
                  <Button variant="ghost" type="button" onClick={() => setEditingIngredients((previous) => previous.filter((_, i) => i !== index))}>
                    Rimuovi
                  </Button>
                </div>
              ))}
              <Button variant="secondary" type="button" onClick={() => setEditingIngredients((previous) => [...previous, INGREDIENT_CATALOG[0].name])}>
                + Aggiungi ingrediente
              </Button>
            </div>
          </div>
          <div className={styles.formGroup}>
            <label>Immagine (Mock Upload)</label>
            <div className={styles.imageUploadPlaceholder}><span>Trascina immagine o clicca per caricare</span></div>
          </div>
          <div className={styles.formActions}>
            <Button variant="secondary" type="button" onClick={onClose}>Annulla</Button>
            <Button variant="primary" type="submit">Salva Modifiche</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
