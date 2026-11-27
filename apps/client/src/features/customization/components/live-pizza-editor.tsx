"use client";

import { menuAllergenKey, resolveMenuComposition } from "@pizzaos/domain";
import type { IndividualLine, IndividualOption, IndividualProduct, IndividualStore, MenuOptionGroup, MenuSelection } from "@pizzaos/domain";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CollapsibleSection } from "./collapsible-section";
import styles from "./product-detail-screen.module.css";
import live from "./live-pizza-editor.module.css";
import { PizzaFoodDetails } from "./pizza-food-details";
import { useSelectionRecovery } from "../use-selection-recovery";
import { ProductPairings } from "./product-pairings";

const euro = new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" });
const money = (cents: number) => euro.format(cents / 100);
const delta = (cents: number) => cents === 0 ? "Incluso" : `${cents > 0 ? "+" : "−"}${money(Math.abs(cents))}`;
const sections = [
  { kind: "dough", title: "Impasto", icon: "🫓" },
  { kind: "base", title: "Base", icon: "🍅" },
  { kind: "format", title: "Formato", icon: "📐" },
  { kind: "ingredients", title: "Ingredienti", icon: "🧀" },
  { kind: "extras", title: "Extra", icon: "✨" }
] as const;

function selectionCount(group: MenuOptionGroup, choices: readonly MenuSelection[]) {
  return choices.reduce((count, item) => count + (group.optionIds.includes(item.optionId) ? item.quantity : 0), 0);
}

function samePizzaIngredient(left: IndividualOption, right: IndividualOption): boolean {
  if (left.pizza && right.pizza && left.pizza.sourceId === right.pizza.sourceId) return true;
  if (!(left.removesIngredientIds?.length && !right.removesIngredientIds?.length
    || right.removesIngredientIds?.length && !left.removesIngredientIds?.length
    || left.pizza?.kind === "removal" && right.pizza?.kind === "topping"
    || left.pizza?.kind === "topping" && right.pizza?.kind === "removal")) return false;
  const references = (option: IndividualOption) => option.removesIngredientIds
    ?? option.ingredientIds ?? Object.keys(option.ingredients);
  const leftIds = references(left);
  const rightIds = references(right);
  return leftIds.length === 1 && rightIds.length === 1 && leftIds[0] === rightIds[0];
}

function newSelections(product: IndividualProduct, initialSelections?: MenuSelection[]): MenuSelection[] {
  const defaults = product.pizza?.defaultSelections ?? [];
  if (!initialSelections) return defaults.map(choice => ({ ...choice }));
  const replacedGroups = (product.groups ?? []).filter(group => initialSelections.some(choice => group.optionIds.includes(choice.optionId)));
  return [...defaults.filter(choice => !replacedGroups.some(group => group.optionIds.includes(choice.optionId))),
    ...initialSelections].map(choice => ({ ...choice }));
}

