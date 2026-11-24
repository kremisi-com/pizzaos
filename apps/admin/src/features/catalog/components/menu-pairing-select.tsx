import type { IndividualProduct } from "@pizzaos/domain";
import { Button } from "@pizzaos/ui";
import { useId, useRef, useState } from "react";
import styles from "./operational-catalog.module.css";

export function MenuPairingSelect({ productId, products, selectedIds = [], onChange }: {
  productId: string;
  products: readonly IndividualProduct[];
  selectedIds?: readonly string[];
  onChange: (ids: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const optionsId = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const available = products.filter(product => product.id !== productId);
  const names = new Map(available.map(product => [product.id, product.name || "Senza nome"]));
  const selected = [...new Set(selectedIds)];
  const matching = available.filter(product => (product.name || "Senza nome").toLocaleLowerCase("it-IT").includes(search.trim().toLocaleLowerCase("it-IT")));

  function toggle(id: string, checked: boolean) {
    const remaining = selected.filter(value => value !== id);
    onChange(checked ? [...remaining, id] : remaining);
  }

  function close() {
    setOpen(false);
    trigger.current?.focus();
  }

  return <fieldset className={styles.inner}>
    <legend>Abbinamenti consigliati</legend>
    <div className={styles.ingredientSelect} onKeyDown={event => {
      if (event.key === "Escape" && open) { event.preventDefault(); event.stopPropagation(); close(); }
    }}>
      <button type="button" ref={trigger} className={styles.selectTrigger} aria-label="Seleziona abbinamenti consigliati"
        aria-expanded={open} aria-controls={open ? optionsId : undefined} onClick={() => setOpen(value => !value)}>
        <span>{selected.length ? selected.map(id => names.get(id) ?? "Prodotto non disponibile").join(", ") : "Scegli i prodotti da abbinare"}</span><span aria-hidden="true">⌄</span>
      </button>
      {selected.length > 0 && <div className={styles.chips}>{selected.map(id => <button type="button" key={id}
        aria-label={`Rimuovi ${names.get(id) ?? "Prodotto non disponibile"} dagli abbinamenti`} onClick={() => toggle(id, false)}>
        {names.get(id) ?? "Prodotto non disponibile"} ×
      </button>)}</div>}
      {open && <div id={optionsId} className={styles.ingredientOptions}>
        <label>Filtra abbinamenti<input type="search" value={search} placeholder="Cerca un prodotto…" onChange={event => setSearch(event.target.value)} /></label>
        {matching.map(product => <label key={product.id} className={styles.check}>
          <input type="checkbox" checked={selected.includes(product.id)} onChange={event => toggle(product.id, event.target.checked)} />{product.name || "Senza nome"}
        </label>)}
        {!available.length ? <p>Aggiungi altri prodotti al menu per proporre abbinamenti.</p> : !matching.length && <p>Nessun prodotto corrisponde alla ricerca.</p>}
        <Button type="button" variant="ghost" onClick={close}>Chiudi abbinamenti</Button>
      </div>}
    </div>
  </fieldset>;
}
