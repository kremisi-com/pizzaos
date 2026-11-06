import type { StoreAddressApi, StoreAddressCandidate } from "@pizzaos/domain";
import { useId, useRef, useState } from "react";
import styles from "./individual-operations.module.css";

export function StoreAddressField({ storeId, address, savedAddress, needsConfirmation, confirmed, onSearch, onEdit, onConfirm }: {
  storeId: string;
  address: string;
  savedAddress?: string;
  needsConfirmation: boolean;
  confirmed: boolean;
  onSearch: StoreAddressApi["searchStoreAddresses"];
  onEdit: (address: string) => void;
  onConfirm: (candidate: StoreAddressCandidate) => void;
}) {
  const hintId = useId();
  const request = useRef(0);
  const [matches, setMatches] = useState<StoreAddressCandidate[] | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  const query = address.trim();
  const canSearch = Boolean(storeId.trim()) && query.length >= 5 && !pending;

  function edit(value: string) {
    request.current += 1;
    setMatches(null);
    setPending(false);
    setError(false);
    onEdit(value);
  }

  async function search() {
    if (!canSearch) return;
    const version = ++request.current;
    setMatches(null);
    setError(false);
    setPending(true);
    onEdit(address);
    try {
      const results = await onSearch(storeId, query);
      if (version === request.current) setMatches(results);
    } catch {
      if (version === request.current) setError(true);
    } finally {
      if (version === request.current) setPending(false);
    }
  }

  return <div className={styles.storeAddress}>
    <label>Indirizzo della sede
      <input value={address} maxLength={300} aria-describedby={hintId} placeholder="Via, civico e città"
        onChange={event => edit(event.target.value)}
        onKeyDown={event => { if (event.key === "Enter" && !event.nativeEvent.isComposing) { event.preventDefault(); void search(); } }} />
    </label>
    <p id={hintId}>{!storeId.trim() ? "Inserisci prima l’identificativo della sede." :
      needsConfirmation ? "Cerca e conferma l’indirizzo prima di salvare." :
      "Inserisci via, civico e città per cercare una nuova posizione."}</p>
    <div className={styles.addressActions}>
      <button className={styles.secondary} type="button" disabled={!canSearch} onClick={() => void search()}>Cerca indirizzo</button>
      {savedAddress !== undefined && address !== savedAddress && <button className={styles.secondary} type="button" onClick={() => edit(savedAddress)}>
        Ripristina indirizzo salvato
      </button>}
    </div>
    {pending && <p role="status">Ricerca in corso…</p>}
    {error && <p role="alert">Ricerca indirizzi non disponibile. Riprova tra poco.</p>}
    {matches?.length === 0 && <p role="status">Nessun indirizzo trovato. Controlla via, civico e città.</p>}
    {!!matches?.length && <fieldset className={styles.addressResults}>
      <legend>Seleziona l’indirizzo corretto</legend>
      <ul>{matches.map(candidate => <li key={candidate.confirmation}>
        <button type="button" className={styles.secondary} onClick={() => {
          setMatches(null);
          onConfirm(candidate);
        }}>Conferma {candidate.address}</button>
      </li>)}</ul>
    </fieldset>}
    {confirmed && <p role="status">Indirizzo confermato. Salva per applicarlo alla sede.</p>}
  </div>;
}
