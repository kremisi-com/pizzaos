import { MenuPairingSelect } from "./menu-pairing-select";
import { menuImagePath, PIZZA_EXTRA_OFFERS } from "@pizzaos/domain";
import type { IndividualIngredient, IndividualOption, IndividualProduct, MenuOptionGroup, OrderingMenuSection } from "@pizzaos/domain";
import { Button } from "@pizzaos/ui";
import Image from "next/image";
import { useState, type ReactNode } from "react";
import { MenuPriceField, MenuRecipeFields } from "./catalog-form-fields";
import styles from "./operational-catalog.module.css";

const groupNames: Record<MenuOptionGroup["kind"], string> = {
  dough: "Impasto", base: "Base", format: "Formato", ingredients: "Ingredienti",
  extras: "Extra", recipe: "Ricetta", selection: "Selezione"
};

function isPreviousMenuGroup(group: MenuOptionGroup) {
  return ["scegli l'impasto", "scegli la pizza"].includes(group.name.trim().toLocaleLowerCase("it-IT").replaceAll("’", "'").replace(/\s+/g, " "));
}

export function hasMenuProductChoices(product: Pick<IndividualProduct, "groups" | "options">) {
  return product.groups ? product.groups.some(group => !isPreviousMenuGroup(group)) : product.options.length > 0;
}

function MenuOptionForm({ option, ingredients, baseRecipe, onChange, onRemove }: {
  option: IndividualOption;
  ingredients: readonly IndividualIngredient[];
  baseRecipe: IndividualProduct["ingredients"];
  onChange: (change: Partial<IndividualOption>) => void;
  onRemove: () => void;
}) {
  const removable = ingredients.filter(ingredient => Object.hasOwn(baseRecipe, ingredient.id));
  return <fieldset className={styles.inner}>
    <legend>{option.name || "Nuova scelta"}</legend>
    <div className={styles.formGrid}>
      <label>Nome scelta<input value={option.name} required maxLength={200} onChange={event => onChange({ name: event.target.value })} /></label>
      <MenuPriceField label="Supplemento in euro" cents={option.priceCents} onChange={priceCents => onChange({ priceCents })} />
    </div>
    <label>Descrizione scelta<textarea value={option.description ?? ""} maxLength={1000}
      onChange={event => onChange({ description: event.target.value || undefined })} /></label>
    <MenuRecipeFields label="Ingredienti aggiunti" recipe={option.ingredients} ingredients={ingredients}
      onChange={recipe => onChange({ ingredients: recipe })} />
    {removable.length > 0 && <fieldset className={styles.inner}>
      <legend>Ingredienti della ricetta da rimuovere</legend>
      <div className={styles.checkGrid}>
        {removable.map(ingredient => <label key={ingredient.id} className={styles.check}>
          <input type="checkbox" checked={option.removesIngredientIds?.includes(ingredient.id) ?? false} onChange={event => {
            const remaining = option.removesIngredientIds?.filter(id => id !== ingredient.id) ?? [];
            onChange({ removesIngredientIds: event.target.checked ? [...remaining, ingredient.id] : remaining });
          }} />
          {ingredient.name}
        </label>)}
      </div>
    </fieldset>}
    <div><Button type="button" variant="ghost" onClick={onRemove}>Rimuovi scelta</Button></div>
  </fieldset>;
}

