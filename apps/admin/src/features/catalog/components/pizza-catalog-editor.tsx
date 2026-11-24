import { materializePizzaMenu, PIZZA_EXTRA_OFFERS } from "@pizzaos/domain";
import type { IndividualIngredient, MenuDraft, PizzaCatalog, PizzaComponent, PizzaEntry, PizzaFormula, PizzaTaste, PizzaTopping } from "@pizzaos/domain";
import { Button } from "@pizzaos/ui";
import { MenuFoodFields, MenuPriceField, MenuRecipeFields } from "./catalog-form-fields";
import styles from "./operational-catalog.module.css";

const emptyCatalog: PizzaCatalog = { doughs: [], bases: [], formats: [], toppings: [], tastes: [], formulas: [] };
const componentGroups = [
  ["doughs", "Impasti", "impasto"], ["bases", "Basi", "base"],
  ["formats", "Formati", "formato"], ["toppings", "Topping", "topping"]
] as const;

function ComponentEditor({ component, ingredients, onChange, onRemove, canRemove }: {
  component: PizzaComponent; ingredients: readonly IndividualIngredient[];
  onChange: (change: Partial<PizzaComponent>) => void; onRemove: () => void; canRemove: boolean;
}) {
  return <div className={styles.stack}>
    <div className={styles.formGrid}>
      <label>Nome<input value={component.name} required maxLength={200} onChange={event => onChange({ name: event.target.value })} /></label>
      <MenuPriceField label="Prezzo componente in euro" cents={component.priceCents} onChange={priceCents => onChange({ priceCents })} />
    </div>
    <p className={styles.small}>Il supplemento è la differenza rispetto al componente standard incluso nel prezzo della pizza.</p>
    <label>Descrizione<textarea value={component.description} maxLength={1000} onChange={event => onChange({ description: event.target.value })} /></label>
    <label>Immagine anteprima<input value={component.imagePath ?? ""} placeholder="/images/pizza/rossa-classica.png"
      onChange={event => onChange({ imagePath: event.target.value || undefined })} /></label>
    <label className={styles.check}><input type="checkbox" checked={component.available}
      onChange={event => onChange({ available: event.target.checked })} />Disponibile</label>
    <MenuRecipeFields label={`Ricetta ${component.name || "componente"}`} ingredients={ingredients} recipe={component.ingredients}
      onChange={recipe => onChange({ ingredients: recipe })} />
    <MenuFoodFields food={component.food} onChange={food => onChange({ food })} />
    <Button type="button" variant="ghost" disabled={!canRemove} onClick={onRemove}>Rimuovi componente</Button>
  </div>;
}

function AllowedChoices({ title, items, selected, standard, onChange }: {
  title: string; items: readonly PizzaComponent[]; selected: string[]; standard: string;
  onChange: (selected: string[], standard: string) => void;
}) {
  return <fieldset className={styles.inner}>
    <legend>{title}</legend>
    {items.length === 0 && <p>Aggiungi prima i componenti nella configurazione pizza.</p>}
    <div className={styles.checkGrid}>{items.map(item => <label key={item.id} className={styles.check}>
      <input type="checkbox" checked={selected.includes(item.id)} onChange={event => {
        const next = event.target.checked ? [...selected, item.id] : selected.filter(id => id !== item.id);
        onChange(next, next.includes(standard) ? standard : next[0] ?? "");
      }} />{item.name || "Senza nome"}
    </label>)}</div>
    <label>Scelta standard inclusa · {title}<select value={standard} onChange={event => onChange(selected, event.target.value)}>
      <option value="">Scegli lo standard</option>
      {items.filter(item => selected.includes(item.id)).map(item => <option value={item.id} key={item.id}>{item.name || "Senza nome"}</option>)}
    </select></label>
  </fieldset>;
}

