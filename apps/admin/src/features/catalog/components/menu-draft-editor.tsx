import { materializePizzaMenu } from "@pizzaos/domain";
import type { IndividualIngredient, IndividualProduct, MenuDraft, OrderingMenuSection, PizzaEntry } from "@pizzaos/domain";
import { Button } from "@pizzaos/ui";
import { useState } from "react";
import { MenuProductForm } from "./menu-product-form";
import { PizzaCatalogEditor, PizzaEntryEditor } from "./pizza-catalog-editor";
import styles from "./operational-catalog.module.css";

const money = new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" });

function move<T>(items: readonly T[], index: number, offset: -1 | 1): T[] {
  const next = [...items];
  const target = index + offset;
  if (target >= 0 && target < next.length) {
    [next[index], next[target]] = [next[target], next[index]];
  }
  return next;
}

function MoveButtons({ label, index, count, onMove }: {
  label: string;
  index: number;
  count: number;
  onMove: (offset: -1 | 1) => void;
}) {
  return <>
    <Button type="button" variant="ghost" aria-label={`Sposta ${label} su`} disabled={index === 0}
      onClick={() => onMove(-1)}>↑</Button>
    <Button type="button" variant="ghost" aria-label={`Sposta ${label} giù`} disabled={index === count - 1}
      onClick={() => onMove(1)}>↓</Button>
  </>;
}

