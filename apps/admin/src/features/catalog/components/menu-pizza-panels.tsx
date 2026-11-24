import { applyPizzaDefaults, materializePizzaMenu, PIZZA_EXTRA_OFFERS, syncPizzaInventory } from "@pizzaos/domain";
import type { IndividualIngredient, MenuDraft, PizzaCatalog, PizzaComponent, PizzaEntry, PizzaFormula, PizzaTaste } from "@pizzaos/domain";
import { Button } from "@pizzaos/ui";
import { useState } from "react";
import { MenuPriceField, MenuRecipeFields } from "./catalog-form-fields";
import { MenuProductChoices } from "./menu-product-form";
import styles from "./operational-catalog.module.css";

export const blankPizzaCatalog = (): PizzaCatalog => ({ doughs: [], bases: [], formats: [], toppings: [], tastes: [], formulas: [] });

export function PizzaTastePanel({ draft, taste, ingredients, onChange, onClose, onRemove, onUpload, onSave }: {
  draft: MenuDraft; taste: PizzaTaste; ingredients: readonly IndividualIngredient[];
  onChange: (draft: MenuDraft) => void; onClose: () => void; onRemove: () => void;
  onUpload: (file: File) => void; onSave?: () => void;
}) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const catalog = draft.pizzaCatalog ?? blankPizzaCatalog();
  function update(change: Partial<PizzaTaste>, nextCatalog = catalog) {
    onChange(materializePizzaMenu({ ...draft, pizzaCatalog: { ...nextCatalog,
      tastes: nextCatalog.tastes.map(item => item.id === taste.id ? { ...item, ...change } : item) } }));
  }
  const base = catalog.bases.find(item => item.id === (catalog.defaults?.baseId ?? taste.standardBaseId));
  const included = catalog.toppings.filter(item => taste.includedToppingIds.includes(item.id));
  const projected = draft.products.find(product => product.id === taste.id);
  function toggle(ingredient: IndividualIngredient, checked: boolean) {
    if (checked && base && Object.hasOwn(base.ingredients, ingredient.id)) return;
    const candidates = catalog.toppings.filter(item => !item.inventoryIngredientId
      && Object.keys(item.ingredients).length === 1 && Object.hasOwn(item.ingredients, ingredient.id));
    if (!checked) {
      const matchingIds = new Set(candidates.map(item => item.id));
      update({ includedToppingIds: taste.includedToppingIds.filter(id => !matchingIds.has(id)) });
      return;
    }
    const existing = candidates.find(item => item.id === `ingredient:${ingredient.id}`) ?? (candidates.length === 1 ? candidates[0] : undefined);
    const id = existing?.id ?? `ingredient:${ingredient.id}`;
    const nextCatalog = existing ? catalog : { ...catalog, toppings: [...catalog.toppings, {
      id, name: ingredient.name, description: "", priceCents: ingredient.extra?.priceCents ?? 0,
      available: true, category: "Extra", ingredients: { [ingredient.id]: null }, food: ingredient.food
    }] };
    update({ includedToppingIds: checked ? [...taste.includedToppingIds, id] : taste.includedToppingIds.filter(value => value !== id) }, nextCatalog);
  }
  return <section className={styles.productEditor} aria-label="Modifica pizza">
    <div className={styles.header}><div><p className={styles.small}>Modifica pizza</p><h3>{taste.name || "Nuova pizza"}</h3></div>
      <Button type="button" variant="ghost" onClick={onClose} aria-label="Chiudi scheda pizza">×</Button></div>
    <label>Nome pizza<input required maxLength={200} value={taste.name} onChange={event => update({ name: event.target.value })} /></label>
    <label>Descrizione<textarea maxLength={2000} value={taste.description} onChange={event => update({ description: event.target.value })} /></label>
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
          const inBase = Boolean(base && Object.hasOwn(base.ingredients, ingredient.id));
          return <label className={styles.check} key={ingredient.id}><input type="checkbox" checked={inBase || matches.length > 0} disabled={inBase && matches.length === 0}
            onChange={event => toggle(ingredient, event.target.checked)} />{ingredient.name}{inBase && <small>Già nella base</small>}</label>;
        })}
        {!ingredients.length && <p>Aggiungi prima gli ingredienti in Magazzino.</p>}
        {ingredients.length > 0 && !ingredients.some(item => item.name.toLocaleLowerCase("it-IT").includes(search.toLocaleLowerCase("it-IT"))) && <p>Nessun ingrediente corrisponde alla ricerca.</p>}
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Chiudi ingredienti</Button>
      </div>}
    </div>
    <MenuPriceField label="Prezzo in euro" cents={taste.priceCents} onChange={priceCents => update({ priceCents })} />
    <details className={styles.food}><summary>Foto, allergeni e altre opzioni</summary>
      <p className={styles.small}>Le dosi sconosciute vanno verificate prima di pubblicare. Gli ingredienti già presenti nella base non vanno aggiunti nuovamente.</p>
      {included.map(item => <MenuRecipeFields key={item.id} label={`Dosi ${item.name}`} ingredients={ingredients} recipe={item.ingredients}
        onChange={recipe => update({}, { ...catalog, toppings: catalog.toppings.map(topping => topping.id === item.id ? { ...topping, ingredients: recipe } : topping) })} />)}
      <label className={styles.check}><input type="checkbox" checked={taste.available}
        onChange={event => update({ available: event.target.checked })} />Disponibile per l’ordinazione</label>
      <label>Foto<input type="file" accept="image/jpeg,image/png,image/webp" onChange={event => {
        const file = event.currentTarget.files?.[0]; if (file) onUpload(file); event.currentTarget.value = "";
      }} /></label>
      {taste.imageId && <Button type="button" variant="ghost" onClick={() => update({ imageId: undefined })}>Rimuovi foto</Button>}
      <fieldset className={styles.inner}><legend>Abbinamenti consigliati</legend>
        {draft.products.filter(product => product.id !== taste.id).map(product => <label key={product.id} className={styles.check}>
          <input type="checkbox" checked={taste.pairingProductIds?.includes(product.id) ?? false} onChange={event => update({ pairingProductIds: event.target.checked
            ? [...taste.pairingProductIds ?? [], product.id] : taste.pairingProductIds?.filter(id => id !== product.id) })} />{product.name || "Senza nome"}
        </label>)}
      </fieldset>
      {projected && <details className={styles.food}><summary>Scelte specifiche del prodotto</summary>
        <p>Impasti, basi, formati ed extra sono comuni. Aggiungi qui soltanto eventuali scelte particolari di questa pizza.</p>
        <MenuProductChoices product={{ ...projected, options: taste.customizations?.options ?? [], groups: taste.customizations?.groups }}
          ingredients={ingredients} onChange={change => update({ customizations: {
            options: change.options ?? taste.customizations?.options ?? [],
            ...(change.groups ?? taste.customizations?.groups ? { groups: change.groups ?? taste.customizations?.groups } : {})
          } })} />
      </details>}
      <Button type="button" variant="ghost" onClick={onRemove}>Rimuovi gusto dalla bozza</Button>
    </details>
    <Button type="button" onClick={onSave}>Salva pizza</Button>
  </section>;
}