export function LivePizzaEditor({ store, product, line, quantity = 1, disabled, avoid, onClose, onSave, onPairing, onChoosePairing, initialSelections }: {
  store: IndividualStore; product: IndividualProduct; line?: IndividualLine; quantity?: number;
  disabled: boolean; avoid: string[]; onClose: () => void; onSave: (line: IndividualLine) => void;
  onPairing?: (line: IndividualLine) => void;
  onChoosePairing?: (product: IndividualProduct) => void;
  initialSelections?: MenuSelection[];
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const { selections, setSelections, recovered, recoveryMessage } = useSelectionRecovery(product, () => line
    ? line.selections ?? line.optionIds.map(optionId => ({ optionId, quantity: 1 }))
    : newSelections(product, initialSelections));
  const [notes, setNotes] = useState(line?.notes ?? "");
  const [openSection, setOpenSection] = useState<string | null>(null);
  const sandwich = product.productType === "sandwich";
  const options = new Map(product.options.map(option => [option.id, option]));
  const recommendedDough = options.get(product.pizza?.recommendedDoughOptionId ?? "");
  const doughAdvice = recommendedDough?.pizza?.kind === "dough" && recommendedDough.available !== false
    ? `Consigliato: ${recommendedDough.name}` : "";
  const allGroups = product.groups ?? [];
  const groups = allGroups.filter(group => sandwich ? ["ingredients", "extras"].includes(group.kind) : group.optionIds.some(id => options.get(id)?.pizza));
  const specificGroups = allGroups.filter(group => !groups.includes(group));
  const preview = resolveMenuComposition(product, selections);
  const lineQuantity = line?.quantity ?? quantity;
  const canSave = !disabled && product.available && preview.valid;
  const requiredGroup = allGroups.find(group => selectionCount(group, selections) < group.min);
  const requiredGroupId = requiredGroup?.id;
  const requiredSection = requiredGroup && groups.some(group => group.id === requiredGroup.id) ? requiredGroup.kind : null;
  const requiredRef = useRef<HTMLDivElement>(null);
  const specificRequiredRef = useRef<HTMLFieldSetElement>(null);
  const [previousRequired, setPreviousRequired] = useState(requiredGroup?.id);
  if (previousRequired !== requiredGroup?.id) {
    setPreviousRequired(requiredGroup?.id);
    if (requiredSection) setOpenSection(requiredSection);
  }
  const selected = (id: string) => selections.find(choice => choice.optionId === id)?.quantity ?? 0;
  const extraGroups = groups.filter(group => group.kind === "extras");
  const extraIds = new Set(extraGroups.flatMap(group => group.optionIds));
  const extraCount = selections.reduce((count, item) => count + (extraIds.has(item.optionId) ? item.quantity : 0), 0);
  const relevant = [...new Set([...preview.composition.contains, ...preview.composition.mayContain])]
    .filter(label => avoid.some(value => menuAllergenKey(label) === menuAllergenKey(value)));

  useEffect(() => {
    const panel = dialog.current;
    const trigger = document.activeElement;
    panel?.showModal();
    return () => {
      panel?.close();
      if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus({ preventScroll: true });
    };
  }, []);

  useEffect(() => {
    if (requiredGroupId) (requiredSection ? requiredRef.current : specificRequiredRef.current)?.focus();
  }, [requiredGroupId, requiredSection]);

  function choose(option: IndividualOption, count: number, group?: MenuOptionGroup) {
    setSelections(current => {
      const next = current.filter(choice => {
        const existing = options.get(choice.optionId);
        return choice.optionId !== option.id
          && !(group?.max === 1 && count > 0 && group.optionIds.includes(choice.optionId))
          && !(count > 0 && existing && (sandwich && samePizzaIngredient(option, existing) || option.pizza && existing.pizza
            && ["topping", "removal"].includes(option.pizza.kind)
            && ["topping", "removal"].includes(existing.pizza.kind)
            && samePizzaIngredient(option, existing)));
      });
      return count > 0 ? [...next, { optionId: option.id, quantity: count }] : next;
    });
  }

  function save() {
    if (!canSave) return;
    onSave({ productId: product.id, ...(product.pizza ? { kind: product.pizza.kind === "taste" ? "pizza_taste" as const : "pizza_formula" as const } : {}),
      quantity: lineQuantity, optionIds: [], selections, notes: notes.trim() });
    onClose();
  }

  function optionPrice(option: IndividualOption) {
    const actual = preview.composition.choices.find(choice => choice.optionId === option.id)?.subtotalCents;
    const count = selected(option.id);
    return actual !== undefined && count > 0 ? actual / count : option.priceCents;
  }

  function renderOptions(group: MenuOptionGroup) {
    return <div className={group.kind === "format" ? styles.optionPillGroup : styles.optionList} role="radiogroup" aria-label={`Scelta ${group.name.toLocaleLowerCase("it-IT")}`}>
      {group.optionIds.flatMap(id => {
        const option = options.get(id);
        if (!option) return [];
        const active = selected(id) > 0;
        return <label key={id} className={`${live.optionControl} ${group.kind === "format"
          ? `${styles.optionPill} ${active ? styles.optionPillActive : ""}`
          : `${styles.optionRow} ${active ? styles.optionRowActive : ""}`}`}>
          <input className={styles.hiddenInput} type="radio" name={`${titleId}-${group.id}`} checked={active}
            disabled={disabled || option.available === false} onChange={() => choose(option, 1, group)} />
          <span className={group.kind === "format" ? styles.optionPillTitle : styles.optionInfo}>
            <span className={styles.optionTitle}>{option.name}</span>
            {option.description && <span className={group.kind === "format" ? styles.optionPillDescription : styles.optionDescription}>{option.description}</span>}
            {option.available === false && <span>Esaurito</span>}
          </span>
          <span className={group.kind === "format" ? styles.optionPillDelta : styles.optionRight}>
            <span className={styles.optionDelta}>{delta(option.priceCents)}</span>
            {group.kind !== "format" && <span className={`${styles.radioCircle} ${active ? styles.radioCircleActive : ""}`} aria-hidden="true" />}
          </span>
        </label>;
      })}
    </div>;
  }

  const removals = product.options.filter(option => sandwich ? option.removesIngredientIds?.length : option.pizza?.kind === "removal");
  const extras = product.options.filter(option => extraIds.has(option.id));

  if (typeof document === "undefined") return null;

  return createPortal(<dialog ref={dialog} className={live.dialog} aria-labelledby={titleId}
    onCancel={event => { event.preventDefault(); onClose(); }}>
    <div className={styles.screen}>
      <section className={styles.hero}>
        <div className={styles.heroTopRow}>
          <button type="button" className={`${styles.backButton} ${live.back}`} onClick={onClose} aria-label="Chiudi personalizzazione"><span aria-hidden="true">←</span> Menu</button>
        </div>
        <div className={styles.titleWrapper}>
          <h1 id={titleId} className={styles.heroTitle}>{product.name}</h1>
        </div>
        <p className={styles.heroDescription}>{product.description}</p>
        <div className={styles.heroMeta}><span className={styles.heroPrice}>{money(preview.unitCents)}</span></div>
        <PizzaFoodDetails composition={preview.composition}
          emptyMessage={sandwich ? "Componi il tuo panino" : undefined} />
      </section>
      {recovered && <div className={live.feedback}>
        <p className={live.status} role="status">{recoveryMessage}</p>
      </div>}
      {relevant.length > 0 && <p className={`${live.feedback} ${live.status}`} role="status">Da verificare per le tue preferenze: {relevant.join(", ")}.</p>}
      <div className={styles.customizationArea}>
        {sections.filter(section => {
          if (sandwich) return groups.some(group => group.kind === section.kind);
          if (section.kind === "base") return groups.some(group => group.kind === "base");
          if (section.kind === "dough" || section.kind === "format") {
            return groups.some(group => group.kind === section.kind
              && (group.id === requiredGroup?.id || group.optionIds.filter(id => options.has(id) && options.get(id)?.available !== false).length > 1));
          }
          return true;
        }).map(section => {
          const matching = groups.filter(group => group.kind === section.kind);
          const chosenNames = matching.flatMap(group => group.optionIds.filter(id => selected(id) > 0).map(id => options.get(id)?.name ?? ""));
          const sectionDelta = matching.flatMap(group => group.optionIds).reduce((sum, id) =>
            sum + (preview.composition.choices.find(choice => choice.optionId === id)?.subtotalCents ?? 0), 0);
          const value = section.kind === "ingredients" ? chosenNames.length ? chosenNames.join(", ") : "Ricetta originale"
            : section.kind === "extras" ? extraCount ? `${extraCount} selezionati` : "Per ancora più gusto!"
              : chosenNames.join(", ") || "Scegli una voce";
          return <div key={section.kind} ref={requiredSection === section.kind ? requiredRef : undefined} tabIndex={-1}><CollapsibleSection {...section} currentValue={value} delta={sectionDelta}
            advice={section.kind === "dough" ? doughAdvice : undefined}
            isOpen={(openSection ?? requiredSection) === section.kind} onToggle={() => setOpenSection(current => current === section.kind ? null : section.kind)}>
            {section.kind === "ingredients" ? <div className={styles.ingredientList}>
              {!removals.length && <p className={live.feedback}>Nessun ingrediente del gusto predefinito.</p>}
              {removals.map(removal => {
                const extra = extras.find(option => option.pizza && removal.pizza && option.pizza.sourceId === removal.pizza.sourceId)
                  ?? extras.find(option => samePizzaIngredient(option, removal));
                const included = selected(removal.id) === 0;
                const name = extra?.name ?? removal.name.replace(/^Senza /u, "");
                return <div className={`${styles.ingredientRow} ${live.ingredientRow}`} key={removal.id}>
                  <div className={styles.ingredientInfo}><h3 className={styles.ingredientName}>{name}</h3></div>
                  <div className={live.ingredientActions}>
                    <button type="button" className={`${styles.ingredientToggle} ${included ? styles.ingredientToggleActive : ""}`}
                      aria-pressed={included} aria-label={`${name} ${included ? "incluso" : "escluso"}`} disabled={disabled || included && removal.available === false}
                      onClick={() => choose(removal, included ? 1 : 0, groups.find(group => group.optionIds.includes(removal.id)))}>
                      <span className={styles.ingredientToggleIndicator} aria-hidden="true" />
                      <span className={styles.ingredientToggleLabel}>{included ? "Incluso" : "Escluso"}</span>
                    </button>
                  </div>
                </div>;
              })}
            </div> : section.kind === "extras" ? <div className={styles.extraList}>
              {product.extraOffer && product.extraOffer.quota > 0 && product.extraOffer.percent > 0 && <div className={styles.bundleQuotaSummary}>
                <span className={styles.bundleQuotaIcon} aria-hidden="true">✨</span>
                <p className={styles.bundleQuotaText}>Hai <span className={styles.bundleQuotaCount}>{Math.max(0, product.extraOffer.quota - extraCount)}</span> slot scontati al <span className={styles.bundleQuotaCount}>{product.extraOffer.percent}%</span> rimanenti.</p>
              </div>}
              {extras.map(option => {
                const group = extraGroups.find(candidate => candidate.optionIds.includes(option.id));
                const count = selected(option.id);
                const amount = optionPrice(option);
                const atLimit = group && selectionCount(group, selections) >= group.max;
                return <div key={option.id} className={`${styles.extraRow} ${live.ingredientRow}`}>
                  <div className={styles.extraInfo}><h3 className={styles.extraName}>{option.name}</h3>
                    {option.description && <p className={styles.extraDesc}>{option.description}</p>}
                    <div className={styles.extraPriceGroup}>
                      {amount < option.priceCents && <span className={styles.extraPriceStrikethrough}>{delta(option.priceCents)}</span>}
                      <span className={amount < option.priceCents ? styles.extraPriceDiscounted : styles.extraPrice}>{delta(amount)}</span>
                    </div>
                    {option.available === false && <p className={live.status}>Esaurito</p>}
                  </div>
                  <div className={live.ingredientActions}>
                  <button type="button" className={`${styles.ingredientToggle} ${count ? styles.ingredientToggleActive : ""}`}
                    aria-pressed={count > 0} aria-label={`${option.name} ${count ? "incluso" : "escluso"}`}
                    disabled={disabled || count === 0 && (option.available === false || Boolean(atLimit))}
                    onClick={() => choose(option, count ? 0 : 1, group)}>
                    <span className={styles.ingredientToggleIndicator} aria-hidden="true" />
                    <span className={styles.ingredientToggleLabel}>{count ? "Incluso" : "Escluso"}</span>
                  </button>
                  </div>
                </div>;
              })}
              {!extras.length && <p className={live.feedback}>Nessun extra disponibile.</p>}
            </div> : matching.map(group => <div key={group.id}>{renderOptions(group)}</div>)}
          </CollapsibleSection></div>;
        })}
        {specificGroups.map(group => <fieldset key={group.id} className={live.specificChoices} disabled={disabled}
          ref={requiredGroup?.id === group.id ? specificRequiredRef : undefined} tabIndex={-1}>
          <legend>{group.name}</legend>
          <p>{group.min === group.max ? `${group.min} scelte richieste` : `Da ${group.min} a ${group.max} scelte`}</p>
          <div className={styles.optionList}>{group.optionIds.map(id => {
            const option = options.get(id);
            if (!option) return null;
            const count = selected(id);
            const total = selectionCount(group, selections);
            return <div key={id} className={`${styles.ingredientRow} ${live.ingredientRow}`}>
              <div><strong>{option.name}</strong> · {delta(option.priceCents)}
                {option.description && <p>{option.description}</p>}
                {option.available === false && <p>Esaurito</p>}
              </div>
              {group.allowRepeat ? <div className={live.ingredientActions}>
                <button type="button" className={live.ingredientExtra} aria-label={`Riduci ${option.name}`}
                  disabled={count === 0} onClick={() => choose(option, count - 1, group)}>−</button>
                <output aria-label={`Quantità ${option.name}`}>{count}</output>
                <button type="button" className={live.ingredientExtra} aria-label={`Aggiungi ${option.name}`}
                  disabled={option.available === false || total >= group.max}
                  onClick={() => choose(option, count + 1, group)}>+</button>
              </div> : <label>
                <input type={group.max === 1 && group.min > 0 ? "radio" : "checkbox"}
                  name={`${titleId}-${group.id}`} checked={count > 0} aria-label={option.name}
                  disabled={option.available === false || count === 0 && group.max !== 1 && total >= group.max}
                  onChange={() => choose(option, count > 0 && (group.min === 0 || group.max > 1) ? 0 : 1, group)} />
                {count ? "Selezionato" : "Scegli"}
              </label>}
            </div>;
          })}</div>
        </fieldset>)}
      </div>
      <ProductPairings store={store} product={product} disabled={disabled}
        onChoose={onChoosePairing ?? (onPairing ? item => onPairing({ productId: item.id, quantity: 1, optionIds: [], notes: "" }) : undefined)}
        simpleOnly={!onChoosePairing} />
      <section className={styles.noteSection} aria-labelledby={`${titleId}-notes`}>
        <div className={styles.noteHeader}><span className={styles.noteIcon} aria-hidden="true">📝</span>
          <div className={styles.noteCopy}><h2 id={`${titleId}-notes`} className={styles.noteTitle}>Note per la cucina</h2>
            <p className={styles.noteDescription}>Aggiungi richieste semplici come taglio, cottura o confezione separata.</p>
          </div>
        </div>
        <label className={styles.noteField}><span className={styles.noteLabel}>Messaggio opzionale</span>
          <textarea className={styles.noteTextarea} value={notes} maxLength={500} rows={4} disabled={disabled}
            placeholder="Es. taglia a spicchi piccoli, metti poca mozzarella" onChange={event => setNotes(event.target.value)} />
        </label>
      </section>
      <div className={styles.stickyCtaWrapper} aria-live="polite">
        {!preview.valid && <p className={live.status}>{sandwich ? "Controlla le scelte prima di aggiungere il panino." : "Controlla le scelte prima di aggiungere la pizza."}</p>}
        <button type="button" className={styles.stickyCtaButton} disabled={!canSave} onClick={save}
          aria-label={recovered ? "Conferma modifica" : `${money(preview.unitCents * lineQuantity)} – ${line ? "Aggiorna scelta" : "Aggiungi al carrello"}`}>
          <span className={styles.ctaPrice} data-testid="customization-total-value">{money(preview.unitCents * lineQuantity)}</span>
          <span className={styles.ctaDot}>·</span><span className={styles.ctaLabel}>{recovered ? "Conferma modifica" : line ? "Aggiorna scelta" : "Aggiungi al carrello"}</span>
        </button>
        {preview.composition.extraDiscountCents > 0 && <small>Sconto extra {money(preview.composition.extraDiscountCents * lineQuantity)}</small>}
      </div>
    </div>
  </dialog>, document.body);
}
