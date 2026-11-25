"use client";

import { resolveMenuComposition } from "@pizzaos/domain";
import type { IndividualLine, IndividualProduct, IndividualStore, MenuOptionGroup, MenuSelection } from "@pizzaos/domain";
import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";
import { LivePizzaEditor, pizzaInitialSelections, pizzaPreview } from "../../customization";
import { lineChoiceLabels, lineIssue, menuMoney, menuSelections } from "../live-menu-model";
import { MenuFoodSummary, type MenuPreferences } from "./operational-food";
import styles from "./operational-menu.module.css";

function optionCount(group: MenuOptionGroup, choices: MenuSelection[]): number {
  return choices.reduce((count, choice) => count + (group.optionIds.includes(choice.optionId) ? choice.quantity : 0), 0);
}

function ConfigurationDialog(props: Parameters<typeof GenericConfigurationDialog>[0]) {
  return props.product.pizza
    ? <LivePizzaEditor {...props} onPairing={props.line ? undefined : props.onSave} />
    : <GenericConfigurationDialog {...props} />;
}

function GenericConfigurationDialog({ store, product, line, disabled, avoid, onClose, onSave, quantity = 1, edit = false }: {
  store: IndividualStore;
  product: IndividualProduct;
  line?: IndividualLine;
  disabled: boolean;
  avoid: string[];
  onClose: () => void;
  onSave: (line: IndividualLine) => void;
  quantity?: number;
  edit?: boolean;
  initialSelections?: MenuSelection[];
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const title = useId();
  const [selections, setSelections] = useState(() => line ? menuSelections(line) : []);
  const [notes, setNotes] = useState(line?.notes ?? "");
  const choices = selections.filter(choice => product.options.some(option => option.id === choice.optionId));
  const groups = product.groups ?? [];
  const changed = selections.length !== choices.length
    || choices.some(choice => product.options.find(option => option.id === choice.optionId)?.available === false)
    || groups.some(group => optionCount(group, choices) > group.max);
  const configured = groups.length > 0;
  const lineQuantity = line?.quantity ?? quantity;
  const preview = resolveMenuComposition(product, choices);
  const canSave = !disabled && product.available && (configured ? preview.valid : choices.every(choice => product.options.find(option => option.id === choice.optionId)?.available !== false));

  useEffect(() => {
    const panel = dialog.current;
    const trigger = document.activeElement;
    panel?.showModal();
    return () => {
      panel?.close();
      if (trigger instanceof HTMLElement) trigger.focus({ preventScroll: true });
    };
  }, []);

  function choose(id: string, quantity: number, group?: MenuOptionGroup) {
    setSelections(current => {
      const next = current.filter(choice => choice.optionId !== id && !(group?.max === 1 && quantity > 0 && group.optionIds.includes(choice.optionId)));
      return quantity ? [...next, { optionId: id, quantity }] : next;
    });
  }

  function submit() {
    if (!canSave) return;
    onSave({
      productId: product.id, quantity: lineQuantity, notes: notes.trim(),
      optionIds: configured ? [] : choices.map(choice => choice.optionId),
      ...(configured ? { selections: choices } : {})
    });
    onClose();
  }

  return <dialog ref={dialog} className={styles.dialog} aria-labelledby={title} onCancel={event => { event.preventDefault(); onClose(); }}>
    <form onSubmit={event => { event.preventDefault(); submit(); }}>
      <header className={styles.dialogHead}>
        <div><h2 id={title}>{product.name}</h2>{product.description && <p>{product.description}</p>}</div>
        <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Chiudi personalizzazione">×</button>
      </header>
      <div className={styles.dialogBody}>
        {changed && <p className={styles.warning}>Alcune opzioni sono cambiate. Controlla le nuove scelte.</p>}
        {groups.map(group => {
          const count = optionCount(group, choices);
          return <fieldset className={styles.group} key={group.id} disabled={disabled}>
            <legend>{group.name}</legend>
            {group.min > 0 && <p className={styles.groupHint}>{group.min === group.max
              ? group.min === 1 ? "Scegli una voce" : `Scegli ${group.min} unità · ${count}/${group.max}`
              : `Scegli da ${group.min} a ${group.max} · ${count}/${group.max}`}</p>}
            {group.kind === "extras" && product.extraOffer && product.extraOffer.quota > 0 && product.extraOffer.percent > 0 && <p className={styles.offer}>
              −{product.extraOffer.percent}% sui {product.extraOffer.quota} extra più costosi
            </p>}
            {group.optionIds.map(id => {
              const option = product.options.find(item => item.id === id);
              if (!option) return null;
              const quantity = choices.find(choice => choice.optionId === id)?.quantity ?? 0;
              const unavailable = option.available === false;
              const price = preview.composition.choices.find(choice => choice.optionId === id)?.subtotalCents;
              const label = <span className={styles.optionName}><strong>{option.name}</strong>
                {option.description && <small>{option.description}</small>}
                {unavailable && <small className={styles.unavailable}>Esaurito</small>}
              </span>;
              const amount = option.priceCents !== 0 && <span className={styles.optionPrice}>{option.priceCents > 0 ? "+" : ""}{menuMoney(price ?? option.priceCents)}</span>;
              return group.allowRepeat ? <div className={styles.option} key={id}>{label}{amount}
                <div className={styles.stepper}>
                  <button type="button" aria-label={`Togli ${option.name}`} disabled={quantity === 0} onClick={() => choose(id, quantity - 1, group)}>−</button>
                  <output aria-label={`Quantità ${option.name}`}>{quantity}</output>
                  <button type="button" aria-label={`Aggiungi ${option.name}`} disabled={unavailable || count >= group.max} onClick={() => choose(id, quantity + 1, group)}>+</button>
                </div>
              </div> : <label className={styles.option} key={id}><input
                type={group.max === 1 ? "radio" : "checkbox"}
                name={`${title}-${group.id}`}
                checked={quantity > 0}
                disabled={unavailable && (quantity === 0 || group.max === 1) || (group.max > 1 && quantity === 0 && count >= group.max)}
                onChange={event => choose(id, event.target.checked ? 1 : 0, group)}
              />{label}{amount}</label>;
            })}
            {group.min === 0 && group.max === 1 && count > 0 && <button type="button" className={styles.textButton} onClick={() => choose(choices.find(choice => group.optionIds.includes(choice.optionId))?.optionId ?? "", 0)}>Azzera scelta</button>}
          </fieldset>;
        })}
        {!configured && product.options.length > 0 && <fieldset className={styles.group}>
          <legend>Opzioni</legend>
          {product.options.map(option => <label className={styles.option} key={option.id}>
            <input type="checkbox" checked={choices.some(choice => choice.optionId === option.id)} onChange={event => choose(option.id, event.target.checked ? 1 : 0)} />
            <span className={styles.optionName}>{option.name}</span><span>{option.priceCents ? `+${menuMoney(option.priceCents)}` : ""}</span>
          </label>)}
        </fieldset>}
        {changed && <button type="button" className={styles.textButton} onClick={() => setSelections([])}>Azzera scelte</button>}
        {preview.composition.ingredients.length > 0 && <p className={styles.ingredients}>Ingredienti: {preview.composition.ingredients.join(", ")}</p>}
        <MenuFoodSummary food={preview.composition} avoid={avoid} showUnknown={Boolean(store.menu)} announce />
        {store.menu?.kitchenNotice && <p className={styles.ingredients}>{store.menu.kitchenNotice}</p>}
        <label className={styles.lineNotes}>Note per la cucina<input maxLength={500} value={notes} onChange={event => setNotes(event.target.value)} /></label>
      </div>
      <footer className={styles.dialogFoot}>
        <div aria-live="polite"><strong>{menuMoney(preview.unitCents * lineQuantity)}</strong>
          {lineQuantity > 1 && <small>{lineQuantity} × {menuMoney(preview.unitCents)}</small>}
          {preview.composition.extraDiscountCents > 0 && <small>Sconto extra {menuMoney(preview.composition.extraDiscountCents * lineQuantity)}</small>}
        </div>
        <button type="submit" disabled={!canSave}>{edit ? "Aggiorna scelta" : "Aggiungi"}</button>
      </footer>
    </form>
  </dialog>;
}

export function MenuLineEditor({ store, product, line, quantity, disabled = false, avoid, onSave }: {
  store: IndividualStore; product: IndividualProduct; line?: IndividualLine;
  disabled?: boolean; quantity?: number; avoid: string[]; onSave: (next: IndividualLine) => void;
}) {
  const [open, setOpen] = useState(false);
  return <>
    <button className={styles.textButton} type="button" disabled={disabled || !product.available} onClick={() => setOpen(true)}>
      {line ? `Modifica ${product.name}` : `Personalizza ${product.name}`}
    </button>
    {open && <ConfigurationDialog store={store} product={product} line={line} quantity={quantity} disabled={disabled} avoid={avoid} onClose={() => setOpen(false)} onSave={onSave} edit={Boolean(line)} />}
  </>;
}

export function MenuLineDetails({ product, line, avoid = [], showUnknown = false }: {
  product: IndividualProduct | undefined; line: IndividualLine; avoid?: string[]; showUnknown?: boolean;
}) {
  const names = lineChoiceLabels(product, line);
  const issue = lineIssue(product, line);
  const preview = product && resolveMenuComposition(product, menuSelections(line));
  return <>
    {names.length > 0 && <p className={styles.ingredients}>{names.join(", ")}</p>}
    {issue && <p className={styles.warning}>{issue}</p>}
    {preview && <MenuFoodSummary food={preview.composition} avoid={avoid} showUnknown={showUnknown} />}
  </>;
}

function MenuItem({ store, product, preferences, disabled, onAdd }: {
  store: IndividualStore; product: IndividualProduct; preferences: MenuPreferences;
  disabled: boolean; onAdd: (line: IndividualLine) => void;
}) {
  const [configuring, setConfiguring] = useState(false);
  const needsChoices = Boolean(product.groups?.length);
  const pairing = store.products.filter(item => item.available && product.pairingProductIds?.includes(item.id));
  const initialSelections = pizzaInitialSelections(product, {});
  const preview = resolveMenuComposition(product, initialSelections);
  const image = pizzaPreview(product, initialSelections, store.id);
  return <article className={`${styles.item} ${!product.available ? styles.itemUnavailable : ""}`}>
    <div className={styles.itemBody}>
      <h4 aria-label={product.name}>
        <button className={styles.itemTrigger} type="button" disabled={disabled || !product.available} onClick={() => {
          if (needsChoices) setConfiguring(true);
          else onAdd({ productId: product.id, quantity: 1, optionIds: [], notes: "" });
        }} aria-label={product.available ? `Aggiungi ${product.name}` : `${product.name} non disponibile`}>{product.name}</button>
        <strong className={styles.itemPrice}>{!product.pizza && needsChoices && product.groups?.some(group => group.min > 0) ? "Base " : ""}{menuMoney(preview.unitCents)}</strong>
      </h4>
      {product.description && <p>{product.description}</p>}
      {preview.composition.ingredients.length > 0 && <p className={styles.ingredients}>{preview.composition.ingredients.join(", ")}</p>}
      {!product.available ? <p className={styles.unavailable}>Non disponibile</p>
        : product.maxAvailable !== undefined && <p className={styles.stock}>Quantità max disponibile: {product.maxAvailable}</p>}
      {product.extraOffer && product.extraOffer.quota > 0 && product.extraOffer.percent > 0 && <p className={styles.offer}>
        −{product.extraOffer.percent}% sui {product.extraOffer.quota} extra più costosi
      </p>}
      {pairing.length > 0 && <details className={styles.pairings}><summary>Abbinamenti consigliati</summary>
        {pairing.map(item => <p key={item.id}>{item.groups?.length
          ? <a href={`#${encodeURIComponent(menuItemId(item.id))}`}>{item.name} · {menuMoney(item.priceCents)}</a>
          : <button type="button" className={styles.textButton} disabled={disabled} onClick={() =>
            onAdd({ productId: item.id, quantity: 1, optionIds: [], notes: "" })
          }>Aggiungi {item.name} · {menuMoney(item.priceCents)}</button>}
        </p>)}
      </details>}
      {!needsChoices && product.options.length > 0 && <div className={styles.itemActions}>
        <MenuLineEditor store={store} product={product} disabled={disabled} avoid={preferences.avoid} onSave={onAdd} />
      </div>}
    </div>
    {image.src && <div className={styles.productVisual}>
      <Image className={styles.photo} unoptimized src={image.src} alt="" width={160} height={160} />
      {image.overlay && <Image className={styles.photoOverlay} unoptimized src={image.overlay} alt="" width={160} height={160} />}
    </div>}
    {configuring && <ConfigurationDialog store={store} product={product} disabled={disabled} avoid={preferences.avoid}
      initialSelections={initialSelections} onClose={() => setConfiguring(false)} onSave={onAdd} />}
  </article>;
}

const menuItemId = (productId: string) => `voce-${productId}`;

export function OperationalMenu({ store, preferences, disabled = false, onAdd }: {
  store: IndividualStore; preferences: MenuPreferences; disabled?: boolean; onAdd: (line: IndividualLine) => void;
}) {
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const products = new Map(store.products.map(product => [product.id, product]));
  const sections = (store.menu?.sections ?? [{ id: "prodotti", name: "Prodotti", description: undefined, productIds: store.products.map(product => product.id) }])
    .map(section => ({ ...section, products: section.productIds.flatMap(id => {
      const product = products.get(id);
      return product ? [product] : [];
    }) })).filter(section => section.products.length);
  const firstSectionOfProduct = new Map<string, string>();
  for (const section of sections) {
    for (const product of section.products) {
      if (!firstSectionOfProduct.has(product.id)) firstSectionOfProduct.set(product.id, section.id);
    }
  }
  const active = sections.some(section => section.id === selectedSection) ? selectedSection : sections[0]?.id;
  return <div className={styles.menu}>
    {sections.length > 1 && <nav className={styles.categoryPicker} aria-label="Categorie del menu">
      <h3>Da dove vuoi iniziare?</h3>
      <div className={styles.categoryCards}>{sections.map(section => <a key={section.id} href={`#categoria-${encodeURIComponent(section.id)}`}
        aria-current={active === section.id ? "location" : undefined} onClick={() => setSelectedSection(section.id)}>
        <span>{section.name}<small>{section.products.length} {section.products.length === 1 ? "proposta" : "proposte"}</small></span><span aria-hidden="true">→</span>
      </a>)}</div>
    </nav>}
    {sections.length > 1 && <nav className={styles.categoryBar} aria-label="Scorri le categorie">
      {sections.map(section => <a key={section.id} href={`#categoria-${encodeURIComponent(section.id)}`}
        aria-current={active === section.id ? "location" : undefined} onClick={() => setSelectedSection(section.id)}>{section.name}</a>)}
    </nav>}
    {!sections.length && <p>Il menu non contiene ancora prodotti.</p>}
    {sections.map(section => <section className={styles.category} key={section.id} id={`categoria-${section.id}`}>
      {store.menu && <><h3>{section.name}</h3>{section.description && <p>{section.description}</p>}</>}
      <div className={styles.items}>{section.products.map(product => <div key={product.id} id={firstSectionOfProduct.get(product.id) === section.id ? menuItemId(product.id) : undefined}>
        <MenuItem store={store} product={product} preferences={preferences} disabled={disabled || !store.acceptingOrders} onAdd={onAdd} />
      </div>)}</div>
    </section>)}
  </div>;
}