export function PizzaEntryEditor({ draft, entry, kind, onChange, onRemove, onClose, onUpload }: {
  draft: MenuDraft; entry: PizzaTaste | PizzaFormula; kind: "taste" | "formula";
  onChange: (draft: MenuDraft) => void; onRemove: () => void; onClose: () => void; onUpload: (file: File) => void;
}) {
  const catalog = draft.pizzaCatalog ?? emptyCatalog;
  const key = kind === "taste" ? "tastes" : "formulas";
  function update(change: Partial<PizzaEntry> & { includedToppingIds?: string[]; offer?: PizzaFormula["offer"] }) {
    const nextCatalog: PizzaCatalog = kind === "taste"
      ? { ...catalog, tastes: catalog.tastes.map(item => item.id === entry.id ? { ...item, ...change } : item) }
      : { ...catalog, formulas: catalog.formulas.map(item => item.id === entry.id ? { ...item, ...change } : item) };
    onChange(materializePizzaMenu({ ...draft, pizzaCatalog: nextCatalog }));
  }
  const taste = kind === "taste" ? catalog.tastes.find(item => item.id === entry.id) : undefined;
  const formula = kind === "formula" ? catalog.formulas.find(item => item.id === entry.id) : undefined;
  const sectionId = draft.sections.find(section => section.productIds.includes(entry.id))?.id ?? "";
  return <section className={styles.productEditor} aria-label={kind === "taste" ? "Modifica gusto" : "Modifica formula"}>
    <div className={styles.header}><h3>{entry.name || (kind === "taste" ? "Nuovo gusto" : "Nuova formula")}</h3>
      <Button type="button" variant="ghost" onClick={onClose}>Chiudi scheda</Button></div>
    <div className={styles.formGrid}>
      <label>Nome {kind === "taste" ? "gusto" : "formula"}<input required maxLength={200} value={entry.name} onChange={event => update({ name: event.target.value })} /></label>
      <MenuPriceField label="Prezzo completo in euro" cents={entry.priceCents} onChange={priceCents => update({ priceCents })} />
      <label>Sezione<select value={sectionId} onChange={event => onChange({ ...draft, sections: draft.sections.map(section => ({ ...section,
        productIds: section.id === event.target.value ? [...section.productIds.filter(id => id !== entry.id), entry.id] : section.productIds.filter(id => id !== entry.id)
      })) })}>
        <option value="">Scegli una sezione</option>{draft.sections.map(section => <option key={section.id} value={section.id}>{section.name}</option>)}
      </select></label>
    </div>
    <p className={styles.small}>Comprende impasto, base e formato standard. Le rimozioni non riducono il prezzo.</p>
    <label>Descrizione<textarea value={entry.description} maxLength={2000} onChange={event => update({ description: event.target.value })} /></label>
    <label className={styles.check}><input type="checkbox" checked={entry.available} onChange={event => update({ available: event.target.checked })} />Disponibile per l’ordinazione</label>
    <label>Foto<input type="file" accept="image/jpeg,image/png,image/webp" onChange={event => {
      const file = event.currentTarget.files?.[0]; if (file) onUpload(file); event.currentTarget.value = "";
    }} /></label>
    {entry.imageId && <Button type="button" variant="ghost" onClick={() => update({ imageId: undefined })}>Rimuovi foto</Button>}
    <details className={styles.food}><summary>Anteprima pizza come nel PoC</summary>
      <p className={styles.small}>Associa gli asset esistenti alle combinazioni impasto e base. Senza una corrispondenza viene usata la foto della voce.</p>
      <label>Immagine ingredienti sovrapposta<input value={entry.toppingImagePath ?? ""} placeholder="/images/topping/margherita.png"
        onChange={event => update({ toppingImagePath: event.target.value || undefined })} /></label>
      {(entry.previewImages ?? []).map((preview, index) => <div className={styles.formGrid} key={index}>
        <label>Impasto anteprima<select value={preview.doughId} onChange={event => update({ previewImages: entry.previewImages?.map((item, position) => position === index ? { ...item, doughId: event.target.value } : item) })}>
          <option value="">Scegli impasto</option>{catalog.doughs.filter(item => entry.doughIds.includes(item.id)).map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select></label>
        <label>Base anteprima<select value={preview.baseId} onChange={event => update({ previewImages: entry.previewImages?.map((item, position) => position === index ? { ...item, baseId: event.target.value } : item) })}>
          <option value="">Scegli base</option>{catalog.bases.filter(item => entry.baseIds.includes(item.id)).map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select></label>
        <label>Percorso immagine<input value={preview.imagePath} placeholder="/images/pizza/rossa-classica.png" onChange={event => update({ previewImages: entry.previewImages?.map((item, position) => position === index ? { ...item, imagePath: event.target.value } : item) })} /></label>
        <Button type="button" variant="ghost" onClick={() => update({ previewImages: entry.previewImages?.filter((_, position) => position !== index) })}>Rimuovi anteprima</Button>
      </div>)}
      <Button type="button" variant="secondary" onClick={() => update({ previewImages: [...entry.previewImages ?? [], {
        doughId: entry.standardDoughId, baseId: entry.standardBaseId, imagePath: ""
      }] })}>Aggiungi anteprima impasto e base</Button>
    </details>
    <AllowedChoices title="Impasti" items={catalog.doughs} selected={entry.doughIds} standard={entry.standardDoughId}
      onChange={(doughIds, standardDoughId) => update({ doughIds, standardDoughId })} />
    <AllowedChoices title="Basi" items={catalog.bases} selected={entry.baseIds} standard={entry.standardBaseId}
      onChange={(baseIds, standardBaseId) => update({ baseIds, standardBaseId })} />
    <AllowedChoices title="Formati" items={catalog.formats} selected={entry.formatIds} standard={entry.standardFormatId}
      onChange={(formatIds, standardFormatId) => update({ formatIds, standardFormatId })} />
    {formula && <label>Formula sconto extra<select value={formula.offer} onChange={event => {
      const offer = event.target.value;
      if (offer === "Simple" || offer === "Wild" || offer === "Savage") update({ offer });
    }}>{Object.entries(PIZZA_EXTRA_OFFERS).map(([name, offer]) => <option key={name} value={name}>{name} · {offer.quota} extra al −{offer.percent}%</option>)}</select></label>}
    {formula && <p>Questa formula parte senza gusto predefinito.</p>}
    <fieldset className={styles.inner}><legend>Topping consentiti{taste ? " e ingredienti inclusi" : ""}</legend>
      {catalog.toppings.map(topping => <div key={topping.id} className={styles.row}>
        <label className={styles.check}><input type="checkbox" checked={entry.toppingIds.includes(topping.id)} onChange={event => {
          const toppingIds = event.target.checked ? [...entry.toppingIds, topping.id] : entry.toppingIds.filter(id => id !== topping.id);
          update({ toppingIds, ...(taste ? { includedToppingIds: taste.includedToppingIds.filter(id => toppingIds.includes(id)) } : {}) });
        }} />{topping.name || "Senza nome"} · {topping.category}</label>
        {taste && <label className={styles.check}><input type="checkbox" disabled={!entry.toppingIds.includes(topping.id)} checked={taste.includedToppingIds.includes(topping.id)}
          onChange={event => update({ includedToppingIds: event.target.checked ? [...taste.includedToppingIds, topping.id] : taste.includedToppingIds.filter(id => id !== topping.id) })} />Incluso nel gusto</label>}
      </div>)}
    </fieldset>
    <fieldset className={styles.inner}><legend>Abbinamenti consigliati</legend>
      {draft.products.filter(product => product.id !== entry.id).map(product => <label key={product.id} className={styles.check}>
        <input type="checkbox" checked={entry.pairingProductIds?.includes(product.id) ?? false} onChange={event => update({ pairingProductIds: event.target.checked
          ? [...entry.pairingProductIds ?? [], product.id] : entry.pairingProductIds?.filter(id => id !== product.id) })} />{product.name || "Senza nome"}
      </label>)}
    </fieldset>
    <Button type="button" variant="ghost" onClick={onRemove}>Rimuovi {key === "tastes" ? "gusto" : "formula"} dalla bozza</Button>
  </section>;
}

export function PizzaCatalogEditor({ draft, ingredients, onChange }: {
  draft: MenuDraft; ingredients: readonly IndividualIngredient[]; onChange: (draft: MenuDraft) => void;
}) {
  const catalog = draft.pizzaCatalog ?? emptyCatalog;
  function update(next: PizzaCatalog) { onChange(materializePizzaMenu({ ...draft, pizzaCatalog: next })); }
  return <details className={styles.optionGroup}>
    <summary>Configurazione pizza · impasti, basi, formati e topping</summary>
    <div className={styles.stack}>
      <p>Configura i componenti condivisi, poi aggiungi gusti e formule nelle sezioni del menu.</p>
      {componentGroups.map(([key, title, singular]) => <fieldset className={styles.inner} key={key}>
        <legend>{title}</legend>
        {catalog[key].map(component => {
          const referenced = [...catalog.tastes, ...catalog.formulas].some(entry =>
            [...entry.doughIds, ...entry.baseIds, ...entry.formatIds, ...entry.toppingIds,
              ...("includedToppingIds" in entry ? entry.includedToppingIds : [])].includes(component.id));
          return <details key={component.id} className={styles.optionGroup}><summary>{component.name || `Nuovo ${singular}`}</summary>
            <ComponentEditor component={component} ingredients={ingredients} canRemove={!referenced}
              onChange={change => update({ ...catalog, [key]: catalog[key].map(item => item.id === component.id ? { ...item, ...change } : item) })}
              onRemove={() => { if (!referenced) update({ ...catalog, [key]: catalog[key].filter(item => item.id !== component.id) }); }} />
            {key === "toppings" && <label>Categoria extra<input required maxLength={200} value={(component as PizzaTopping).category}
              onChange={event => update({ ...catalog, toppings: catalog.toppings.map(item => item.id === component.id ? { ...item, category: event.target.value } : item) })} /></label>}
            {referenced && <p className={styles.small}>Per rimuoverlo, scollegalo prima dai gusti e dalle formule che lo utilizzano.</p>}
          </details>;
        })}
        <Button type="button" variant="secondary" onClick={() => {
          const component: PizzaComponent = { id: crypto.randomUUID(), name: `Nuovo ${singular}`, description: "", priceCents: 0, available: true, ingredients: {} };
          update(key === "toppings" ? { ...catalog, toppings: [...catalog.toppings, { ...component, category: "Extra" }] }
            : { ...catalog, [key]: [...catalog[key], component] });
        }}>Aggiungi {singular}</Button>
      </fieldset>)}
    </div>
  </details>;
}
