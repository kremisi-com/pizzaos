# Review correzione individuale

## Esito implementazione

- Recupero esplicito del checkout incerto con chiave e richiesta originali, legate all'account. Un nuovo checkout rimane bloccato fino a riscontro autorevole. Nessun dato carta o `clientSecret` viene conservato.
- Recuperare un ordine non cancella un draft modificato successivamente. Senza storage il tentativo e il draft restano in memoria; il messaggio invita a mantenere aperta la pagina.
- Gli eventi ricaricano il catalogo corrente; risposte superate vengono ignorate. Solo modifiche ai termini del catalogo invalidano il preventivo e un preventivo in volo non ripristina un riepilogo già invalidato.
- Review della skill React completata: schema storage versionato e dati minimi, effetti separati con cleanup e dipendenze appropriate, ref per la protezione sincrona dei tentativi. Nessuna modifica del port o del servizio.

## Evidenze

- Test indipendenti prima dell'implementazione: RED per recupero contanti, retry originale con draft modificato e refresh catalogo.
- Dopo implementazione: `pnpm exec vitest run apps/client/src/test/individual-recovery.test.tsx apps/client/src/test/individual-draft.test.ts` PASS, 12 test.
- `pnpm --filter @pizzaos/client lint` PASS.
- `pnpm --filter @pizzaos/client test` PASS, 25 file e 91 test.
- Il primo typecheck rilevava soltanto l'import test diretto di Testing Library; l'autore dei test lo ha sostituito con l'export pubblico `domWaitFor` di `@pizzaos/testing`, senza cambiare le asserzioni. La verifica conclusiva di typecheck/build/E2E è coordinata dall'agente principale per evitare interferenze sulla directory `.next`.

## Limite esplicito

I record della demo precedente che contengono soltanto `{ key }` non permettono di ricostruire la richiesta originale dal contratto disponibile. Rimangono bloccanti e mostrano l'indicazione di verificare con il ristorante: il recupero automatico di tali record non è risolto e non viene sostituito con una rotazione silenziosa della chiave.
