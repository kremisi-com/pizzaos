"use client";

import { mealRemovableIngredientIds, menuAllergenKey, resolveMealComposition } from "@pizzaos/domain";
import type { IndividualLine, IndividualProduct, IndividualStore, MealSelection } from "@pizzaos/domain";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CollapsibleSection } from "./collapsible-section";
import { PizzaFoodDetails } from "./pizza-food-details";
import { ProductPairings } from "./product-pairings";
import styles from "./product-detail-screen.module.css";
import live from "./live-pizza-editor.module.css";

const euro = new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" });
const money = (cents: number) => euro.format(cents / 100);
const delta = (cents: number) => cents === 0 ? "Incluso" : `${cents > 0 ? "+" : "−"}${money(Math.abs(cents))}`;

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
  const openPhase = useRef<HTMLDivElement>(null);
  const title = useId();
  const [draft, setDraft] = useState(() => ({ selections: structuredClone(line?.mealSelections ?? []), recovered: false }));
  const [openStepId, setOpenStepId] = useState<string | null>(() => {
    const invalid = firstInvalidPhase(product, line?.mealSelections ?? [], store.products);
    return product.meal?.steps[Math.max(0, invalid)]?.id ?? null;
  });
  const [notes, setNotes] = useState(line?.notes ?? "");
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
    if (invalid >= 0) setOpenStepId(steps[invalid].id);
    else if (!steps.some(step => step.id === openStepId)) setOpenStepId(steps[0]?.id ?? null);
  }
  const preview = resolveMealComposition(product, selections, store.products);
  const count = line?.quantity ?? quantity;
  const canSave = !disabled && product.available && preview.valid;
  const relevant = [...new Set([...preview.composition.contains, ...preview.composition.mayContain])]
    .filter(label => avoid.some(value => menuAllergenKey(label) === menuAllergenKey(value)));
  useEffect(() => {
    const panel = dialog.current;
    const trigger = document.activeElement;
    panel?.showModal();
    return () => { panel?.close(); if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus({ preventScroll: true }); };
  }, []);
  useEffect(() => {
    const header = openPhase.current?.querySelector("button");
    header?.focus({ preventScroll: true });
    header?.scrollIntoView?.({ block: "nearest", behavior: "smooth" });
  }, [openStepId]);

  function choose(index: number, productId: string) {
    const step = steps[index];
    if (!step || selections.some(item => item.stepId === step.id && item.productId === productId)) return;
    setDraft(current => ({ ...current, selections: [...current.selections.filter(item => item.stepId !== step.id),
      { stepId: step.id, productId, removedIngredientIds: [], notes: "" }] }));
    if (steps[index + 1]) setOpenStepId(steps[index + 1].id);
  }
  function update(stepId: string, change: Partial<MealSelection>) {
    setDraft(current => ({ ...current, selections: current.selections.map(item => item.stepId === stepId ? { ...item, ...change } : item) }));
  }
  function save() {
    if (!canSave) return;
    onSave({ kind: "product", productId: product.id, quantity: count, optionIds: [], notes: notes.trim(),
      mealSelections: steps.flatMap(item => selections.filter(choice => choice.stepId === item.id)) });
    onClose();
  }
  if (typeof document === "undefined") return null;
  const action = recovered ? "Conferma modifica" : edit ? "Aggiorna scelta" : "Aggiungi al carrello";
  return createPortal(<dialog ref={dialog} className={live.dialog} aria-labelledby={title}
    onCancel={event => { event.preventDefault(); onClose(); }}>
    <div className={styles.screen}>
      <section className={styles.hero}>
        <div className={styles.heroTopRow}>
          <button type="button" className={`${styles.backButton} ${live.back}`} onClick={onClose} aria-label="Chiudi personalizzazione"><span aria-hidden="true">←</span> Menu</button>
        </div>
        <div className={styles.titleWrapper}><h1 id={title} className={styles.heroTitle}>{product.name}</h1></div>
        <p className={styles.heroDescription}>{product.description}</p>
        <div className={styles.heroMeta}><span className={styles.heroPrice}>{money(preview.unitCents)}</span></div>
        <PizzaFoodDetails composition={preview.composition} emptyMessage="" />
      </section>
      {recovered && <p className={`${live.feedback} ${live.status}`} role="status">Alcune scelte del Menu non sono più disponibili e sono state rimosse. Controlla le fasi e il prezzo prima di confermare la modifica.</p>}
      {relevant.length > 0 && <p className={`${live.feedback} ${live.status}`} role="status">Da verificare per le tue preferenze: {relevant.join(", ")}.</p>}
      <div className={styles.customizationArea}>
        {steps.map((step, index) => {
          const selection = selections.find(item => item.stepId === step.id);
          const child = store.products.find(item => item.id === selection?.productId);
          const adjustment = step.alternatives.find(item => item.productId === selection?.productId)?.priceCents ?? 0;
          const removable = child ? mealRemovableIngredientIds(child) : [];
          return <div key={step.id} ref={openStepId === step.id ? openPhase : undefined}>
            <CollapsibleSection icon="🍽️" title={step.name} currentValue={child?.name ?? "Scegli una voce"}
              delta={adjustment} isOpen={openStepId === step.id}
              onToggle={() => setOpenStepId(current => current === step.id ? null : step.id)}>
              <div className={styles.optionList} role="radiogroup" aria-label={step.name}>
                {step.alternatives.map(alternative => {
                  const item = store.products.find(value => value.id === alternative.productId);
                  if (!item) return null;
                  const chosen = selection?.productId === item.id;
                  const available = validPhase(product, index, { stepId: step.id, productId: item.id, removedIngredientIds: [], notes: "" }, store.products);
                  return <label key={item.id} className={`${live.optionControl} ${styles.optionRow} ${chosen ? styles.optionRowActive : ""}`}>
                    <input className={styles.hiddenInput} type="radio" name={`${title}-${step.id}`} checked={chosen}
                      disabled={disabled || !available} onChange={() => choose(index, item.id)} />
                    <span className={styles.optionInfo}><span className={styles.optionTitle}>{item.name}</span>
                      {!available && <span className={styles.optionDescription}>Non disponibile</span>}</span>
                    <span className={styles.optionRight}><span className={styles.optionDelta}>{delta(alternative.priceCents)}</span>
                      <span className={`${styles.radioCircle} ${chosen ? styles.radioCircleActive : ""}`} aria-hidden="true" /></span>
                  </label>;
                })}
              </div>
              {child && selection && <div role="group" aria-label={`Personalizza ${child.name}`}>
                {removable.length > 0 && <div className={styles.ingredientList}>
                  {removable.map(id => {
                    const name = child.foodIngredients?.find(item => item.id === id)?.name ?? id;
                    const included = !selection.removedIngredientIds.includes(id);
                    return <div key={id} className={`${styles.ingredientRow} ${live.ingredientRow}`}>
                      <div className={styles.ingredientInfo}><h3 className={styles.ingredientName}>{name}</h3></div>
                      <button type="button" className={`${styles.ingredientToggle} ${included ? styles.ingredientToggleActive : ""}`}
                        aria-label={`${name} ${included ? "incluso" : "escluso"}`} aria-pressed={included} disabled={disabled}
                        onClick={() => update(step.id, { removedIngredientIds: included ? [...selection.removedIngredientIds, id] : selection.removedIngredientIds.filter(value => value !== id) })}>
                        <span className={styles.ingredientToggleIndicator} aria-hidden="true" />
                        <span className={styles.ingredientToggleLabel}>{included ? "Incluso" : "Escluso"}</span>
                      </button>
                    </div>;
                  })}
                </div>}
                <label className={`${styles.noteField} ${live.feedback}`}><span className={styles.noteLabel}>Note per la cucina</span>
                  <textarea className={styles.noteTextarea} value={selection.notes} maxLength={1000} rows={3} disabled={disabled}
                    onChange={event => update(step.id, { notes: event.target.value })} /></label>
                {!validPhase(product, index, selection, store.products) && <p className={`${live.feedback} ${live.status}`}>Questa scelta non è più disponibile. Controlla il prodotto selezionato.</p>}
              </div>}
            </CollapsibleSection>
          </div>;
        })}
        {!steps.length && <p className={live.feedback}>Questo Menu non contiene fasi disponibili.</p>}
      </div>
      <ProductPairings store={store} product={product} disabled={disabled} onChoose={onChoosePairing} />
      <section className={styles.noteSection} aria-labelledby={`${title}-notes`}>
        <div className={styles.noteHeader}><span className={styles.noteIcon} aria-hidden="true">📝</span>
          <div className={styles.noteCopy}><h2 id={`${title}-notes`} className={styles.noteTitle}>Note per la cucina</h2>
            <p className={styles.noteDescription}>Aggiungi richieste semplici come taglio, cottura o confezione separata.</p></div>
        </div>
        <label className={styles.noteField}><span className={styles.noteLabel}>Messaggio opzionale</span>
          <textarea className={styles.noteTextarea} value={notes} maxLength={500} rows={4} disabled={disabled}
            onChange={event => setNotes(event.target.value)} /></label>
      </section>
      <div className={styles.stickyCtaWrapper} aria-live="polite">
        <button type="button" className={styles.stickyCtaButton} disabled={!canSave} onClick={save}
          aria-label={recovered ? action : `${money(preview.unitCents * count)} – ${action}`}>
          <span className={styles.ctaPrice} data-testid="customization-total-value">{money(preview.unitCents * count)}</span>
          <span className={styles.ctaDot}>·</span><span className={styles.ctaLabel}>{action}</span>
        </button>
      </div>
    </div>
  </dialog>, document.body);
}