const dimensions = [
  { key: "doughs", title: "Impasti", singular: "impasto", defaultKey: "doughId" },
  { key: "bases", title: "Basi", singular: "base", defaultKey: "baseId" },
  { key: "formats", title: "Formati", singular: "formato", defaultKey: "formatId" }
] as const;

export function PizzaSettingsPanel({ draft, ingredients, onChange, onClose, onSave }: {
  draft: MenuDraft; ingredients: readonly IndividualIngredient[]; onChange: (draft: MenuDraft) => void; onClose: () => void; onSave?: () => void;
}) {
  const catalog = draft.pizzaCatalog ?? blankPizzaCatalog();
  const defaults = catalog.defaults ?? { doughId: catalog.tastes[0]?.standardDoughId ?? catalog.formulas[0]?.standardDoughId ?? catalog.doughs[0]?.id ?? "",
    baseId: catalog.tastes[0]?.standardBaseId ?? catalog.formulas[0]?.standardBaseId ?? catalog.bases[0]?.id ?? "",
    formatId: catalog.tastes[0]?.standardFormatId ?? catalog.formulas[0]?.standardFormatId ?? catalog.formats[0]?.id ?? "" };
  function update(next: PizzaCatalog) { onChange(materializePizzaMenu({ ...draft, pizzaCatalog: applyPizzaDefaults({ ...next, defaults: next.defaults ?? defaults }) })); }
  function changeComponent(key: "doughs" | "bases" | "formats", id: string, change: Partial<PizzaComponent>) {
    update({ ...catalog, [key]: catalog[key].map(item => item.id === id ? { ...item, ...change } : item) });
  }
  return <section className={styles.productEditor} aria-label="Impasti, basi e formati">
    <div className={styles.header}><div><p className={styles.small}>Configurazione del menu</p><h3>Impasti, basi e formati</h3></div>
      <Button type="button" variant="ghost" onClick={onClose} aria-label="Chiudi configurazione">×</Button></div>
    <p>Imposta lo standard e aggiungi le alternative che offri.</p>
    {dimensions.map(dimension => {
      const standard = catalog[dimension.key].find(item => item.id === defaults[dimension.defaultKey]);
      return <section className={styles.dimension} key={dimension.key} aria-label={dimension.title}>
        <h4>{dimension.title}</h4>
        {catalog[dimension.key].map(component => <div className={styles.componentRow} key={component.id}>
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
        </div>)}
        <Button type="button" variant="ghost" onClick={() => {
          const component: PizzaComponent = { id: crypto.randomUUID(), name: `Nuovo ${dimension.singular}`, description: "", priceCents: standard?.priceCents ?? 0, available: true, ingredients: {} };
          update({ ...catalog, [dimension.key]: [...catalog[dimension.key], component], defaults: { ...defaults, [dimension.defaultKey]: defaults[dimension.defaultKey] || component.id } });
        }}>+ Aggiungi {dimension.singular}</Button>
      </section>;
    })}
    <p className={styles.notice}>Lo standard è incluso nel prezzo della pizza. Le alternative applicano il supplemento indicato.</p>
    <details className={styles.food}><summary>Ricette e dosi dal Magazzino</summary>
      {dimensions.flatMap(dimension => catalog[dimension.key].map(component => <div className={styles.stack} key={component.id}>
        <MenuRecipeFields label={`Ricetta ${component.name}`} ingredients={ingredients} recipe={component.ingredients}
          onChange={recipe => changeComponent(dimension.key, component.id, { ingredients: recipe })} />
        <label className={styles.check}><input type="checkbox" checked={component.available} onChange={event => changeComponent(dimension.key, component.id, { available: event.target.checked })} />{component.name} disponibile</label>
        <label>Anteprima {component.name}<input value={component.imagePath ?? ""} placeholder="/images/pizza/…" onChange={event => changeComponent(dimension.key, component.id, { imagePath: event.target.value || undefined })} /></label>
      </div>))}
    </details>
    <Button type="button" onClick={onSave}>Salva configurazione</Button><Button type="button" variant="ghost" onClick={onClose}>Annulla</Button>
  </section>;
}

