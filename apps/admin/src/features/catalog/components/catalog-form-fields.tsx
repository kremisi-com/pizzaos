import { MENU_ALLERGENS, menuAllergenKey } from "@pizzaos/domain";
import type { IndividualIngredient, MenuFoodInformation } from "@pizzaos/domain";
import { Button } from "@pizzaos/ui";
import styles from "./operational-catalog.module.css";

export function MenuRecipeFields({ label, ingredients, recipe, onChange }: {
  label: string;
  ingredients: readonly IndividualIngredient[];
  recipe: Record<string, number | null>;
  onChange: (recipe: Record<string, number | null>) => void;
}) {
  const selected = new Set(Object.keys(recipe));
  const remaining = ingredients.filter(ingredient => !selected.has(ingredient.id));

  function removeIngredient(id: string) {
    const next = { ...recipe };
    delete next[id];
    onChange(next);
  }

  return <fieldset className={styles.inner}>
    <legend>{label}</legend>
    {Object.values(recipe).includes(null) && <p>Completa le dosi da verificare prima di pubblicare il menu.</p>}
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

export function MenuFoodFields({ food, onChange }: {
  food?: MenuFoodInformation;
  onChange: (food?: MenuFoodInformation) => void;
}) {
  const declared = food !== undefined;
  const allergens = Array.from(new Map([
    ...MENU_ALLERGENS,
    ...(food?.contains ?? []),
    ...(food?.mayContain ?? [])
  ].map(value => [menuAllergenKey(value), value])).values());

  return <details className={styles.food}>
    <summary>Allergeni · {declared ? "verificati" : "da verificare"}</summary>
    <label className={styles.check}>
      <input type="checkbox" checked={declared} onChange={event => {
        onChange(event.target.checked ? { contains: [], mayContain: [] } : undefined);
      }} />
      Informazioni allergeni verificate
    </label>
    {food && <div className={styles.foodGrid}>
      {([["contains", "Contiene"], ["mayContain", "Può contenere"]] as const).map(([key, title]) =>
        <fieldset key={key} className={styles.inner}>
          <legend>{title}</legend>
          <div className={styles.checkGrid}>
            {allergens.map(allergen => {
              const normalized = menuAllergenKey(allergen);
              return <label className={styles.check} key={normalized}>
                <input type="checkbox" checked={food[key].some(value => menuAllergenKey(value) === normalized)} onChange={event => {
                  const selected = food[key].filter(value => menuAllergenKey(value) !== normalized);
                  const other = key === "contains" ? "mayContain" : "contains";
                  onChange(event.target.checked
                    ? { ...food, [key]: [...selected, allergen], [other]: food[other].filter(value => menuAllergenKey(value) !== normalized) }
                    : { ...food, [key]: selected });
                }} />
                {allergen}
              </label>;
            })}
          </div>
        </fieldset>
      )}
    </div>}
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
