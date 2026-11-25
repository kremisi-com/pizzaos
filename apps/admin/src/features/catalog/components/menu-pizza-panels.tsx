import { MenuPairingSelect } from "./menu-pairing-select";
import { applyPizzaDefaults, materializePizzaMenu, PIZZA_EXTRA_OFFERS, simplifyPizzaInventory, syncPizzaInventory } from "@pizzaos/domain";
import type { IndividualIngredient, MenuDraft, PizzaCatalog, PizzaComponent, PizzaEntry, PizzaFormula, PizzaTaste } from "@pizzaos/domain";
import { Button } from "@pizzaos/ui";
import { useRef, useState, type ReactNode } from "react";
import { MenuPriceField } from "./catalog-form-fields";
import { hasMenuProductChoices, MenuProductChoices } from "./menu-product-form";
import styles from "./operational-catalog.module.css";

export const blankPizzaCatalog = (): PizzaCatalog => ({ inventoryMode: "dough-format", doughs: [], bases: [], formats: [], toppings: [], tastes: [], formulas: [] });

export function PizzaTastePanel({ draft, taste, ingredients, onChange, onClose, onRemove, onUpload, headerActions }: {
  headerActions?: ReactNode;
  draft: MenuDraft; taste: PizzaTaste; ingredients: readonly IndividualIngredient[];
  onChange: (draft: MenuDraft) => void; onClose: () => void; onRemove: () => void;
  onUpload: (file: File) => void;
}) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const catalog = draft.pizzaCatalog ?? blankPizzaCatalog();
  function update(change: Partial<PizzaTaste>, nextCatalog = catalog) {
    onChange(materializePizzaMenu({ ...draft, pizzaCatalog: { ...nextCatalog,
      tastes: nextCatalog.tastes.map(item => item.id === taste.id ? { ...item, ...change } : item) } }));
  }
  const included = catalog.toppings.filter(item => taste.includedToppingIds.includes(item.id)).map(item => {
    const ids = Object.keys(item.ingredients);
    const ingredient = ids.length === 1 ? ingredients.find(value => value.id === ids[0]) : undefined;
    return ingredient ? { ...item, name: ingredient.name } : item;
  });
  const projected = draft.products.find(product => product.id === taste.id);
  function toggle(ingredient: IndividualIngredient, checked: boolean) {
    const candidates = catalog.toppings.filter(item => !item.inventoryIngredientId
      && Object.keys(item.ingredients).length === 1 && Object.hasOwn(item.ingredients, ingredient.id));
    if (!checked) {
      const matchingIds = new Set(candidates.map(item => item.id));
      update({ includedToppingIds: taste.includedToppingIds.filter(id => !matchingIds.has(id)) });
      return;
    }
    const existing = candidates.find(item => item.ingredients[ingredient.id] === 1);
    const preferredId = `ingredient:${ingredient.id}`;
    const id = existing?.id ?? (catalog.toppings.some(item => item.id === preferredId) ? `ingredient:${crypto.randomUUID()}` : preferredId);
    const nextCatalog = existing ? catalog : { ...catalog, toppings: [...catalog.toppings, {
      id, name: ingredient.name, description: "", priceCents: ingredient.extra?.priceCents ?? 0,
      available: true, category: "Extra", ingredients: { [ingredient.id]: 1 }, food: ingredient.food
    }] };
    update({ includedToppingIds: checked ? [...taste.includedToppingIds, id] : taste.includedToppingIds.filter(value => value !== id) }, nextCatalog);
  }
  return <section className={styles.productEditor} aria-label="Modifica pizza">
    <div className={styles.header}><div><p className={styles.small}>Modifica pizza</p><h3>{taste.name || "Nuova pizza"}</h3></div>
      <div className={styles.productHeaderActions}>{headerActions}
        <Button type="button" variant="ghost" onClick={onClose} aria-label="Chiudi scheda pizza">×</Button>
      </div></div>
    <label>Nome pizza<input required maxLength={200} value={taste.name} onChange={event => update({ name: event.target.value })} /></label>
    <label>Descrizione<textarea maxLength={2000} value={taste.description} onChange={event => update({ description: event.target.value })} /></label>
    <RecommendedDoughSelect catalog={catalog} entry={taste} onChange={recommendedDoughId => update({ recommendedDoughId })} />
    <div className={styles.ingredientSelect}>
      <span className={styles.fieldLabel}>Ingredienti</span>
      <button className={styles.selectTrigger} type="button" aria-label="Seleziona ingredienti" aria-expanded={open} onClick={() => setOpen(value => !value)}>
        <span>{included.length ? included.map(item => item.name).join(", ") : "Scegli gli ingredienti"}</span><span aria-hidden="true">⌄</span>
      </button>
      {included.length > 0 && <div className={styles.chips}>{included.map(item => <button type="button" key={item.id}
        aria-label={`Rimuovi ${item.name} dagli ingredienti`} onClick={() => update({ includedToppingIds: taste.includedToppingIds.filter(id => id !== item.id) })}>{item.name} ×</button>)}</div>}
      {open && <div className={styles.ingredientOptions}>
        <label><span className={styles.screenReaderOnly}>Cerca ingrediente</span><input type="search" placeholder="Cerca ingrediente…" value={search} onChange={event => setSearch(event.target.value)} /></label>
        {ingredients.filter(item => item.name.toLocaleLowerCase("it-IT").includes(search.toLocaleLowerCase("it-IT"))).map(ingredient => {
          const matches = included.filter(item => item.inventoryIngredientId === ingredient.id
            || Object.keys(item.ingredients).length === 1 && Object.hasOwn(item.ingredients, ingredient.id));
          return <label className={styles.check} key={ingredient.id}><input type="checkbox" checked={matches.length > 0}
            onChange={event => toggle(ingredient, event.target.checked)} />{ingredient.name}</label>;
        })}
        {!ingredients.length && <p>Aggiungi prima gli ingredienti in Magazzino.</p>}
        {ingredients.length > 0 && !ingredients.some(item => item.name.toLocaleLowerCase("it-IT").includes(search.toLocaleLowerCase("it-IT"))) && <p>Nessun ingrediente corrisponde alla ricerca.</p>}
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Chiudi ingredienti</Button>
      </div>}
    </div>
    <MenuPriceField label="Prezzo in euro" cents={taste.priceCents} onChange={priceCents => update({ priceCents })} />
    <details className={styles.food}><summary>Foto e altre opzioni</summary>
      <p className={styles.small}>Ogni ingrediente della pizza si seleziona una sola volta.</p>
      <label className={styles.check}><input type="checkbox" checked={taste.available}
        onChange={event => update({ available: event.target.checked })} />Disponibile per l’ordinazione</label>
      <label>Foto<input type="file" accept="image/jpeg,image/png,image/webp" onChange={event => {
        const file = event.currentTarget.files?.[0]; if (file) onUpload(file); event.currentTarget.value = "";
      }} /></label>
      {taste.imageId && <Button type="button" variant="ghost" onClick={() => update({ imageId: undefined })}>Rimuovi foto</Button>}
      <MenuPairingSelect productId={taste.id} products={draft.products} selectedIds={taste.pairingProductIds}
        onChange={pairingProductIds => update({ pairingProductIds })} />
      {projected && taste.customizations && hasMenuProductChoices(taste.customizations) && <details className={styles.food}><summary>Scelte specifiche del prodotto</summary>
        <p>Qui puoi modificare le scelte già configurate. Gestisci le nuove aggiunte con abbinamenti consigliati o categorie dedicate.</p>
        <MenuProductChoices product={{ ...projected, options: taste.customizations?.options ?? [], groups: taste.customizations?.groups }}
          ingredients={ingredients} onChange={change => update({ customizations: {
            options: change.options ?? taste.customizations?.options ?? [],
            ...(change.groups ?? taste.customizations?.groups ? { groups: change.groups ?? taste.customizations?.groups } : {})
          } })} />
      </details>}
      <Button type="button" variant="ghost" onClick={onRemove}>Rimuovi gusto dalla bozza</Button>
    </details>
  </section>;
}