export function PizzaCustomCard({ draft, ingredients, onChange, onAdd, onRemove, onSave }: {
  draft: MenuDraft; ingredients: readonly IndividualIngredient[]; onChange: (draft: MenuDraft) => void;
  onAdd: () => void; onRemove: (id: string) => void; onSave?: () => void; onInventory?: () => void;
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
        <div className={styles.threeFields}>
          <MenuPriceField label="Prezzo base in euro" cents={selected.priceCents} onChange={priceCents => update({ priceCents })} />
          <label>Numero di extra scontati<input type="number" min={0} max={100} step={1} value={offer.quota} onChange={event => update({ extraOffer: { ...offer, quota: Number(event.target.value) } })} /></label>
          <label>Sconto sugli extra %<input type="number" min={0} max={100} step={1} value={offer.percent} onChange={event => update({ extraOffer: { ...offer, percent: Number(event.target.value) } })} /></label>
        </div>
        <p><strong>{offer.percent}% di sconto sui {offer.quota} extra più costosi.</strong><br /><span className={styles.small}>Gli altri extra restano a prezzo pieno. Il prezzo base non viene scontato.</span></p>
        <p className={styles.small}>Usa gli stessi extra comuni dal Magazzino di tutte le pizze, anche quando Pizza custom è disattivata.</p>
        <div className={styles.actions}>
          <Button type="button" onClick={onSave}>Salva combinazione</Button>
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