function MenuGroupForm({ group, product, ingredients, onChange }: {
  group: MenuOptionGroup;
  product: IndividualProduct;
  ingredients: readonly IndividualIngredient[];
  onChange: (change: Partial<IndividualProduct>) => void;
}) {
  const [expanded, setExpanded] = useState(group.optionIds.length === 0);
  const groups = product.groups ?? [];
  const options = new Map(product.options.map(option => [option.id, option]));
  function updateGroup(change: Partial<MenuOptionGroup>, nextOptions = product.options) {
    const nextGroups = groups.map(item => item.id === group.id ? { ...item, ...change } : item);
    onChange({
      groups: nextGroups,
      options: nextOptions,
      extraOffer: nextGroups.some(item => item.kind === "extras") ? product.extraOffer : undefined
    });
  }
  return <details className={styles.optionGroup} open={expanded} onToggle={event => setExpanded(event.currentTarget.open)}>
    <summary>{group.name || "Nuovo gruppo"}</summary>
    <div className={styles.stack}>
      <div className={styles.formGrid}>
        <label>Nome gruppo<input value={group.name} required maxLength={200} onChange={event => updateGroup({ name: event.target.value })} /></label>
        <label>Tipo di scelta<select value={group.kind} onChange={event => updateGroup({ kind: event.target.value as MenuOptionGroup["kind"] })}>
          {Object.entries(groupNames).map(([kind, name]) => <option key={kind} value={kind}>{name}</option>)}
        </select></label>
        <label>Quantità minima<input type="number" min={0} max={group.max} step={1} required value={group.min}
          onChange={event => updateGroup({ min: Number(event.target.value) })} /></label>
        <label>Quantità massima<input type="number" min={group.min} max={100} step={1} required value={group.max}
          onChange={event => updateGroup({ max: Number(event.target.value) })} /></label>
      </div>
      <label className={styles.check}>
        <input type="checkbox" checked={group.allowRepeat ?? false} onChange={event => updateGroup({ allowRepeat: event.target.checked })} />
        Consenti più unità della stessa scelta
      </label>
      {group.optionIds.map(id => {
        const option = options.get(id);
        if (!option) return null;
        return <MenuOptionForm key={id} option={option} ingredients={ingredients} baseRecipe={product.ingredients}
          onChange={change => onChange({ options: product.options.map(item => item.id === id ? { ...item, ...change } : item) })}
          onRemove={() => updateGroup({ optionIds: group.optionIds.filter(optionId => optionId !== id) }, product.options.filter(item => item.id !== id))} />;
      })}
      <div className={styles.actions}>
        <Button type="button" variant="secondary" onClick={() => {
          const option = { id: crypto.randomUUID(), name: "", priceCents: 0, ingredients: {} };
          updateGroup({ optionIds: [...group.optionIds, option.id] }, [...product.options, option]);
        }}>Aggiungi scelta</Button>
        <Button type="button" variant="ghost" onClick={() => {
          const remaining = groups.filter(item => item.id !== group.id);
          onChange({
            groups: remaining,
            options: product.options.filter(option => !group.optionIds.includes(option.id)),
            extraOffer: remaining.some(item => item.kind === "extras") ? product.extraOffer : undefined
          });
        }}>Rimuovi gruppo</Button>
      </div>
    </div>
  </details>;
}

export function MenuProductChoices({ product, ingredients, onChange }: {
  product: IndividualProduct;
  ingredients: readonly IndividualIngredient[];
  onChange: (change: Partial<IndividualProduct>) => void;
}) {
  const groups = product.groups ?? [];
  return <>
    {groups.filter(group => !isPreviousMenuGroup(group)).map(group => <MenuGroupForm key={group.id} group={group} product={product} ingredients={ingredients} onChange={onChange} />)}
    {!product.groups && product.options.map(option => <MenuOptionForm key={option.id} option={option} baseRecipe={product.ingredients} ingredients={ingredients}
      onChange={change => onChange({ options: product.options.map(item => item.id === option.id ? { ...item, ...change } : item) })}
      onRemove={() => onChange({ options: product.options.filter(item => item.id !== option.id) })} />)}
  </>;
}

