"use client";

import { mealRemovableIngredientIds, productType, resolveMealComposition } from "@pizzaos/domain";
import type { IndividualLine, IndividualProduct, IndividualStore, MealSelection } from "@pizzaos/domain";
import { useEffect, useId, useRef, useState } from "react";
import { ProductPairings } from "../../customization";
import { menuMoney } from "../live-menu-model";
import { MenuFoodSummary } from "./operational-food";
import styles from "./operational-menu.module.css";

function validPhase(product: IndividualProduct, index: number, selection: MealSelection | undefined, products: IndividualProduct[]) {
  const step = product.meal?.steps[index];
  return Boolean(step && selection && resolveMealComposition({ ...product, priceCents: 0, meal: { steps: [{ ...step,
    alternatives: step.alternatives.map(item => ({ ...item, priceCents: 0 })) }] } }, [selection], products).valid);
}

function firstInvalidPhase(product: IndividualProduct, selections: MealSelection[], products: IndividualProduct[]) {
  return product.meal?.steps.findIndex((step, index) => !validPhase(product, index, selections.find(item => item.stepId === step.id), products)) ?? -1;
}

export function MealConfigurationDialog({ store, product, line, quantity = 1, disabled, avoid, onClose, onSave, edit, onChoosePairing }: {
  store: IndividualStore; product: IndividualProduct; line?: IndividualLine; quantity?: number; disabled: boolean;
  onChoosePairing?: (product: IndividualProduct) => void;
  avoid: string[]; onClose: () => void; onSave: (line: IndividualLine) => void; edit?: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const title = useId();
  const [draft, setDraft] = useState(() => ({ selections: structuredClone(line?.mealSelections ?? []), recovered: false }));
  const [phase, setPhase] = useState(() => line ? Math.max(0, firstInvalidPhase(product, line.mealSelections ?? [], store.products)) : 0);
  const [customizing, setCustomizing] = useState(false);
  const steps = product.meal?.steps ?? [];
  const selections = draft.selections.flatMap(choice => {
    const source = store.products.find(item => item.id === choice.productId);
    if (!source || !source.available || !steps.some(step => step.id === choice.stepId && step.alternatives.some(item => item.productId === choice.productId))) return [];
    return [{ ...choice, removedIngredientIds: choice.removedIngredientIds.filter(id => mealRemovableIngredientIds(source).includes(id)) }];
  });
  const corrected = JSON.stringify(selections) !== JSON.stringify(draft.selections);
  if (corrected) setDraft({ selections, recovered: true });
  const recovered = draft.recovered || corrected;
  const catalog = JSON.stringify({ product, products: store.products });
  const [previousCatalog, setPreviousCatalog] = useState(catalog);
  if (previousCatalog !== catalog) {
    setPreviousCatalog(catalog);
    const invalid = firstInvalidPhase(product, selections, store.products);
    setPhase(invalid >= 0 ? invalid : Math.min(phase, Math.max(0, steps.length - 1)));
    setCustomizing(false);
  }
  const step = steps[phase];
  const selection = selections.find(item => item.stepId === step?.id);
  const child = store.products.find(item => item.id === selection?.productId);
  const preview = resolveMealComposition(product, selections, store.products);
  const count = line?.quantity ?? quantity;
  useEffect(() => {
    const panel = dialog.current;
    const trigger = document.activeElement;
    panel?.showModal();
    return () => { panel?.close(); if (trigger instanceof HTMLElement) trigger.focus({ preventScroll: true }); };
  }, []);

  function choose(productId: string) {
    if (!step || selection?.productId === productId) return;
    setDraft(current => ({ ...current, selections: [...current.selections.filter(item => item.stepId !== step.id), { stepId: step.id, productId, removedIngredientIds: [], notes: "" }] }));
    setCustomizing(false);
  }
  function update(change: Partial<MealSelection>) {
    setDraft(current => ({ ...current, selections: current.selections.map(item => item.stepId === step?.id ? { ...item, ...change } : item) }));
  }
  function phaseValid(value: MealSelection) {
    return validPhase(product, phase, value, store.products);
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
        {recovered && <p className={styles.warning} role="status">Alcune scelte del Menu non sono più disponibili e sono state rimosse. Controlla le fasi e il prezzo prima di confermare la modifica.</p>}
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
            <button type="button" className={productType(child) === "pizza" ? styles.mealCustomize : styles.textButton}
              aria-expanded={customizing} onClick={() => setCustomizing(current => !current)}>
              {productType(child) === "pizza" ? "Personalizza Scelta" : `Personalizza ${child.name}`}
            </button>
            {customizing && <fieldset className={styles.group} disabled={disabled}>
              {["pizza", "sandwich"].includes(productType(child)) && <><legend>Ingredienti inclusi</legend>
              {mealRemovableIngredientIds(child).map(id => <label key={id} className={styles.option}>
                <input type="checkbox" checked={!selection.removedIngredientIds.includes(id)} onChange={event => update({
                  removedIngredientIds: event.target.checked ? selection.removedIngredientIds.filter(value => value !== id) : [...selection.removedIngredientIds, id]
                })} />{child.foodIngredients?.find(item => item.id === id)?.name ?? id}
              </label>)}</>}
              <label className={styles.lineNotes}>Note per la cucina<textarea maxLength={1000} value={selection.notes} onChange={event => update({ notes: event.target.value })} /></label>
            </fieldset>}
            {!phaseValid(selection) && <p className={styles.warning}>Questa scelta non è più disponibile. Controlla il prodotto selezionato.</p>}
          </>}
          <div className={styles.mealNavigation}>
            {phase > 0 && <button type="button" className={styles.textButton} onClick={() => { setPhase(current => current - 1); setCustomizing(false); }}>Indietro</button>}
            {phase < steps.length - 1 && <button type="button" className={styles.mealNext} disabled={!selection || !phaseValid(selection)} onClick={() => { setPhase(current => current + 1); setCustomizing(false); }}>Scelta Successiva</button>}
          </div>
          <MenuFoodSummary food={preview.composition} avoid={avoid} showUnknown={Boolean(store.menu)} />
        </> : <p>Questo Menu non contiene fasi disponibili.</p>}
        <ProductPairings store={store} product={product} disabled={disabled} onChoose={onChoosePairing} />
      </div>
      <footer className={styles.dialogFoot}><div aria-live="polite"><strong>{menuMoney(preview.unitCents * count)}</strong>{count > 1 && <small>{count} × {menuMoney(preview.unitCents)}</small>}</div>
        <button type="submit" disabled={disabled || !preview.valid || phase !== steps.length - 1}>{recovered ? "Conferma modifica" : edit ? "Aggiorna scelta" : "Aggiungi"}</button></footer>
    </form>
  </dialog>;
}
