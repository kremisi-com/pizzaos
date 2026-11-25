import type { IndividualIngredient, MenuDraft, PizzaTopping } from "@pizzaos/domain";

const money = new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" });

function details(item: PizzaTopping, ingredient?: IndividualIngredient) {
  const food = item.food;
  const price = ingredient?.extra?.priceCents === null ? "Prezzo da verificare" : money.format(item.priceCents / 100);
  return `${price} · Dose ${Object.values(item.ingredients)[0] ?? "da verificare"} · Contiene: ${food?.contains.join(", ") || (food ? "nessuno" : "da verificare")} · Può contenere: ${food?.mayContain.join(", ") || (food ? "nessuno" : "da verificare")}`;
}

export function MenuExtraChanges({ before, after, ingredients }: { before: MenuDraft; after: MenuDraft; ingredients: readonly IndividualIngredient[] }) {
  const inventory = new Map(ingredients.map(item => [item.id, item]));
  const previous = new Map(before.pizzaCatalog?.toppings.filter(item => item.inventoryIngredientId)
    .map(item => [item.inventoryIngredientId, item]));
  const current = new Map(after.pizzaCatalog?.toppings.filter(item => item.inventoryIngredientId)
    .map(item => [item.inventoryIngredientId, item]));
  const ids = new Set([...previous.keys(), ...current.keys()]);
  return <section aria-label="Modifiche agli extra">
    <p>Gli extra del Magazzino sono cambiati. Confermando, aggiorni la bozza e pubblichi il menu con questi dati.</p>
    <ul>{Array.from(ids).map(id => {
      const old = previous.get(id), next = current.get(id);
      const ingredient = id ? inventory.get(id) : undefined;
      if (old && next && old.name === next.name && details(old) === details(next, ingredient)) return null;
      return <li key={id}>
        {old && next ? <><strong>{old.name === next.name ? next.name : `${old.name} → ${next.name}`}</strong><div>Prima: {details(old)}</div><div>Ora: {details(next, ingredient)}</div></>
          : next ? <><strong>{next.name}: aggiunto</strong><div>{details(next, ingredient)}</div></>
            : old ? <strong>{old.name}: rimosso dagli extra</strong> : null}
      </li>;
    })}</ul>
  </section>;
}
