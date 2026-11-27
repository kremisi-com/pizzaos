import { useState } from "react";
import { productType } from "@pizzaos/domain";
import type { IndividualProduct, MealStep } from "@pizzaos/domain";
import { Button } from "@pizzaos/ui";
import { MenuPriceField } from "./catalog-form-fields";
import styles from "./operational-catalog.module.css";

export function MenuMealFields({ product, products, onChange }: {
  product: IndividualProduct; products: readonly IndividualProduct[]; onChange: (change: Partial<IndividualProduct>) => void;
}) {
  const [queries, setQueries] = useState<Record<string, string>>({});
  const steps = product.meal?.steps ?? [];
  const allowed = products.filter(item => item.id !== product.id && ["pizza", "sandwich", "product"].includes(productType(item)) && item.pizza?.kind !== "formula");
  function update(next: MealStep[]) { onChange({ meal: { steps: next } }); }
  function changeStep(id: string, change: Partial<MealStep>) { update(steps.map(step => step.id === id ? { ...step, ...change } : step)); }
  function move(index: number, offset: number) {
    const next = [...steps];
    [next[index], next[index + offset]] = [next[index + offset], next[index]];
    update(next);
  }
  return <section className={styles.stack} aria-label="Fasi del Menu">
    {steps.map((step, index) => {
      const query = (queries[step.id] ?? "").trim().toLocaleLowerCase("it");
      const visible = allowed.filter(item => item.name.toLocaleLowerCase("it").includes(query));
      return <details className={`${styles.inner} ${styles.mealStep}`} key={step.id} open>
        <summary>Fase {index + 1}</summary>
        <div className={styles.stack}>
          <label>Nome fase<input value={step.name} maxLength={200} required onChange={event => changeStep(step.id, { name: event.target.value })} /></label>
          <p className={styles.small}>Il cliente sceglie un prodotto. Le variazioni si aggiungono al prezzo fisso del Menu.</p>
          <label>Cerca prodotti<input type="search" value={queries[step.id] ?? ""} onChange={event => setQueries(current => ({ ...current, [step.id]: event.target.value }))} /></label>
          <div className={styles.mealAlternatives}>
            {visible.map(item => {
              const selected = step.alternatives.find(alternative => alternative.productId === item.id);
              return <div key={item.id} className={styles.mealAlternative}>
                <label className={styles.check}><input type="checkbox" checked={Boolean(selected)} onChange={event => changeStep(step.id, {
                  alternatives: event.target.checked ? [...step.alternatives, { productId: item.id, priceCents: 0 }] : step.alternatives.filter(alternative => alternative.productId !== item.id)
                })} />{item.name || "Prodotto senza nome"}</label>
                {selected && <MenuPriceField label={`Variazione ${item.name} in euro`} cents={selected.priceCents} allowNegative onChange={priceCents => changeStep(step.id, {
                  alternatives: step.alternatives.map(alternative => alternative.productId === item.id ? { ...alternative, priceCents } : alternative)
                })} />}
              </div>;
          })}
          {allowed.length > 0 && !visible.length && <p role="status">Nessun prodotto trovato.</p>}
          </div>
          {step.alternatives.filter(alternative => !allowed.some(item => item.id === alternative.productId)).map(alternative => <p key={alternative.productId} role="alert">Prodotto non più disponibile nella fase. <Button type="button" variant="ghost" onClick={() => changeStep(step.id, { alternatives: step.alternatives.filter(item => item.productId !== alternative.productId) })}>Rimuovi riferimento</Button></p>)}
          {!allowed.length && <p>Aggiungi prima una pizza con ricetta, un panino o un prodotto al catalogo.</p>}
          <div className={styles.actions}>
            <Button type="button" variant="ghost" aria-label={`Sposta fase ${index + 1} su`} disabled={index === 0} onClick={() => move(index, -1)}>↑</Button>
            <Button type="button" variant="ghost" aria-label={`Sposta fase ${index + 1} giù`} disabled={index === steps.length - 1} onClick={() => move(index, 1)}>↓</Button>
            <Button type="button" variant="ghost" onClick={() => update(steps.filter(item => item.id !== step.id))}>Rimuovi fase</Button>
          </div>
        </div>
      </details>;
    })}
    <Button type="button" variant="secondary" onClick={() => update([...steps, { id: crypto.randomUUID(), name: "", alternatives: [] }])}>Aggiungi fase</Button>
  </section>;
}
