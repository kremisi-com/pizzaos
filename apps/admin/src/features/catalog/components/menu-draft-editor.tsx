import { materializePizzaMenu, planProductClassification, PIZZA_EXTRA_OFFERS, syncPizzaInventory } from "@pizzaos/domain";
import type { IndividualIngredient, IndividualProduct, MenuDraft, OrderingMenuSection, PizzaEntry } from "@pizzaos/domain";
import { Button } from "@pizzaos/ui";
import { useState } from "react";
import { MenuProductForm } from "./menu-product-form";
import { blankPizzaCatalog, createPizzaEntry, PizzaCustomCard, PizzaSettingsPanel, PizzaTastePanel } from "./menu-pizza-panels";
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

export function MenuDraftEditor({ draft, storeId, ingredients, onChange, onUpload, onInventory }: {
  draft: MenuDraft;
  storeId: string;
  ingredients: readonly IndividualIngredient[];
  onChange: (draft: MenuDraft) => void;
  onUpload: (productId: string, file: File) => void;
  onInventory?: () => void;
}) {
  const [editingId, setEditingId] = useState("");
  const [removingId, setRemovingId] = useState("");
  const [editingSectionId, setEditingSectionId] = useState("");
  const [settings, setSettings] = useState(false);
  const [activeSectionId, setActiveSectionId] = useState("");
  const [classification, setClassification] = useState<{ productId: string; pizza: boolean } | null>(null);
  const [newProductIds, setNewProductIds] = useState<string[]>([]);
  const productIndex = draft.products.findIndex(product => product.id === editingId);
  const editing = draft.products[productIndex];
  const editingSection = draft.sections.find(section => section.productIds.includes(editingId));
  const products = new Map(draft.products.map(product => [product.id, product]));
  const activeSection = draft.sections.find(section => section.id === activeSectionId) ?? draft.sections[0];
  const catalog = draft.pizzaCatalog ?? blankPizzaCatalog();
  const taste = catalog.tastes.find(item => item.id === editingId);
  const classificationPlan = classification?.productId === editingId
    ? planProductClassification(draft, editingId, classification.pizza, ingredients, { newProduct: newProductIds.includes(editingId) }) : undefined;
  const refreshedCatalog = draft.pizzaCatalog ? syncPizzaInventory(draft, ingredients).pizzaCatalog : undefined;
  const extrasChanged = refreshedCatalog?.inventorySignature !== draft.pizzaCatalog?.inventorySignature;

  function ingredientSummary(product: IndividualProduct) {
    const entry = catalog.tastes.find(item => item.id === product.id);
    if (!entry) return product.description;
    const base = catalog.bases.find(item => item.id === (catalog.defaults?.baseId ?? entry.standardBaseId));
    return [...new Set([
      ...Object.keys(base?.ingredients ?? {}).map(id => ingredients.find(item => item.id === id)?.name ?? "Ingrediente da verificare"),
      ...catalog.toppings.filter(item => entry.includedToppingIds.includes(item.id)).map(item => item.name)
    ])].join(", ");
  }

  function updateSection(id: string, change: Partial<OrderingMenuSection>) {
    onChange({ ...draft, sections: draft.sections.map(section => section.id === id ? { ...section, ...change } : section) });
  }

  function addProduct(section: OrderingMenuSection, source?: IndividualProduct) {
    if (source?.pizza) { addPizza(section, source.pizza.kind, source.id); return; }
    const id = crypto.randomUUID();
    if (!source) setNewProductIds(current => [...current, id]);
    const product: IndividualProduct = source
      ? { ...structuredClone(source), id, name: `Copia di ${source.name}` }
      : { id, name: "", description: "", priceCents: 0, available: true, allergens: [], ingredients: {}, options: [] };
    onChange({
      ...draft,
      products: [...draft.products, product],
      sections: draft.sections.map(item => item.id === section.id ? { ...item, productIds: [...item.productIds, id] } : item)
    });
    setEditingId(id);
    setSettings(false);
  }

  function addPizza(section: OrderingMenuSection, kind: "taste" | "formula", sourceId?: string) {
    const catalog = draft.pizzaCatalog ?? blankPizzaCatalog();
    const source = (kind === "taste" ? catalog.tastes : catalog.formulas).find(entry => entry.id === sourceId);
    const id = crypto.randomUUID();
    const entry: PizzaEntry = source ? { ...structuredClone(source), id, name: `Copia di ${source.name}` } : { ...createPizzaEntry(catalog, kind), id };
    const pizzaCatalog = kind === "taste" ? { ...catalog, tastes: [...catalog.tastes,
      { ...entry, includedToppingIds: source && "includedToppingIds" in source ? source.includedToppingIds : [] }] }
      : { ...catalog, customEnabled: true, inventoryExtras: source ? catalog.inventoryExtras : true, formulas: [...catalog.formulas,
        { ...entry, extraOffer: source && "extraOffer" in source && source.extraOffer ? source.extraOffer
          : source && "offer" in source && source.offer ? PIZZA_EXTRA_OFFERS[source.offer] : { quota: 0, percent: 0 } }] };
    onChange(materializePizzaMenu(syncPizzaInventory({ ...draft, pizzaCatalog,
      sections: draft.sections.map(item => item.id === section.id ? { ...item, productIds: [...item.productIds, id] } : item) }, ingredients)));
    if (kind === "taste") { setEditingId(id); setSettings(false); }
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

  return <div className={styles.menuWorkspace}>
    <div className={styles.menuMain}>
    <div className={styles.menuMetadata}>
      <label><span className={styles.screenReaderOnly}>Nome menu</span><input className={styles.menuNameInput} value={draft.name} required maxLength={200} onChange={event => onChange({ ...draft, name: event.target.value })} /></label>
      <details className={styles.food}><summary>Avvertenze del menu</summary>
      <label>Avvertenze dalla cucina<textarea value={draft.kitchenNotice ?? ""} maxLength={1000}
        onChange={event => onChange({ ...draft, kitchenNotice: event.target.value || undefined })} /></label>
      </details>
    </div>
    <nav className={styles.categoryTabs} aria-label="Categorie del menu">
      <Button type="button" variant="secondary" style={{ borderColor: "var(--pizzaos-color-primary)" }} onClick={() => onChange({
        ...draft, sections: [...draft.sections, { id: crypto.randomUUID(), name: "Nuova sezione", productIds: [] }]
      })}>+ Categoria</Button>
      {draft.sections.map(section => <Button type="button" key={section.id}
      variant={activeSection?.id === section.id ? "primary" : "ghost"} onClick={() => setActiveSectionId(section.id)}>{section.name || "Nuova sezione"}</Button>)}</nav>
    {draft.sections.filter(section => section.id === activeSection?.id).map(section => { const index = draft.sections.findIndex(item => item.id === section.id); return <section key={section.id} className={`${styles.section} ${styles.menuCategory}`} aria-label={section.name || "Nuova sezione"}>
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
            <div className={`${styles.productRow} ${editingId === id && !settings ? styles.selectedRow : ""}`}>
              <div>
                <Button type="button" variant="ghost" className={styles.productNameButton} onClick={() => { setEditingId(id); setSettings(false); }}
                  aria-label={`Modifica ${product.name || "prodotto"}`}>{product.name || "Nuovo prodotto"}</Button>
                <p className={`${styles.small} ${styles.ingredientSummary}`}>{ingredientSummary(product)}{!product.available && " · Esaurito"}</p>
              </div>
              <strong className={styles.rowPrice}>{money.format(product.priceCents / 100)}</strong>
              <div className={styles.actions}>
                <MoveButtons label={product.name || "prodotto"} index={position} count={section.productIds.length}
                  onMove={offset => updateSection(section.id, { productIds: move(section.productIds, position, offset) })} />
                <Button type="button" variant="ghost" onClick={() => addProduct(section, product)}
                  aria-label={`Duplica ${product.name || "prodotto"}`} title="Duplica">⧉</Button>
                <Button type="button" variant="ghost" onClick={() => removeProduct(id)}
                  aria-label={`Elimina ${product.name || "prodotto"} dal menu`}
                  aria-expanded={removingId === id} title="Elimina">×</Button>
              </div>
            </div>
            {removingId === id && <fieldset className={styles.confirm}>
              <legend>Eliminare {product.name || "questo prodotto"} dal menu?</legend>
              <p>Il prodotto e i suoi abbinamenti saranno rimossi dalla bozza. Pubblica il menu per aggiornare quello visibile ai clienti.</p>
              <div className={styles.actions}>
                <Button type="button" variant="secondary" onClick={() => confirmRemoveProduct(id)}>Conferma eliminazione prodotto</Button>
                <Button type="button" variant="ghost" onClick={() => setRemovingId("")}>Annulla</Button>
              </div>
            </fieldset>}
          </li>;
        })}
      </ul>
      <div className={styles.actions}><Button type="button" variant="secondary" onClick={() => addProduct(section)}>Aggiungi prodotto</Button></div>
    </section>; })}
    <button type="button" className={`${styles.settingsCard} ${settings ? styles.selectedCard : ""}`} onClick={() => {
      setSettings(true); setEditingId("");
    }}><strong>Impasti, basi e formati</strong><span>{settings ? "In modifica" : "Personalizza"}</span>
      <small>{catalog.doughs.find(item => item.id === catalog.defaults?.doughId)?.name ?? catalog.doughs[0]?.name ?? "Configura impasto"} · {catalog.bases.find(item => item.id === catalog.defaults?.baseId)?.name ?? catalog.bases[0]?.name ?? "base"} · {catalog.formats.find(item => item.id === catalog.defaults?.formatId)?.name ?? catalog.formats[0]?.name ?? "formato"}</small>
      <small>Valgono per tutte le pizze. Cambiali solo se offri alternative.</small></button>
    {(catalog.tastes.length > 0 || catalog.formulas.length > 0) && <section className={styles.section} aria-label="Extra comuni dal Magazzino">
      <h3>Extra comuni dal Magazzino</h3>
      <p>Tutte le pizze propongono gli ingredienti con la spunta “Possibile extra”. Prezzi e dosi si gestiscono una sola volta nel Magazzino; le scorte determinano la disponibilità.</p>
      <p>{ingredients.filter(item => item.extra?.enabled).length} extra abilitati. Le aggiunte possono essere ripetute.</p>
      <ul>{ingredients.filter(item => item.extra?.enabled).map(item => <li key={item.id}>
        {item.name} · {item.extra?.priceCents == null ? "Prezzo da verificare" : money.format(item.extra.priceCents / 100)}
        {item.extra?.dose == null ? " · Dose da verificare" : ` · Dose ${item.extra.dose}`}
        {item.stock === null ? " · Scorta da verificare" : item.stock === 0 ? " · Esaurito" : ""}
      </li>)}</ul>
      {!ingredients.some(item => item.extra?.enabled) && <p>Nessun ingrediente ha la spunta Possibile extra.</p>}
      {extrasChanged && <p role="status">Gli extra della bozza sono da aggiornare. Controlla le scelte prima di pubblicare.</p>}
      {extrasChanged && <Button type="button" variant="secondary" onClick={() => onChange(syncPizzaInventory(draft, ingredients))}>Aggiorna extra della bozza</Button>}
      {onInventory && <Button type="button" variant="ghost" onClick={onInventory}>Apri Magazzino</Button>}
      <p className={styles.small}>Prezzi e dosi diventano visibili ai clienti solo dopo la pubblicazione del menu.</p>
    </section>}
    <PizzaCustomCard draft={draft} ingredients={ingredients} onChange={onChange} onInventory={onInventory}
      onRemove={removeProduct} onAdd={() => {
        const section = activeSection ?? { id: crypto.randomUUID(), name: "Pizza custom", productIds: [] };
        if (!activeSection) {
          const entry = createPizzaEntry(catalog, "formula");
          onChange(materializePizzaMenu(syncPizzaInventory({ ...draft, sections: [...draft.sections, { ...section, productIds: [entry.id] }],
            pizzaCatalog: { ...catalog, customEnabled: true, inventoryExtras: true, formulas: [...catalog.formulas, { ...entry, extraOffer: { quota: 0, percent: 0 } }] } }, ingredients)));
        } else addPizza(section, "formula");
      }} />
    {removingId && !draft.products.some(product => product.id === removingId) && <fieldset className={styles.confirm}>
      <legend>Eliminare {catalog.formulas.find(item => item.id === removingId)?.name || "combinazione"} dal menu?</legend>
      <Button type="button" onClick={() => confirmRemoveProduct(removingId)}>Conferma eliminazione prodotto</Button>
      <Button type="button" variant="ghost" onClick={() => setRemovingId("")}>Annulla</Button>
    </fieldset>}
    </div>
    <aside className={styles.menuDetail} aria-label="Scheda di modifica">
      {!settings && editing && editing.pizza?.kind !== "formula" && (editing.pizza || classificationPlan) && <div className={styles.stack}>
        {editing.pizza && <p className={styles.small}>Impasti, basi, formati ed extra comuni; ingredienti della ricetta rimovibili.</p>}
        {classificationPlan && <fieldset className={styles.confirm}>
          <legend>Cambiare tipo di prodotto?</legend>
          <ul>{classificationPlan.changes.map(change => <li key={change}>{change}</li>)}</ul>
          {classificationPlan.errors.map(error => <p key={error} role="alert">{error}</p>)}
          <p>La modifica riguarda questa bozza. Il menu cliente cambia soltanto alla pubblicazione.</p>
          <div className={styles.actions}>
            <Button type="button" disabled={!classificationPlan.draft} onClick={() => {
              if (!classification) return;
              const plan = planProductClassification(draft, editingId, classification.pizza, ingredients, { newProduct: newProductIds.includes(editingId) });
              if (plan.draft) { onChange(plan.draft); setClassification(null); }
            }}>Conferma cambio tipo</Button>
            <Button type="button" variant="ghost" onClick={() => setClassification(null)}>Annulla cambio tipo</Button>
          </div>
        </fieldset>}
      </div>}
      {settings ? <PizzaSettingsPanel draft={draft} ingredients={ingredients} onChange={onChange} onClose={() => setSettings(false)} /> : taste ? <PizzaTastePanel key={taste.id} draft={draft} taste={taste} ingredients={ingredients} onChange={onChange}
        headerActions={<label className={styles.check}><input type="checkbox" checked={Boolean(editing?.pizza)}
          onChange={event => setClassification({ productId: editingId, pizza: event.target.checked })} />Pizza</label>} onClose={() => setEditingId("")} onRemove={() => removeProduct(taste.id)} onUpload={file => onUpload(taste.id, file)} />
      : editing && !editing.pizza ? <MenuProductForm key={editing.id} storeId={storeId} product={editing} index={productIndex}
        ingredients={ingredients} products={draft.products} sections={draft.sections} sectionId={editingSection?.id}
        headerActions={<label className={styles.check}><input type="checkbox" checked={Boolean(editing?.pizza)}
          onChange={event => setClassification({ productId: editingId, pizza: event.target.checked })} />Pizza</label>}
        onChange={change => onChange({ ...draft, products: draft.products.map(product => product.id === editing.id ? { ...product, ...change } : product) })}
        onMove={sectionId => onChange({ ...draft, sections: draft.sections.map(section => ({ ...section,
          productIds: section.id === sectionId ? [...section.productIds.filter(id => id !== editing.id), editing.id] : section.productIds.filter(id => id !== editing.id)
        })) })} onRemove={() => removeProduct(editing.id)} onClose={() => setEditingId("")} onUpload={file => onUpload(editing.id, file)} />
      : <section className={styles.productEditor}><h3>Il tuo menu, una pizza alla volta</h3><p>Scegli una pizza da modificare oppure personalizza impasti, basi e formati.</p></section>}
    </aside>
  </div>;
}
