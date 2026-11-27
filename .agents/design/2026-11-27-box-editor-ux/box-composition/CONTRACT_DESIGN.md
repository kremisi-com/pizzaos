# Contratto proposto — composizione Box

Nessun nuovo contratto di dominio o endpoint. Usare esclusivamente i tipi pubblici di `@pizzaos/domain` e il contratto corrente di MenuProductForm/MenuAdminApi.

Stub documentale dell'interfaccia fra editor e chiamante, senza creare file applicativi in questa fase:

```ts
import type { IndividualIngredient, IndividualProduct } from "@pizzaos/domain";

/** Riceve la Box locale e il Magazzino della sede; richiede variazioni della bozza. */
interface BoxCompositionProps {
  product: IndividualProduct;
  ingredients: readonly IndividualIngredient[];
  /** Emette solo i campi modificati; il chiamante conserva gli altri dati. */
  onChange(change: Partial<IndividualProduct>): void;
}
```

Precondizione: prodotto classificato Box, Magazzino della sede attiva. Una configurazione incompleta può essere aperta per correggerla. Postcondizione: una modifica del nome conserva prezzi e composizione; una modifica al gruppo conserva gli altri gruppi. Visualizzazione e apertura non emettono cambiamenti.

Invarianti: identità persistenti, riferimenti gruppi/opzioni coerenti, nessuna trasformazione dei kind precedenti, nessuna dipendenza dall'app client o dal servizio concreto. min/max/allowRepeat mantengono il significato corrente.

Errori di salvataggio e revisione rimangono responsabilità del flusso MenuAdminApi esistente; il nuovo editor non li nasconde né pubblica autonomamente. Esempio: errore sul salvataggio di min=max=3 → l'operatore conserva localmente il valore 3 e può usare il recupero corrente.
