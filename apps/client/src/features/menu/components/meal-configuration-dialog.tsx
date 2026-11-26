"use client";

import { mealRemovableIngredientIds, resolveMealComposition } from "@pizzaos/domain";
import type { IndividualLine, IndividualProduct, IndividualStore, MealSelection } from "@pizzaos/domain";
import { useEffect, useId, useRef, useState } from "react";
import { menuMoney } from "../live-menu-model";
import { MenuFoodSummary } from "./operational-food";
import styles from "./operational-menu.module.css";

export function MealConfigurationDialog({ store, product, line, quantity = 1, disabled, avoid, onClose, onSave, edit }: {
  store: IndividualStore; product: IndividualProduct; line?: IndividualLine; quantity?: number; disabled: boolean;
  avoid: string[]; onClose: () => void; onSave: (line: IndividualLine) => void; edit?: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const title = useId();
  const [selections, setSelections] = useState<MealSelection[]>(() => structuredClone(line?.mealSelections ?? []));
  const [phase, setPhase] = useState(0);
  const [customizing, setCustomizing] = useState(false);
  const steps = product.meal?.steps ?? [];
  const step = steps[phase];
  const selection = selections.find(item => item.stepId === step?.id);
  const child = store.products.find(item => item.id === selection?.productId);
  const preview = resolveMealComposition(product, selections, store.products);
  const outdated = selections.some(choice => {
    const source = store.products.find(item => item.id === choice.productId);
    return !steps.some(item => item.id === choice.stepId && item.alternatives.some(alternative => alternative.productId === choice.productId))
      || !source || choice.removedIngredientIds.some(id => !mealRemovableIngredientIds(source).includes(id));
  });
  const count = line?.quantity ?? quantity;
  useEffect(() => {
    const panel = dialog.current;
    const trigger = document.activeElement;
    panel?.showModal();
    return () => { panel?.close(); if (trigger instanceof HTMLElement) trigger.focus({ preventScroll: true }); };
  }, []);

  function choose(productId: string) {
    if (!step || selection?.productId === productId) return;
    setSelections(current => [...current.filter(item => item.stepId !== step.id), { stepId: step.id, productId, removedIngredientIds: [], notes: "" }]);
    setCustomizing(false);
  }
  function update(change: Partial<MealSelection>) {
    setSelections(current => current.map(item => item.stepId === step?.id ? { ...item, ...change } : item));
  }
  function phaseValid(value: MealSelection) {
    if (!step) return false;
    return resolveMealComposition({ ...product, priceCents: 0, meal: { steps: [{ ...step,
      alternatives: step.alternatives.map(item => ({ ...item, priceCents: 0 })) }] } }, [value], store.products).valid;
  }
  function save() {
    if (disabled || !preview.valid) return;
    onSave({ kind: "product", productId: product.id, quantity: count, optionIds: [], notes: line?.notes ?? "",
      mealSelections: steps.flatMap(item => selections.filter(choice => choice.stepId === item.id)) });
    onClose();
  }
  return <dialog ref={dialog} className={styles.dialog} aria-labelledby={title} onCancel={event => { event.preventDefault(); onClose(); }}>
    <form onSubmit={event => { event.preventDefault(); save(); }}>
      <header className={styles.dialogHead}><div><h2 id={title}>{product.name}</h2><p>{product.description}</p></div>
        <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Chiudi personalizzazione">×</button></header>
      <div className={styles.dialogBody}>
        {outdated && <div className={styles.warning}><p>Alcune scelte del Menu sono cambiate. Ricomponi il Menu prima di confermare.</p>
          <button type="button" className={styles.textButton} onClick={() => { setSelections([]); setPhase(0); setCustomizing(false); }}>Azzera scelte</button>
        </div>}
        {step ? <>
          <p className={styles.groupHint}>Fase {phase + 1} di {steps.length}</p>
          <fieldset className={styles.group} disabled={disabled}><legend>{step.name}</legend>
            {step.alternatives.map(alternative => {
              const item = store.products.find(value => value.id === alternative.productId);
              if (!item) return null;
              const chosen = selection?.productId === item.id;
              const available = phaseValid({ stepId: step.id, productId: item.id, removedIngredientIds: [], notes: "" });
              return <label key={item.id} className={styles.option}>
                <input type="radio" name={`${title}-${step.id}`} checked={chosen} disabled={!available && !chosen} onChange={() => choose(item.id)} />
                <span className={styles.optionName}><strong>{item.name}</strong>{!available && <small>Non disponibile</small>}</span>
                <span>{alternative.priceCents > 0 ? "+" : ""}{alternative.priceCents !== 0 ? menuMoney(alternative.priceCents) : "Incluso"}</span>
              </label>;
            })}
          </fieldset>
          {child && selection && <>
            <button type="button" className={styles.textButton} aria-expanded={customizing} onClick={() => setCustomizing(current => !current)}>Personalizza {child.name}</button>
            {customizing && <fieldset className={styles.group} disabled={disabled}><legend>Ingredienti inclusi</legend>
              {mealRemovableIngredientIds(child).map(id => <label key={id} className={styles.option}>
                <input type="checkbox" checked={!selection.removedIngredientIds.includes(id)} onChange={event => update({
                  removedIngredientIds: event.target.checked ? selection.removedIngredientIds.filter(value => value !== id) : [...selection.removedIngredientIds, id]
                })} />{child.foodIngredients?.find(item => item.id === id)?.name ?? id}
              </label>)}
              <label className={styles.lineNotes}>Note per la cucina<textarea maxLength={1000} value={selection.notes} onChange={event => update({ notes: event.target.value })} /></label>
            </fieldset>}
            {!phaseValid(selection) && <p className={styles.warning}>Questa scelta non è più disponibile. Controlla il prodotto selezionato.</p>}
          </>}
          <div className={styles.itemActions}>
            {phase > 0 && <button type="button" className={styles.textButton} onClick={() => { setPhase(current => current - 1); setCustomizing(false); }}>Indietro</button>}
            {phase < steps.length - 1 && <button type="button" className={styles.textButton} disabled={!selection || !phaseValid(selection)} onClick={() => { setPhase(current => current + 1); setCustomizing(false); }}>Avanti</button>}
          </div>
          <MenuFoodSummary food={preview.composition} avoid={avoid} showUnknown={Boolean(store.menu)} />
        </> : <p>Questo Menu non contiene fasi disponibili.</p>}
      </div>
      <footer className={styles.dialogFoot}><div aria-live="polite"><strong>{menuMoney(preview.unitCents * count)}</strong>{count > 1 && <small>{count} × {menuMoney(preview.unitCents)}</small>}</div>
        <button type="submit" disabled={disabled || !preview.valid || phase !== steps.length - 1}>{edit ? "Aggiorna scelta" : "Aggiungi"}</button></footer>
    </form>
  </dialog>;
}
