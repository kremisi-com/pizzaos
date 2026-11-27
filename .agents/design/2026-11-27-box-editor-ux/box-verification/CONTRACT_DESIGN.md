# Contratto proposto — riepilogo e flusso completo

Nessuna nuova API e nessuna importazione dall'app client. Contratto di sola lettura fra scheda e riepilogo:

```ts
import type { IndividualIngredient, IndividualProduct } from "@pizzaos/domain";

/** Descrive la configurazione locale; non calcola un preventivo cliente. */
interface BoxSummaryProps {
  product: IndividualProduct;
  ingredients: readonly IndividualIngredient[];
}
```

Precondizione: riceve la bozza locale anche incompleta. Postcondizione: riflette ogni aggiornamento di prezzo, contenuto e gruppi; non emette mutazioni, non salva, non pubblica e non effettua richieste.

Invarianti: prezzo espresso in euro a partire dai centesimi; supplementi indicati come variazioni per unità; nessun abbinamento incluso nel totale; dati irrisolti espliciti. Il contratto commerciale resta quello corrente di MenuAdminApi e del preventivo del servizio.

Esempio: base 1650, opzione 100 → prezzo base 16,50 € e supplemento +1,00 € per unità di quell'opzione; non «Totale 17,50 €» in assenza della scelta cliente. Errori e conflitti di salvataggio restano visibili attraverso il contenitore esistente.