const dimensions = [
  { key: "doughs", title: "Impasti", singular: "impasto", defaultKey: "doughId" },
  { key: "formats", title: "Formati", singular: "formato", defaultKey: "formatId" }
] as const;

function RecommendedDoughSelect({ catalog, entry, onChange }: {
  catalog: PizzaCatalog; entry: PizzaEntry; onChange: (id: string | undefined) => void;
}) {
  return <label>Impasto consigliato<select value={entry.recommendedDoughId ?? ""}
    onChange={event => onChange(event.target.value || undefined)}>
    <option value="">Nessuno</option>
    {catalog.doughs.filter(dough => catalog.defaults || entry.doughIds.includes(dough.id))
      .map(dough => <option key={dough.id} value={dough.id}>{dough.name}</option>)}
  </select></label>;
}

function DoughInventorySelect({ dough, ingredients, onChange }: {
  dough: PizzaComponent; ingredients: readonly IndividualIngredient[]; onChange: (id: string | undefined) => void;
}) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const trigger = useRef<HTMLButtonElement>(null);
  function close() { setOpen(false); trigger.current?.focus(); }
  const selected = ingredients.find(item => item.id === dough.inventoryIngredientId);
  const filtered = ingredients.filter(item => item.name.toLocaleLowerCase("it-IT").includes(filter.trim().toLocaleLowerCase("it-IT")));
  return <div className={styles.ingredientSelect} onKeyDown={event => { if (event.key === "Escape") close(); }}>
    <span className={styles.small}>Elemento di magazzino</span>
    <button ref={trigger} type="button" className={styles.selectTrigger} aria-label={`Elemento di magazzino ${dough.name}`} aria-expanded={open}
      onClick={() => { setOpen(value => !value); setFilter(""); }}>
      <span>{selected?.name ?? (dough.inventoryIngredientId ? "Elemento da verificare" : "Scegli dal Magazzino")}</span><span aria-hidden="true">⌄</span>
    </button>
    {open && <div className={styles.ingredientOptions}>
      <label><span className={styles.screenReaderOnly}>Cerca elemento di magazzino {dough.name}</span>
        <input type="search" autoFocus placeholder="Cerca nel Magazzino…" value={filter} onChange={event => setFilter(event.target.value)} /></label>
      {filtered.map(item => <Button key={item.id} type="button" aria-pressed={item.id === selected?.id} variant={item.id === selected?.id ? "secondary" : "ghost"}
        onClick={() => { onChange(item.id); close(); }}>{item.name}</Button>)}
      {!filtered.length && <p>{ingredients.length ? "Nessun elemento trovato." : "Aggiungi prima un elemento in Magazzino."}</p>}
      {dough.inventoryIngredientId && <Button type="button" variant="ghost" onClick={() => { onChange(undefined); close(); }}>Rimuovi associazione</Button>}
      <Button type="button" variant="ghost" onClick={close}>Chiudi selezione</Button>
    </div>}
  </div>;
}