export function MenuProductForm({ storeId, product, index, ingredients, products, sections, sectionId, onChange, onMove, onRemove, onClose, onUpload, headerActions }: {
  storeId: string;
  product: IndividualProduct;
  index: number;
  ingredients: readonly IndividualIngredient[];
  products: readonly IndividualProduct[];
  sections: readonly OrderingMenuSection[];
  sectionId?: string;
  headerActions?: ReactNode;
  onChange: (change: Partial<IndividualProduct>) => void;
  onMove: (sectionId: string) => void;
  onRemove: () => void;
  onClose: () => void;
  onUpload: (image: File) => void;
}) {
  const groups = product.groups ?? [];
  const presets = Object.entries(PIZZA_EXTRA_OFFERS);
  const currentOffer = product.extraOffer;
  const selectedOffer = currentOffer
    ? presets.find(([, offer]) => offer.quota === currentOffer.quota && offer.percent === currentOffer.percent)?.[0] ?? "personalizzata"
    : "";

  function changeRecipe(ingredients: Record<string, number | null>) {
    onChange({
      ingredients,
      options: product.options.map(option => option.removesIngredientIds
        ? { ...option, removesIngredientIds: option.removesIngredientIds.filter(id => Object.hasOwn(ingredients, id)) }
        : option)
    });
  }

  return <section className={styles.productEditor} aria-label="Modifica prodotto">
    <div className={styles.header}>
      <h3>{product.name || "Nuovo prodotto"}</h3>
      <div className={styles.productHeaderActions}>{headerActions}
        <Button type="button" variant="ghost" onClick={onClose} aria-label="Chiudi scheda">×</Button>
      </div>
    </div>
    <div className={styles.formGrid}>
      <label>Nome prodotto {index + 1}<input value={product.name} required maxLength={200}
        onChange={event => onChange({ name: event.target.value })} /></label>
      <MenuPriceField label="Prezzo base in euro" cents={product.priceCents} onChange={priceCents => onChange({ priceCents })} />
      <label>Sezione<select value={sectionId ?? ""} onChange={event => onMove(event.target.value)}>
        {!sectionId && <option value="">Scegli una sezione</option>}
        {sections.map(section => <option key={section.id} value={section.id}>{section.name}</option>)}
      </select></label>
    </div>
    <label>Descrizione prodotto<textarea value={product.description} maxLength={2000}
      onChange={event => onChange({ description: event.target.value })} /></label>
    <label className={styles.check}><input type="checkbox" checked={product.available}
      onChange={event => onChange({ available: event.target.checked })} />Disponibile per l’ordinazione</label>
    <div className={styles.row}>
      {product.imageId && <Image src={menuImagePath(storeId, product.imageId)} alt="" width={96} height={96} unoptimized className={styles.image} />}
      <label>Foto del prodotto<input type="file" accept="image/jpeg,image/png,image/webp" onChange={event => {
        const file = event.currentTarget.files?.[0];
        if (file) onUpload(file);
        event.currentTarget.value = "";
      }} />
        <span className={styles.small}>JPEG, PNG o WebP · massimo 2 MB</span>
      </label>
      {product.imageId && <Button type="button" variant="ghost" onClick={() => onChange({ imageId: undefined })}>Rimuovi foto</Button>}
    </div>
    <MenuRecipeFields label="Ricetta base" recipe={product.ingredients} ingredients={ingredients} onChange={changeRecipe} singleUnit />
    {product.allergens.length > 0 && <div className={styles.row}>
      <p className={styles.small}>Allergeni del catalogo precedente · {product.allergens.join(", ")}</p>
      <Button type="button" variant="ghost" onClick={() => onChange({ allergens: [] })}>Rimuovi diciture precedenti</Button>
    </div>}
    <MenuProductChoices product={product} ingredients={ingredients} onChange={onChange} />
    {(groups.some(group => group.kind === "extras") || currentOffer) && <label>Formula sconto extra
      <select value={selectedOffer} onChange={event => onChange({ extraOffer: presets.find(([name]) => name === event.target.value)?.[1] })}>
        <option value="">Nessuna formula</option>
        {selectedOffer === "personalizzata" && <option value="personalizzata">{currentOffer?.quota} extra, {currentOffer?.percent}%</option>}
        {presets.map(([name, offer]) => <option key={name} value={name}>{name} · {offer.quota} extra al −{offer.percent}%</option>)}
      </select>
    </label>}
    <MenuPairingSelect productId={product.id} products={products} selectedIds={product.pairingProductIds}
      onChange={pairingProductIds => onChange({ pairingProductIds })} />
    <div><Button type="button" variant="ghost" onClick={onRemove}>Rimuovi prodotto dalla bozza</Button></div>
  </section>;
}
