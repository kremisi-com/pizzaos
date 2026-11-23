"use client";

import { createDefaultWeeklyOrderSchedule } from "@pizzaos/domain";
import type { IndividualProduct, IndividualStore, StoreAddressApi, StoreAddressCandidate } from "@pizzaos/domain";
import { useState } from "react";
import { MenuFoodFields, MenuRecipeFields } from "../../catalog";
import { StoreAddressField } from "./store-address-field";
import { WeeklyOrderCalendar } from "./weekly-order-calendar";
import styles from "./individual-operations.module.css";

export type StoreConfigurationSection = "inventory" | "profile";

export function StoreConfiguration({ store, isNew, section, busy, orderingDomain, canPublish, onSearchAddress, onSave }: {
  store: IndividualStore;
  isNew: boolean;
  section: StoreConfigurationSection;
  busy: boolean;
  orderingDomain?: string;
  canPublish?: boolean;
  onSearchAddress: StoreAddressApi["searchStoreAddresses"];
  onSave: (draft: IndividualStore, original: IndividualStore, addressConfirmation?: string) => Promise<void>;
}) {
  const [original] = useState(store);
  const [draft, setDraft] = useState(store);
  const [address, setAddress] = useState(store.address ?? "");
  const [confirmedAddress, setConfirmedAddress] = useState<StoreAddressCandidate | null>(null);
  const needsConfirmation = (isNew || address.trim() !== (original.address ?? "")) && !confirmedAddress;
  const update = <K extends keyof IndividualStore>(key: K, value: IndividualStore[K]) => setDraft(current => ({ ...current, [key]: value }));
  function productChange(index: number, change: Partial<IndividualProduct>) { update("products", draft.products.map((product, i) => i === index ? { ...product, ...change } : product)); }
  return <form className={`${styles.page} ${styles.configuration}`} onSubmit={event => {
    event.preventDefault();
    if (!busy && !needsConfirmation) void onSave(draft, original, confirmedAddress?.confirmation);
  }}>
    <h2>{isNew ? "Crea una sede" : section === "inventory" ? "Magazzino ingredienti" : "Configurazione della sede"}</h2><p>Le modifiche vengono applicate quando salvi. Le risorse già impegnate dagli ordini devono restare disponibili.</p>
    {(isNew || section === "profile") && <fieldset disabled={busy}><legend>Identità e contatti</legend><div className={styles.formGrid}>
      <label>Identificativo sede<input required value={draft.id} disabled={!isNew} pattern="[a-zA-Z0-9_-]+" onChange={event => {
        update("id", event.target.value);
        setConfirmedAddress(null);
      }} /></label>
      <label>Nome sede<input required maxLength={150} value={draft.name} onChange={event => update("name", event.target.value)} /></label>
      {orderingDomain && (original.orderingSubdomain ? <div>
        <p>Sito ordini</p>
        <a href={`https://${original.orderingSubdomain}.${orderingDomain}`}>{original.orderingSubdomain}.{orderingDomain}</a>
      </div> : canPublish && <label>Sottodominio ordini
        <input value={draft.orderingSubdomain ?? ""} maxLength={63} placeholder="lapizzaspeciale"
          pattern={String.raw`[a-z0-9](?:[a-z0-9\-]{0,61}[a-z0-9])?`}
          autoCapitalize="none" spellCheck={false} onChange={event => update("orderingSubdomain", event.target.value.toLowerCase() || undefined)} />
        <span>{draft.orderingSubdomain && `${draft.orderingSubdomain}.`}{orderingDomain}. L’indirizzo resta fisso dopo il salvataggio.</span>
      </label>)}
      <label>Fuso orario della sede<input required maxLength={100} value={draft.timeZone ?? "Europe/Rome"} placeholder="Europe/Rome" onChange={event => update("timeZone", event.target.value)} /><span>Usato per il calendario degli ordini e le statistiche.</span></label>
      <label>Email del ristorante<input type="email" value={draft.contactEmail ?? ""} onChange={event => update("contactEmail", event.target.value)} /></label>
      <label>WhatsApp del ristorante<input type="tel" placeholder="+39…" value={draft.contactPhone ?? ""} onChange={event => update("contactPhone", event.target.value)} /></label>
    </div>
    <StoreAddressField key={draft.id} storeId={draft.id} address={address} savedAddress={original.address}
      needsConfirmation={needsConfirmation} confirmed={Boolean(confirmedAddress)} onSearch={onSearchAddress}
      onEdit={value => { setAddress(value); setConfirmedAddress(null); }}
      onConfirm={candidate => { setAddress(candidate.address); setConfirmedAddress(candidate); }} />
    <label className={styles.check}><input type="checkbox" checked={draft.acceptingOrders} onChange={event => update("acceptingOrders", event.target.checked)} />Accetta nuovi ordini</label></fieldset>}

    {(isNew || section === "inventory") && <fieldset disabled={busy}><legend>Magazzino ingredienti</legend><p>Le quantità sono espresse nelle stesse unità delle ricette. La disponibilità per nuovi ordini tiene conto delle riserve.</p>
      {draft.ingredients.map((ingredient, index) => <div className={styles.productEditor} key={ingredient.id}>
        <div className={styles.repeatRow}>
          <label>Nome ingrediente {index + 1}<input required value={ingredient.name} onChange={event => update("ingredients", draft.ingredients.map((item, i) => i === index ? { ...item, name: event.target.value } : item))} /></label>
          <label>Scorta {ingredient.name || index + 1}<input required type="number" min="0" step="1" value={ingredient.stock} onChange={event => update("ingredients", draft.ingredients.map((item, i) => i === index ? { ...item, stock: Number(event.target.value) } : item))} /></label>
          <button className={styles.secondary} type="button" onClick={() => update("ingredients", draft.ingredients.filter((_, i) => i !== index))}>Rimuovi ingrediente</button>
        </div>
        <MenuFoodFields food={ingredient.food} onChange={food => update("ingredients", draft.ingredients.map(item =>
          item.id === ingredient.id ? { ...item, food } : item))} />
      </div>)}<button className={styles.secondary} type="button" onClick={() => update("ingredients", [...draft.ingredients, { id: crypto.randomUUID(), name: "", stock: 0 }])}>Aggiungi ingrediente</button>
    </fieldset>}

    {isNew && <fieldset disabled={busy}><legend>Menu e personalizzazioni</legend>
      {draft.products.map((product, index) => <article className={styles.productEditor} key={product.id}><h3>{product.name || `Nuovo prodotto ${index + 1}`}</h3><div className={styles.formGrid}>
        <label>Nome prodotto {index + 1}<input required value={product.name} onChange={event => productChange(index, { name: event.target.value })} /></label>
        <label>Prezzo prodotto {index + 1} in centesimi<input required type="number" min="0" step="1" value={product.priceCents} onChange={event => productChange(index, { priceCents: Number(event.target.value) })} /></label>
      </div><label>Descrizione prodotto {index + 1}<textarea maxLength={2000} value={product.description} onChange={event => productChange(index, { description: event.target.value })} /></label>
        <label>Allergeni prodotto {index + 1}, separati da virgola<input value={product.allergens.join(", ")} onChange={event => productChange(index, { allergens: event.target.value.split(",").map(value => value.trim()) })} onBlur={() => productChange(index, { allergens: product.allergens.filter(Boolean) })} /></label>
        <label className={styles.check}><input type="checkbox" checked={product.available} onChange={event => productChange(index, { available: event.target.checked })} />Prodotto {index + 1} disponibile</label>
        <MenuRecipeFields label={`Ricetta ${product.name || index + 1}`} ingredients={draft.ingredients} recipe={product.ingredients} onChange={ingredients => productChange(index, { ingredients })} />
        {product.options.map((option, optionIndex) => <fieldset className={styles.optionEditor} key={option.id}><legend>Personalizzazione {optionIndex + 1}</legend><div className={styles.formGrid}>
          <label>Nome opzione {index + 1}.{optionIndex + 1}<input required value={option.name} onChange={event => productChange(index, { options: product.options.map((item, i) => i === optionIndex ? { ...item, name: event.target.value } : item) })} /></label>
          <label>Supplemento opzione {index + 1}.{optionIndex + 1} in centesimi<input type="number" required min="0" step="1" value={option.priceCents} onChange={event => productChange(index, { options: product.options.map((item, i) => i === optionIndex ? { ...item, priceCents: Number(event.target.value) } : item) })} /></label>
        </div><MenuRecipeFields label={`Ingredienti aggiuntivi ${option.name || optionIndex + 1}`} ingredients={draft.ingredients} recipe={option.ingredients} onChange={ingredients => productChange(index, { options: product.options.map((item, i) => i === optionIndex ? { ...item, ingredients } : item) })} />
          <button className={styles.secondary} type="button" onClick={() => productChange(index, { options: product.options.filter((_, i) => i !== optionIndex) })}>Rimuovi opzione</button>
        </fieldset>)}
        <div className={styles.actions}><button className={styles.secondary} type="button" onClick={() => productChange(index, { options: [...product.options, { id: crypto.randomUUID(), name: "", priceCents: 0, ingredients: {} }] })}>Aggiungi personalizzazione</button><button className={styles.danger} type="button" onClick={() => update("products", draft.products.filter((_, i) => i !== index))}>Rimuovi prodotto</button></div>
      </article>)}
      <button className={styles.secondary} type="button" onClick={() => update("products", [...draft.products, { id: crypto.randomUUID(), name: "", description: "", priceCents: 0, available: true, allergens: [], ingredients: {}, options: [] }])}>Aggiungi prodotto</button>
    </fieldset>}

    {(isNew || section === "profile") && <fieldset disabled={busy}><legend>Fasce orarie e capacità</legend>
      <WeeklyOrderCalendar schedule={draft.orderSchedule ?? createDefaultWeeklyOrderSchedule()}
        protectedDates={store.protectedOrderDates ?? []} timeZone={draft.timeZone ?? "Europe/Rome"}
        onChange={schedule => update("orderSchedule", schedule)} />
    </fieldset>}

    {(isNew || section === "profile") && <fieldset disabled={busy}><legend>Zone di consegna</legend><p>Il raggio è calcolato dalla sede. Il minimo riguarda i prodotti, prima del costo di consegna.</p>
      {draft.deliveryBands.map((band, index) => <div className={styles.repeatRow} key={index}>
        <label>Raggio massimo fascia {index + 1} in km<input required type="number" min="0.1" step="0.1" value={band.upToKm} onChange={event => update("deliveryBands", draft.deliveryBands.map((item, i) => i === index ? { ...item, upToKm: Number(event.target.value) } : item))} /></label>
        <label>Costo consegna fascia {index + 1} in centesimi<input required type="number" min="0" step="1" value={band.feeCents} onChange={event => update("deliveryBands", draft.deliveryBands.map((item, i) => i === index ? { ...item, feeCents: Number(event.target.value) } : item))} /></label>
        <label>Ordine minimo fascia {index + 1} in centesimi<input required type="number" min="0" step="1" value={band.minimumCents} onChange={event => update("deliveryBands", draft.deliveryBands.map((item, i) => i === index ? { ...item, minimumCents: Number(event.target.value) } : item))} /></label>
        <button className={styles.secondary} type="button" onClick={() => update("deliveryBands", draft.deliveryBands.filter((_, i) => i !== index))}>Rimuovi zona</button>
      </div>)}<button className={styles.secondary} type="button" onClick={() => update("deliveryBands", [...draft.deliveryBands, { upToKm: (draft.deliveryBands.at(-1)?.upToKm ?? 0) + 1, feeCents: 0, minimumCents: 0 }])}>Aggiungi zona di consegna</button>
    </fieldset>}
    <button type="submit" disabled={busy || needsConfirmation}>{busy ? "Salvataggio…" : isNew ? "Crea sede" : "Salva configurazione"}</button>
  </form>;
}
