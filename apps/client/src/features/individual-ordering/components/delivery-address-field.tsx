"use client";

import { DELIVERY_ADDRESS_QUERY_MAX_LENGTH, DELIVERY_ADDRESS_QUERY_MIN_LENGTH } from "@pizzaos/domain";
import type { DeliveryAddressSuggestion, IndividualApi, IndividualDeliveryAddress } from "@pizzaos/domain";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import styles from "./delivery-address-field.module.css";

type SearchResult = { query: string } & (
  | { status: "ready"; suggestions: DeliveryAddressSuggestion[] }
  | { status: "error" }
);

/** Older drafts can contain a typed address with coordinates still at their default. */
export function hasDeliveryPoint(address: IndividualDeliveryAddress | undefined): boolean {
  return Boolean(address?.text.trim() && Math.abs(address.latitude) <= 90 && Math.abs(address.longitude) <= 180
    && (address.latitude !== 0 || address.longitude !== 0));
}

export function DeliveryAddressField({ storeId, address, search, onChange, disabled }: {
  storeId: string;
  address: IndividualDeliveryAddress | undefined;
  search: IndividualApi["searchDeliveryAddresses"];
  onChange: (address: IndividualDeliveryAddress | undefined) => void;
  disabled: boolean;
}) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const [street, setStreet] = useState("");
  const [active, setActive] = useState(-1);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [retry, setRetry] = useState(0);
  const value = address?.text ?? text;
  const query = value.trim();
  const canSearch = !disabled && !hasDeliveryPoint(address) && query.length >= DELIVERY_ADDRESS_QUERY_MIN_LENGTH
    && query.length <= DELIVERY_ADDRESS_QUERY_MAX_LENGTH && query !== street;
  const currentResult = canSearch && result?.query === query ? result : null;
  const suggestions = open && currentResult?.status === "ready" ? currentResult.suggestions : [];
  const listId = `${id}-suggestions`;
  const activeOption = suggestions[active];

  useEffect(() => {
    if (!canSearch || !open || !search) return;
    const request = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const suggestions = await search(storeId, query, request.signal);
        if (!request.signal.aborted) setResult({ query, status: "ready", suggestions });
      } catch {
        if (!request.signal.aborted) setResult({ query, status: "error" });
      }
    }, 300);
    return () => { clearTimeout(timer); request.abort(); };
  }, [canSearch, open, query, retry, search, storeId]);

  function close() {
    setOpen(false);
    setActive(-1);
  }

  function choose(suggestion: DeliveryAddressSuggestion) {
    close();
    setResult(null);
    if (suggestion.kind === "address") {
      setText("");
      const { text, latitude, longitude } = suggestion;
      onChange({ text, latitude, longitude });
      return;
    }
    setText(suggestion.text);
    setStreet(suggestion.text);
    if (address) onChange(undefined);
    const input = inputRef.current;
    input?.focus();
    requestAnimationFrame(() => {
      if (input?.value !== suggestion.text) return;
      const comma = suggestion.text.indexOf(",");
      const position = comma === -1 ? suggestion.text.length : comma;
      input.setSelectionRange(position, position);
    });
  }

  function handleKey(event: KeyboardEvent<HTMLInputElement>) {
    if (event.nativeEvent.isComposing) return;
    if (event.key === "Escape" && open) {
      event.preventDefault();
      close();
    } else if (event.key === "Enter" && activeOption) {
      event.preventDefault();
      choose(activeOption);
    } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      if (!open && canSearch) {
        event.preventDefault();
        setOpen(true);
      } else if (suggestions.length) {
        event.preventDefault();
        const last = suggestions.length - 1;
        const next = event.key === "ArrowDown" ? (active >= last ? 0 : active + 1)
          : (active <= 0 ? last : active - 1);
        setActive(next);
        document.getElementById(`${listId}-${next}`)?.scrollIntoView({ block: "nearest" });
      }
    }
  }

  const unavailable = canSearch && (!search || currentResult?.status === "error");
  return <div className={styles.field}>
    <label htmlFor={id}>Indirizzo completo
      <input id={id} ref={inputRef} value={value} role="combobox" aria-required="true"
        aria-autocomplete="list" aria-expanded={suggestions.length > 0} aria-controls={suggestions.length ? listId : undefined}
        aria-activedescendant={activeOption ? `${listId}-${active}` : undefined} aria-describedby={`${id}-status`}
        autoComplete="off" placeholder="Via, numero civico e comune" maxLength={DELIVERY_ADDRESS_QUERY_MAX_LENGTH} disabled={disabled}
        onFocus={() => setOpen(true)} onBlur={close} onKeyDown={handleKey}
        onChange={event => {
          setText(event.target.value);
          setStreet("");
          setOpen(true);
          setActive(-1);
          if (event.target.value.trim() !== query) setResult(null);
          if (address) onChange(undefined);
        }} />
    </label>
    {suggestions.length > 0 && <ul className={styles.suggestions} id={listId} role="listbox" aria-label="Indirizzi suggeriti">
      {suggestions.map((suggestion, index) => <li key={suggestion.text} id={`${listId}-${index}`}
        role="option" aria-selected={index === active} onPointerDown={event => event.preventDefault()} onClick={() => choose(suggestion)}>
        {suggestion.text}
        {suggestion.kind === "street" && <small>Aggiungi il civico</small>}
      </li>)}
    </ul>}
    <div id={`${id}-status`} className={styles.status} role="status">
      {street && query === street && "Aggiungi il numero civico e scegli l’indirizzo suggerito."}
      {unavailable && "Ricerca indirizzi non disponibile. Puoi riprovare o scegliere il ritiro."}
      {!open && canSearch && !unavailable && "Scegli l’indirizzo suggerito per continuare."}
      {open && canSearch && search && !currentResult && "Cerco gli indirizzi…"}
      {open && currentResult?.status === "ready" && (suggestions.length
        ? `Suggerimenti disponibili: ${suggestions.length}.`
        : "Nessun indirizzo trovato. Controlla via, numero civico e comune.")}
    </div>
    {unavailable && search && <button type="button" onClick={() => {
      setResult(null);
      setRetry(count => count + 1);
      inputRef.current?.focus();
      setOpen(true);
    }}>Riprova ricerca</button>}
    {(suggestions.length > 0 || hasDeliveryPoint(address)) && <p className={styles.credit}>
      Ricerca con <a href="https://www.geoapify.com/" target="_blank" rel="noreferrer">Geoapify</a>
      {" · © "}<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>
    </p>}
  </div>;
}