export function PizzaSettingsPanel({ draft: sourceDraft, ingredients, onChange, onClose }: {
  draft: MenuDraft; ingredients: readonly IndividualIngredient[]; onChange: (draft: MenuDraft) => void; onClose: () => void;
}) {
  const draft = simplifyPizzaInventory(sourceDraft, ingredients);
  const catalog = draft.pizzaCatalog ?? blankPizzaCatalog();
  const defaults = catalog.defaults ?? { doughId: catalog.tastes[0]?.standardDoughId ?? catalog.formulas[0]?.standardDoughId ?? catalog.doughs[0]?.id ?? "",
    baseId: "",
    formatId: catalog.tastes[0]?.standardFormatId ?? catalog.formulas[0]?.standardFormatId ?? catalog.formats[0]?.id ?? "" };
  function update(next: PizzaCatalog) { onChange(materializePizzaMenu({ ...draft, pizzaCatalog: applyPizzaDefaults({ ...next, defaults: next.defaults ?? defaults }) })); }
  function changeComponent(key: "doughs" | "formats", id: string, change: Partial<PizzaComponent>) {
    update({ ...catalog, [key]: catalog[key].map(item => item.id === id ? { ...item, ...change } : item) });
  }
  return <section className={styles.productEditor} aria-label="Impasti e formati">
    <div className={styles.header}><div><p className={styles.small}>Configurazione del menu</p><h3>Impasti e formati</h3></div>
      <Button type="button" variant="ghost" onClick={onClose} aria-label="Chiudi configurazione">×</Button></div>
    {dimensions.map(dimension => {
      const standard = catalog[dimension.key].find(item => item.id === defaults[dimension.defaultKey]);
      return <section className={styles.dimension} key={dimension.key} aria-label={dimension.title}>
        <h4>{dimension.title}</h4>
        {catalog[dimension.key].map(component => <div className={styles.componentItem} key={component.id}>
          <div className={styles.componentRow}>
          <label className={styles.standardChoice}><input type="radio" name={`standard-${dimension.key}`} aria-label={`${component.name} standard`}
            checked={component.id === defaults[dimension.defaultKey]} onChange={() => update({ ...catalog, defaults: { ...defaults, [dimension.defaultKey]: component.id } })} />
            <span className={styles.screenReaderOnly}>Standard</span></label>
          <label><span className={styles.screenReaderOnly}>Nome {dimension.singular}</span><input value={component.name} required maxLength={200}
            onChange={event => changeComponent(dimension.key, component.id, { name: event.target.value })} /></label>
          <label><span className={styles.small}>Supplemento €</span><input type="number" step="0.01" inputMode="decimal" required
            value={(component.priceCents - (standard?.priceCents ?? 0)) / 100} disabled={component.id === standard?.id}
            onChange={event => {
              const desired = Math.round(Number(event.target.value) * 100) + (standard?.priceCents ?? 0);
              const shift = Math.max(0, -desired);
              update({ ...catalog, [dimension.key]: catalog[dimension.key].map(item => ({ ...item, priceCents: (item.id === component.id ? desired : item.priceCents) + shift })) });
            }} /></label>
          </div>
          {dimension.key === "doughs" ? <DoughInventorySelect dough={component} ingredients={ingredients}
            onChange={inventoryIngredientId => changeComponent("doughs", component.id, { inventoryIngredientId, ingredients: {} })} />
            : <label>Quantità impasto {component.name}<input type="number" min={1} step={1} inputMode="numeric" required
              value={component.doughQuantity ?? ""} placeholder="Da verificare"
              onChange={event => changeComponent("formats", component.id, { doughQuantity: event.target.value === "" ? null : Number(event.target.value) })} /></label>}
          <label className={styles.check}><input type="checkbox" checked={component.available}
            onChange={event => changeComponent(dimension.key, component.id, { available: event.target.checked })} />Disponibile</label>
        </div>)}
        <Button type="button" variant="ghost" onClick={() => {
          const component: PizzaComponent = { id: crypto.randomUUID(), name: `Nuovo ${dimension.singular}`, description: "", priceCents: standard?.priceCents ?? 0, available: true, ingredients: {},
            ...(dimension.key === "formats" ? { doughQuantity: null } : {}) };
          update({ ...catalog, [dimension.key]: [...catalog[dimension.key], component], defaults: { ...defaults, [dimension.defaultKey]: defaults[dimension.defaultKey] || component.id } });
        }}>+ Aggiungi {dimension.singular}</Button>
      </section>;
    })}
    <Button type="button" variant="ghost" onClick={onClose}>Chiudi configurazione</Button>
  </section>;
}

