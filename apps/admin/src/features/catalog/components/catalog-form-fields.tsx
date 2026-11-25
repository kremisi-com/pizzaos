import { MENU_ALLERGENS, menuAllergenKey } from "@pizzaos/domain";
import type { IndividualIngredient, MenuFoodInformation } from "@pizzaos/domain";
import { Button } from "@pizzaos/ui";
import { useId, useRef, useState } from "react";
import styles from "./operational-catalog.module.css";

export function MenuRecipeFields({ label, ingredients, recipe, onChange, singleUnit = false }: {
  label: string;
  ingredients: readonly IndividualIngredient[];
  recipe: Record<string, number | null>;
  onChange: (recipe: Record<string, number | null>) => void;
  singleUnit?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const selected = new Set(Object.keys(recipe));
  const remaining = ingredients.filter(ingredient => !selected.has(ingredient.id));

  function removeIngredient(id: string) {
    const next = { ...recipe };
    delete next[id];
    onChange(next);
  }

  function toggle(id: string, checked: boolean) {
    const next = Object.fromEntries(Object.entries(recipe).filter(([key]) => key !== id).map(([key, units]) => [key, units === null ? null : 1]));
    if (checked) next[id] = 1;
    onChange(next);
  }

  if (singleUnit) {
    const names = new Map(ingredients.map(ingredient => [ingredient.id, ingredient.name]));
    const matching = ingredients.filter(ingredient => ingredient.name.toLocaleLowerCase("it-IT").includes(search.toLocaleLowerCase("it-IT")));
    return <fieldset className={styles.inner}>
      <legend>{label}</legend>
      <div className={styles.ingredientSelect}>
        <button type="button" className={styles.selectTrigger} aria-label={`Seleziona ingredienti per ${label}`} aria-expanded={open} onClick={() => setOpen(value => !value)}>
          <span>{selected.size ? [...selected].map(id => names.get(id) || "Ingrediente da verificare").join(", ") : "Scegli gli ingredienti"}</span><span aria-hidden="true">⌄</span>
        </button>
        <p className={styles.small}>Una unità per ogni ingrediente selezionato.</p>
        <div className={styles.chips}>{[...selected].map(id => <button type="button" key={id}
          aria-label={`Rimuovi ${names.get(id) || "Ingrediente da verificare"} da ${label}`} onClick={() => toggle(id, false)}>{names.get(id) || "Ingrediente da verificare"} ×</button>)}</div>
        {open && <div className={styles.ingredientOptions}>
          <label>Cerca ingrediente in {label}<input type="search" value={search} onChange={event => setSearch(event.target.value)} /></label>
          {matching.map(ingredient => <label key={ingredient.id} className={styles.check}>
            <input type="checkbox" checked={selected.has(ingredient.id)} onChange={event => toggle(ingredient.id, event.target.checked)} />{ingredient.name || "Senza nome"}
          </label>)}
          {!ingredients.length ? <p>Aggiungi prima gli ingredienti in Magazzino.</p> : !matching.length && <p>Nessun ingrediente corrisponde alla ricerca.</p>}
          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Chiudi ingredienti</Button>
        </div>}
      </div>
    </fieldset>;
  }

  return <fieldset className={styles.inner}>
    <legend>{label}</legend>
    {Object.entries(recipe).map(([id, units]) => {
      const name = ingredients.find(ingredient => ingredient.id === id)?.name || "Ingrediente da verificare";
      return <div className={styles.row} key={id}>
        <label>Unità di {name}
          <input type="number" min={1} step={1} value={units ?? ""} placeholder="Da verificare" onChange={event => {
            onChange({ ...recipe, [id]: event.target.value === "" ? null : Number(event.target.value) });
          }} />
        </label>
        <Button type="button" variant="secondary" aria-label={`Rimuovi ${name} da ${label}`} onClick={() => removeIngredient(id)}>Rimuovi</Button>
      </div>;
    })}
    {ingredients.length > 0 ? <label>Aggiungi ingrediente a {label}
      <select value="" disabled={remaining.length === 0} onChange={event => {
        if (event.target.value) onChange({ ...recipe, [event.target.value]: null });
      }}>
        <option value="">{remaining.length === 0 ? "Tutti gli ingredienti sono già inclusi" : "Scegli dal magazzino"}</option>
        {remaining.map(ingredient => <option key={ingredient.id} value={ingredient.id}>{ingredient.name || "Senza nome"}</option>)}
      </select>
    </label> : <p>Aggiungi prima gli ingredienti in Magazzino.</p>}
  </fieldset>;
}

function AllergenSelect({ title, allergens, selected, onChange }: {
  title: string;
  allergens: readonly string[];
  selected: readonly string[];
  onChange: (values: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const optionsId = useId();
  const labelId = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const matching = allergens.filter(value => value.toLocaleLowerCase("it-IT").includes(search.trim().toLocaleLowerCase("it-IT")));
  const has = (value: string) => selected.some(item => menuAllergenKey(item) === menuAllergenKey(value));
  function toggle(value: string, checked: boolean) {
    const remaining = selected.filter(item => menuAllergenKey(item) !== menuAllergenKey(value));
    onChange(checked ? [...remaining, value] : remaining);
  }
  function close() {
    setOpen(false);
    trigger.current?.focus();
  }
  return <div className={styles.ingredientSelect} role="group" aria-labelledby={labelId} onKeyDown={event => {
    if (event.key === "Escape" && open) { event.preventDefault(); event.stopPropagation(); close(); }
  }}>
    <span id={labelId} className={styles.fieldLabel}>{title}</span>
    <button type="button" ref={trigger} className={styles.selectTrigger} aria-label={`Seleziona allergeni: ${title}`}
      aria-expanded={open} aria-controls={open ? optionsId : undefined} onClick={() => setOpen(value => !value)}>
      <span>{selected.length ? selected.join(", ") : "Scegli gli allergeni"}</span><span aria-hidden="true">⌄</span>
    </button>
    {selected.length > 0 && <div className={styles.chips}>{selected.map(value => <button type="button" key={menuAllergenKey(value)}
      aria-label={`Rimuovi ${value} da ${title}`} onClick={() => toggle(value, false)}>{value} ×</button>)}</div>}
    {open && <div id={optionsId} className={styles.ingredientOptions}>
      <label>Filtra allergeni: {title}<input type="search" value={search} onChange={event => setSearch(event.target.value)} /></label>
      {matching.map(value => <label key={menuAllergenKey(value)} className={styles.check}>
        <input type="checkbox" checked={has(value)} onChange={event => toggle(value, event.target.checked)} />{value}
      </label>)}
      {!matching.length && <p>Nessun allergene corrisponde alla ricerca.</p>}
      <Button type="button" variant="ghost" onClick={close}>Chiudi allergeni: {title}</Button>
    </div>}
  </div>;
}

export function MenuFoodFields({ food, onChange }: {
  food?: MenuFoodInformation;
  onChange: (food: MenuFoodInformation) => void;
}) {
  const declaration = food ?? { contains: [], mayContain: [] };
  const allergens = Array.from(new Map([
    ...MENU_ALLERGENS,
    ...declaration.contains,
    ...declaration.mayContain
  ].map(value => [menuAllergenKey(value), value])).values());

  return <details className={styles.food}>
    <summary>Allergeni</summary>
    <div className={styles.foodGrid}>
      {([["contains", "Contiene"], ["mayContain", "Può contenere"]] as const).map(([key, title]) =>
        <AllergenSelect key={key} title={title} allergens={allergens} selected={declaration[key]} onChange={selected => {
          const normalized = new Set(selected.map(menuAllergenKey));
          const other = key === "contains" ? "mayContain" : "contains";
          onChange({ ...declaration, [key]: selected, [other]: declaration[other].filter(value => !normalized.has(menuAllergenKey(value))) });
        }} />
      )}
    </div>
  </details>;
}

export function MenuPriceField({ label, cents, onChange }: {
  label: string;
  cents: number;
  onChange: (value: number) => void;
}) {
  return <label>{label}
    <input type="number" min={0} step="0.01" inputMode="decimal" required
      value={cents / 100} onChange={event => onChange(Math.round(Number(event.target.value) * 100))} />
  </label>;
}