export function MenuDraftEditor({ draft, storeId, ingredients, onChange, onUpload }: {
  draft: MenuDraft;
  storeId: string;
  ingredients: readonly IndividualIngredient[];
  onChange: (draft: MenuDraft) => void;
  onUpload: (productId: string, file: File) => void;
}) {
  const [editingId, setEditingId] = useState("");
  const [removingId, setRemovingId] = useState("");
  const [editingSectionId, setEditingSectionId] = useState("");
  const productIndex = draft.products.findIndex(product => product.id === editingId);
  const editing = draft.products[productIndex];
  const editingSection = draft.sections.find(section => section.productIds.includes(editingId));
  const products = new Map(draft.products.map(product => [product.id, product]));

  function updateSection(id: string, change: Partial<OrderingMenuSection>) {
    onChange({ ...draft, sections: draft.sections.map(section => section.id === id ? { ...section, ...change } : section) });
  }

  function addProduct(section: OrderingMenuSection, source?: IndividualProduct) {
    if (source?.pizza) { addPizza(section, source.pizza.kind, source.id); return; }
    const id = crypto.randomUUID();
    const product: IndividualProduct = source
      ? { ...structuredClone(source), id, name: `Copia di ${source.name}` }
      : { id, name: "", description: "", priceCents: 0, available: true, allergens: [], ingredients: {}, options: [] };
    onChange({
      ...draft,
      products: [...draft.products, product],
      sections: draft.sections.map(item => item.id === section.id ? { ...item, productIds: [...item.productIds, id] } : item)
    });
    setEditingId(id);
  }

  function addPizza(section: OrderingMenuSection, kind: "taste" | "formula", sourceId?: string) {
    const catalog = draft.pizzaCatalog ?? { doughs: [], bases: [], formats: [], toppings: [], tastes: [], formulas: [] };
    const source = (kind === "taste" ? catalog.tastes : catalog.formulas).find(entry => entry.id === sourceId);
    const id = crypto.randomUUID();
    const entry: PizzaEntry = source ? { ...structuredClone(source), id, name: `Copia di ${source.name}` } : {
      id, name: kind === "taste" ? "Nuovo gusto" : "Nuova formula", description: "", priceCents: 0, available: true,
      standardDoughId: catalog.doughs[0]?.id ?? "", standardBaseId: catalog.bases[0]?.id ?? "", standardFormatId: catalog.formats[0]?.id ?? "",
      doughIds: catalog.doughs.map(item => item.id), baseIds: catalog.bases.map(item => item.id), formatIds: catalog.formats.map(item => item.id),
      toppingIds: catalog.toppings.map(item => item.id)
    };
    const pizzaCatalog = kind === "taste" ? { ...catalog, tastes: [...catalog.tastes,
      { ...entry, includedToppingIds: source && "includedToppingIds" in source ? source.includedToppingIds : [] }] }
      : { ...catalog, formulas: [...catalog.formulas,
        { ...entry, offer: source && "offer" in source ? source.offer : "Simple" as const }] };
    onChange(materializePizzaMenu({ ...draft, pizzaCatalog,
      sections: draft.sections.map(item => item.id === section.id ? { ...item, productIds: [...item.productIds, id] } : item) }));
    setEditingId(id);
  }

  function removeProduct(id: string) {
    setRemovingId(id);
  }

  function confirmRemoveProduct(id: string) {
    onChange({
      ...draft,
      ...(draft.pizzaCatalog ? { pizzaCatalog: { ...draft.pizzaCatalog,
        tastes: draft.pizzaCatalog.tastes.filter(item => item.id !== id).map(item => ({ ...item, pairingProductIds: item.pairingProductIds?.filter(reference => reference !== id) })),
        formulas: draft.pizzaCatalog.formulas.filter(item => item.id !== id).map(item => ({ ...item, pairingProductIds: item.pairingProductIds?.filter(reference => reference !== id) }))
      } } : {}),
      products: draft.products.filter(item => item.id !== id).map(product => product.pairingProductIds?.includes(id)
        ? { ...product, pairingProductIds: product.pairingProductIds.filter(reference => reference !== id) }
        : product),
      sections: draft.sections.map(section => ({ ...section, productIds: section.productIds.filter(reference => reference !== id) }))
    });
    if (editingId === id) setEditingId("");
    setRemovingId("");
  }

  return <div className={styles.stack}>
    <div className={styles.formGrid}>
      <label>Nome menu<input value={draft.name} required maxLength={200} onChange={event => onChange({ ...draft, name: event.target.value })} /></label>
      <label>Avvertenze dalla cucina<textarea value={draft.kitchenNotice ?? ""} maxLength={1000}
        onChange={event => onChange({ ...draft, kitchenNotice: event.target.value || undefined })} /></label>
    </div>
    <PizzaCatalogEditor draft={draft} ingredients={ingredients} onChange={onChange} />
    {draft.sections.map((section, index) => <section key={section.id} className={styles.section} aria-label={section.name || "Nuova sezione"}>
      <div className={styles.header}>
        <div className={styles.sectionTitle}>
          {editingSectionId === section.id ? <input aria-label={`Nome sezione ${index + 1}`}
            value={section.name} required maxLength={200} autoFocus
            onFocus={event => event.target.select()}
            onChange={event => updateSection(section.id, { name: event.target.value })}
            onBlur={() => setEditingSectionId("")}
            onKeyDown={event => {
              if (event.key === "Enter") {
                event.preventDefault();
                if (event.currentTarget.reportValidity()) setEditingSectionId("");
              }
            }} /> : <h3>{section.name || "Nuova sezione"}</h3>}
        </div>
        <div className={styles.actions}>
          <Button type="button" variant="ghost" onClick={() => setEditingSectionId(section.id)}>Modifica nome</Button>
          <MoveButtons label={section.name || "sezione"} index={index} count={draft.sections.length}
            onMove={offset => onChange({ ...draft, sections: move(draft.sections, index, offset) })} />
          {section.productIds.length === 0 && <Button type="button" variant="ghost" onClick={() => onChange({
            ...draft, sections: draft.sections.filter(item => item.id !== section.id)
          })}>Rimuovi sezione</Button>}
        </div>
      </div>
      <label>Descrizione<textarea value={section.description ?? ""} maxLength={1000}
        onChange={event => updateSection(section.id, { description: event.target.value || undefined })} /></label>
      <ul className={styles.productList}>
        {section.productIds.map((id, position) => {
          const product = products.get(id);
          if (!product) return null;
          return <li key={id}>
            <div className={styles.productRow}>
              <div>
                <strong>{product.name || "Nuovo prodotto"}</strong>
                <p className={styles.small}>{money.format(product.priceCents / 100)}{!product.available && " · Esaurito"}</p>
              </div>
              <div className={styles.actions}>
                <MoveButtons label={product.name || "prodotto"} index={position} count={section.productIds.length}
                  onMove={offset => updateSection(section.id, { productIds: move(section.productIds, position, offset) })} />
                <Button type="button" variant="ghost" onClick={() => addProduct(section, product)}
                  aria-label={`Duplica ${product.name || "prodotto"}`}>Duplica</Button>
                <Button type="button" variant={editingId === id ? "primary" : "secondary"} onClick={() => setEditingId(id)}
                  aria-label={`Modifica ${product.name || "prodotto"}`}>Modifica</Button>
                <Button type="button" variant="ghost" onClick={() => removeProduct(id)}
                  aria-label={`Elimina ${product.name || "prodotto"} dal menu`}
                  aria-expanded={removingId === id}>Elimina</Button>
              </div>
            </div>
            {removingId === id && <fieldset className={styles.confirm}>
              <legend>Eliminare {product.name || "questo prodotto"} dal menu?</legend>
              <p>Il prodotto e i suoi abbinamenti saranno rimossi dalla bozza. Salva e pubblica il menu per aggiornare quello visibile ai clienti.</p>
              <div className={styles.actions}>
                <Button type="button" variant="secondary" onClick={() => confirmRemoveProduct(id)}>Conferma eliminazione prodotto</Button>
                <Button type="button" variant="ghost" onClick={() => setRemovingId("")}>Annulla</Button>
              </div>
            </fieldset>}
            {editing?.pizza && editingId === id && editingSection?.id === section.id && (() => {
              const entry = (editing.pizza.kind === "taste" ? draft.pizzaCatalog?.tastes : draft.pizzaCatalog?.formulas)?.find(item => item.id === editing.id);
              return entry && <PizzaEntryEditor key={editing.id} draft={draft} entry={entry} kind={editing.pizza.kind} onChange={onChange}
                onRemove={() => removeProduct(editing.id)} onClose={() => setEditingId("")} onUpload={file => onUpload(editing.id, file)} />;
            })()}
            {editing && !editing.pizza && editingId === id && editingSection?.id === section.id && <MenuProductForm key={editing.id} storeId={storeId} product={editing} index={productIndex}
              ingredients={ingredients} products={draft.products} sections={draft.sections} sectionId={editingSection?.id}
              onChange={change => onChange({ ...draft, products: draft.products.map(product => product.id === editing.id ? { ...product, ...change } : product) })}
              onMove={sectionId => {
                if (sectionId === editingSection?.id) return;
                onChange({
                  ...draft,
                  sections: draft.sections.map(section => ({
                    ...section,
                    productIds: section.id === sectionId
                      ? [...section.productIds, editing.id]
                      : section.productIds.filter(id => id !== editing.id)
                  }))
                });
              }}
              onRemove={() => removeProduct(editing.id)} onClose={() => setEditingId("")}
              onUpload={file => onUpload(editing.id, file)} />}
          </li>;
        })}
      </ul>
      <div className={styles.actions}><Button type="button" variant="secondary" onClick={() => addProduct(section)}>Aggiungi prodotto</Button>
        <Button type="button" variant="secondary" onClick={() => addPizza(section, "taste")}>Aggiungi gusto</Button>
        <Button type="button" variant="secondary" onClick={() => addPizza(section, "formula")}>Aggiungi formula</Button></div>
    </section>)}
    <div><Button type="button" variant="secondary" onClick={() => onChange({
      ...draft, sections: [...draft.sections, { id: crypto.randomUUID(), name: "Nuova sezione", productIds: [] }]
    })}>Aggiungi sezione</Button></div>
  </div>;
}