export function PizzaCustomCard({ draft, ingredients, onChange, onAdd, onRemove }: {
  draft: MenuDraft; ingredients: readonly IndividualIngredient[]; onChange: (draft: MenuDraft) => void;
  onAdd: () => void; onRemove: (id: string) => void; onInventory?: () => void;
}) {
  const [selectedId, setSelectedId] = useState("");
  const catalog = draft.pizzaCatalog ?? blankPizzaCatalog();
  const selected = catalog.formulas.find(item => item.id === selectedId) ?? (selectedId === "latest" ? catalog.formulas.at(-1) : catalog.formulas[0]);
  const enabled = catalog.customEnabled ?? catalog.formulas.length > 0;
  function updateCatalog(next: PizzaCatalog) { onChange(materializePizzaMenu(syncPizzaInventory({ ...draft, pizzaCatalog: next }, ingredients))); }
  function update(change: Partial<PizzaFormula>) {
    if (selected) updateCatalog({ ...catalog, formulas: catalog.formulas.map(item => item.id === selected.id ? { ...item, ...change } : item) });
  }
  const offer = selected?.extraOffer ?? (selected?.offer ? PIZZA_EXTRA_OFFERS[selected.offer] : undefined) ?? { quota: 0, percent: 0 };
  return <section className={styles.section} aria-label="Pizza custom">
    <div className={styles.header}><h3>Pizza custom</h3><label className={styles.check}><input type="checkbox" role="switch" aria-label="Pizza custom" checked={enabled} onChange={event => updateCatalog({ ...catalog, customEnabled: event.target.checked })} />{enabled ? "Attivo" : "Disattivato"}</label></div>
    <p className={styles.small}>{enabled ? "Crea le tue combinazioni, con il nome che preferisci." : "Attiva le pizze personalizzabili e crea le tue combinazioni."}</p>
    {enabled && <>
      <div className={styles.actions}>{catalog.formulas.map(formula => <Button key={formula.id} type="button" variant={selected?.id === formula.id ? "primary" : "secondary"} onClick={() => setSelectedId(formula.id)}>{formula.name || "Nuova combinazione"}</Button>)}
        <Button type="button" variant="ghost" onClick={() => { setSelectedId("latest"); onAdd(); }}>+ Aggiungi combinazione</Button></div>
      {selected && <>
        <label>Nome combinazione<input value={selected.name} required maxLength={200} onChange={event => update({ name: event.target.value })} /></label>
        <label>Descrizione<textarea value={selected.description} maxLength={2000} onChange={event => update({ description: event.target.value })} /></label>
        <RecommendedDoughSelect catalog={catalog} entry={selected} onChange={recommendedDoughId => update({ recommendedDoughId })} />
        <div className={styles.threeFields}>
          <MenuPriceField label="Prezzo base in euro" cents={selected.priceCents} onChange={priceCents => update({ priceCents })} />
          <label>Numero di extra scontati<input type="number" min={0} max={100} step={1} value={offer.quota} onChange={event => update({ extraOffer: { ...offer, quota: Number(event.target.value) } })} /></label>
          <label>Sconto sugli extra %<input type="number" min={0} max={100} step={1} value={offer.percent} onChange={event => update({ extraOffer: { ...offer, percent: Number(event.target.value) } })} /></label>
        </div>
        <p><strong>{offer.percent}% di sconto sui {offer.quota} extra più costosi.</strong><br /><span className={styles.small}>Gli altri extra restano a prezzo pieno. Il prezzo base non viene scontato.</span></p>
        <p className={styles.small}>Usa gli stessi extra comuni dal Magazzino di tutte le pizze, anche quando Pizza custom è disattivata.</p>
        <div className={styles.actions}>
          <Button type="button" variant="ghost" onClick={() => onRemove(selected.id)}>Elimina combinazione</Button>
        </div>
      </>}
    </>}
  </section>;
}

export function createPizzaEntry(catalog: PizzaCatalog, kind: "taste" | "formula"): PizzaEntry {
  return { id: crypto.randomUUID(), name: kind === "taste" ? "Nuova pizza" : "Nuova combinazione", description: "", priceCents: 0, available: true,
    standardDoughId: catalog.defaults?.doughId ?? catalog.doughs[0]?.id ?? "", standardBaseId: catalog.defaults?.baseId ?? catalog.bases[0]?.id ?? "",
    standardFormatId: catalog.defaults?.formatId ?? catalog.formats[0]?.id ?? "", doughIds: catalog.doughs.map(item => item.id), baseIds: catalog.bases.map(item => item.id),
    formatIds: catalog.formats.map(item => item.id), toppingIds: catalog.toppings.map(item => item.id) };
}
