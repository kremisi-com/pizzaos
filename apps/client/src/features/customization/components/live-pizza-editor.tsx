"use client";

import { menuAllergenKey, resolveMenuComposition } from "@pizzaos/domain";
import type { IndividualLine, IndividualOption, IndividualProduct, IndividualStore, MenuOptionGroup, MenuSelection } from "@pizzaos/domain";
import { Badge } from "@pizzaos/ui";
import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CollapsibleSection } from "./collapsible-section";
import { pizzaPreview } from "../pizza-presentation";
import styles from "./product-detail-screen.module.css";
import live from "./live-pizza-editor.module.css";

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
  if (!(left.pizza?.kind === "removal" && right.pizza?.kind === "topping"
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

export function LivePizzaEditor({ store, product, line, quantity = 1, disabled, avoid, onClose, onSave, onPairing, initialSelections }: {
  store: IndividualStore; product: IndividualProduct; line?: IndividualLine; quantity?: number;
  disabled: boolean; avoid: string[]; onClose: () => void; onSave: (line: IndividualLine) => void;
  onPairing?: (line: IndividualLine) => void;
  initialSelections?: MenuSelection[];
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [selections, setSelections] = useState<MenuSelection[]>(() => line
    ? line.selections ?? line.optionIds.map(optionId => ({ optionId, quantity: 1 }))
    : newSelections(product, initialSelections));
  const [notes, setNotes] = useState(line?.notes ?? "");
  const [openSection, setOpenSection] = useState<string | null>(null);
  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const [showFood, setShowFood] = useState(false);
  const [pairingMessage, setPairingMessage] = useState("");
  const options = new Map(product.options.map(option => [option.id, option]));
  const allGroups = product.groups ?? [];
  const groups = allGroups.filter(group => group.optionIds.some(id => options.get(id)?.pizza));
  const specificGroups = allGroups.filter(group => !group.optionIds.some(id => options.get(id)?.pizza));
  const preview = resolveMenuComposition(product, selections);
  const lineQuantity = line?.quantity ?? quantity;
  const canSave = !disabled && product.available && preview.valid;
  const changed = selections.some(choice => !options.has(choice.optionId) || options.get(choice.optionId)?.available === false);
  const selected = (id: string) => selections.find(choice => choice.optionId === id)?.quantity ?? 0;
  const image = pizzaPreview(product, selections, store.id);
  const pairings = onPairing ? store.products.filter(item => item.available && !item.groups?.length && product.pairingProductIds?.includes(item.id)) : [];
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

  function choose(option: IndividualOption, count: number, group?: MenuOptionGroup) {
    setSelections(current => {
      const next = current.filter(choice => {
        const existing = options.get(choice.optionId);
        return choice.optionId !== option.id
          && !(group?.max === 1 && count > 0 && group.optionIds.includes(choice.optionId))
          && !(count > 0 && option.pizza && existing?.pizza
            && ["topping", "removal"].includes(option.pizza.kind)
            && ["topping", "removal"].includes(existing.pizza.kind)
            && samePizzaIngredient(option, existing));
      });
      return count > 0 ? [...next, { optionId: option.id, quantity: count }] : next;
    });
  }

  function save() {
    if (!canSave) return;
    onSave({ productId: product.id, kind: product.pizza?.kind === "taste" ? "pizza_taste" : "pizza_formula",
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

  const removals = product.options.filter(option => option.pizza?.kind === "removal");
  const extras = product.options.filter(option => extraIds.has(option.id));
  const categories = [...new Set(extras.map(option => option.pizza?.category ?? "Altri extra"))];

  if (typeof document === "undefined") return null;

  return createPortal(<dialog ref={dialog} className={live.dialog} aria-labelledby={titleId}
    onCancel={event => { event.preventDefault(); onClose(); }}>
    <div className={styles.screen}>
      <section className={styles.hero}>
        <div className={styles.heroTopRow}>
          <button type="button" className={`${styles.backButton} ${live.back}`} onClick={onClose} aria-label="Chiudi personalizzazione"><span aria-hidden="true">←</span> Menu</button>
        </div>
        {image.src ? <div className={styles.generatorPreview}><div className={`${styles.generatorPreviewFrame} ${live.previewFrame}`}>
          <Image unoptimized src={image.src} alt={`Anteprima pizza ${product.name}`} width={360} height={360}
            className={image.configured ? styles.generatorPreviewImage : live.fallback} />
          {image.overlay && <Image unoptimized src={image.overlay}
            alt="" aria-hidden="true" width={330} height={330} className={styles.generatorPreviewOverlay} />}
        </div></div> : <div className={live.emptyPreview}><span aria-hidden="true">🍕</span><p>La tua pizza prende forma qui.</p></div>}
        <div className={styles.titleWrapper}>
          <h1 id={titleId} className={styles.heroTitle}>{product.name}</h1>
          <button type="button" className={styles.infoButton} onClick={() => setShowFood(current => !current)}
            aria-expanded={showFood} aria-label="Informazioni ingredienti e allergeni">🔍</button>
        </div>
        <p className={styles.heroDescription}>{product.description}</p>
        <div className={styles.heroMeta}><span className={styles.heroPrice}>{money(preview.unitCents)}</span></div>
        <div className={styles.allergenSummary} aria-label="Allergeni attivi">
          {preview.composition.contains.map(label => <Badge tone="warning" key={label}>{label}</Badge>)}
        </div>
        {preview.composition.mayContain.length > 0 && <p>Può contenere: {preview.composition.mayContain.join(", ")}</p>}
        {!preview.composition.foodComplete && <p>Informazione da verificare</p>}
        {showFood && <div className={styles.modalIngredientList}>
          <h2>Ingredienti e allergeni</h2>
          <p>{preview.composition.ingredients.join(", ") || "Componi la tua pizza"}</p>
          {preview.composition.contains.length > 0 && <p>Contiene: {preview.composition.contains.join(", ")}</p>}
          {store.menu?.kitchenNotice && <p>{store.menu.kitchenNotice}</p>}
        </div>}
      </section>
      {changed && <div className={live.feedback}>
        <p className={live.status} role="status">Alcune opzioni sono cambiate. Controlla le nuove scelte.</p>
        <button type="button" className={live.ingredientExtra} disabled={disabled}
          onClick={() => setSelections(product.pizza?.defaultSelections.map(choice => ({ ...choice })) ?? [])}>Riparti dalle scelte standard</button>
      </div>}
      {relevant.length > 0 && <p className={`${live.feedback} ${live.status}`} role="status">Da verificare per le tue preferenze: {relevant.join(", ")}.</p>}
      <div className={styles.customizationArea}>
        {sections.map(section => {
          const matching = groups.filter(group => group.kind === section.kind);
          const chosenNames = matching.flatMap(group => group.optionIds.filter(id => selected(id) > 0).map(id => options.get(id)?.name ?? ""));
          const sectionDelta = matching.flatMap(group => group.optionIds).reduce((sum, id) =>
            sum + (preview.composition.choices.find(choice => choice.optionId === id)?.subtotalCents ?? 0), 0);
          const value = section.kind === "ingredients" ? chosenNames.length ? chosenNames.join(", ") : "Ricetta originale"
            : section.kind === "extras" ? extraCount ? `${extraCount} selezionati` : "Nessun extra"
              : chosenNames.join(", ") || "Scegli una voce";
          return <CollapsibleSection key={section.kind} {...section} currentValue={value} delta={sectionDelta}
            isOpen={openSection === section.kind} onToggle={() => setOpenSection(current => current === section.kind ? null : section.kind)}>
            {section.kind === "ingredients" ? <div className={styles.ingredientList}>
              {!removals.length && <p className={live.feedback}>Nessun ingrediente del gusto predefinito.</p>}
              {removals.map(removal => {
                const extra = extras.find(option => option.pizza?.sourceId === removal.pizza?.sourceId)
                  ?? extras.find(option => samePizzaIngredient(option, removal));
                const included = selected(removal.id) === 0;
                const name = extra?.name ?? removal.name.replace(/^Senza /u, "");
                return <div className={`${styles.ingredientRow} ${live.ingredientRow}`} key={removal.id}>
                  <div className={styles.ingredientInfo}><h3 className={styles.ingredientName}>{name}</h3></div>
                  <div className={live.ingredientActions}>
                    {extra && <button type="button" className={live.ingredientExtra} aria-label={`${name} extra`}
                      aria-pressed={selected(extra.id) > 0} disabled={disabled || extra.available === false}
                      onClick={() => choose(extra, selected(extra.id) ? 0 : 1, groups.find(group => group.optionIds.includes(extra.id)))}>Extra</button>}
                    <button type="button" className={`${styles.ingredientToggle} ${included ? styles.ingredientToggleActive : ""}`}
                      aria-pressed={included} aria-label={`${name} ${included ? "incluso" : "escluso"}`} disabled={disabled}
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
              {categories.map(category => <section className={styles.extraCategory} key={category}>
                <button type="button" className={`${styles.extraCategoryHeader} ${openCategory === category ? styles.extraCategoryHeaderOpen : ""}`}
                  aria-expanded={openCategory === category} onClick={() => setOpenCategory(current => current === category ? null : category)}>
                  <div className={styles.sectionTitleGroup}><h3 className={styles.extraCategoryTitle}>{category}</h3>
                    <span className={styles.extraCategoryCount}>{extras.filter(option => (option.pizza?.category ?? "Altri extra") === category).length} opzioni disponibili</span>
                  </div><span className={styles.extraCategoryChevron} aria-hidden="true">{openCategory === category ? "▴" : "▾"}</span>
                </button>
                <div className={`${styles.extraCategoryContent} ${openCategory === category ? styles.extraCategoryContentOpen : ""}`} inert={openCategory !== category}>
                  {extras.filter(option => (option.pizza?.category ?? "Altri extra") === category).map(option => {
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
                      {group?.allowRepeat && count > 0 && <div className={live.stepper}>
                        <button type="button" aria-label={`Togli ${option.name}`} disabled={disabled || count === 0} onClick={() => choose(option, count - 1, group)}>−</button>
                        <output aria-label={`Quantità ${option.name}`}>{count}</output>
                        <button type="button" aria-label={`Aggiungi ${option.name}`} disabled={disabled || option.available === false || Boolean(atLimit)} onClick={() => choose(option, count + 1, group)}>+</button>
                      </div>}
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
                </div>
              </section>)}
              {!extras.length && <p className={live.feedback}>Nessun extra disponibile.</p>}
            </div> : matching.map(group => <div key={group.id}>{renderOptions(group)}</div>)}
          </CollapsibleSection>;
        })}
        {specificGroups.map(group => <fieldset key={group.id} className={live.specificChoices} disabled={disabled}>
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
      <section className={styles.noteSection} aria-labelledby={`${titleId}-notes`}>
        <div className={styles.noteHeader}><span className={styles.noteIcon} aria-hidden="true">📝</span>
          <div className={styles.noteCopy}><h2 id={`${titleId}-notes`} className={styles.noteTitle}>Note per la cucina</h2>
            <p className={styles.noteDescription}>Aggiungi richieste semplici come taglio, cottura o confezione separata.</p>
          </div>
        </div>
        <label className={styles.noteField}><span className={styles.noteLabel}>Messaggio opzionale</span>
          <textarea className={styles.noteTextarea} value={notes} maxLength={500} rows={4} disabled={disabled}
            placeholder="Es. taglia a spicchi piccoli, consegna senza suonare" onChange={event => setNotes(event.target.value)} />
        </label>
      </section>
      {pairings.length > 0 && <section className={styles.pairingsSection}>
        <h2 className={styles.pairingsTitle}>Abbinamenti consigliati</h2>
        <div className={styles.pairingsList}>{pairings.map(pairing => <div key={pairing.id} className={styles.pairingCard}>
          <div className={styles.pairingInfo}><p className={styles.pairingName}>{pairing.name}</p><p className={styles.pairingDescription}>{pairing.description}</p></div>
          <div className={styles.pairingPriceGroup}><span className={styles.pairingPrice}>{money(pairing.priceCents)}</span>
            <button type="button" className={styles.pairingAddButton} disabled={disabled} aria-label={`Aggiungi ${pairing.name} al carrello`}
              onClick={() => { onPairing?.({ productId: pairing.id, quantity: 1, optionIds: [], notes: "" }); setPairingMessage(`${pairing.name} aggiunto al carrello`); }}>＋</button>
          </div>
        </div>)}</div>
        {pairingMessage && <p role="status">{pairingMessage}</p>}
      </section>}
      <div className={styles.stickyCtaWrapper} aria-live="polite">
        {!preview.valid && <p className={live.status}>Controlla le scelte prima di aggiungere la pizza.</p>}
        <button type="button" className={styles.stickyCtaButton} disabled={!canSave} onClick={save}
          aria-label={`${money(preview.unitCents * lineQuantity)} – ${line ? "Aggiorna scelta" : "Aggiungi al carrello"}`}>
          <span className={styles.ctaPrice} data-testid="customization-total-value">{money(preview.unitCents * lineQuantity)}</span>
          <span className={styles.ctaDot}>·</span><span className={styles.ctaLabel}>{line ? "Aggiorna scelta" : "Aggiungi al carrello"}</span>
        </button>
        {preview.composition.extraDiscountCents > 0 && <small>Sconto extra {money(preview.composition.extraDiscountCents * lineQuantity)}</small>}
      </div>
    </div>
  </dialog>, document.body);
}
