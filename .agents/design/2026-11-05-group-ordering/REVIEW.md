# Verifica ordine di gruppo — 2026-11-05

Incremento D61-D63 completato localmente. Gate tecnico del gruppo verde; la formalizzazione del gate e l'avvio dell'incremento successivo restano al coordinatore. Nessun lavoro coupon/fedeltà/email avviato.

## Risultato

`/ordina` offre il percorso `/ordina/gruppo`: organizzatore autenticato, scadenza scelta, link tra dispositivi distinti e ingresso invitati con nome senza account. Cookie personali HttpOnly, SameSite=Lax, Secure in HTTPS; nessuna capability personale nei DTO o nello storage JavaScript. Il roster minimizzato espone nomi e scelte, senza contatti cliente, indirizzo, dati provider o ordine completo.

Il servizio possiede persistenza, revisioni e chiusura automatica, sullo stesso repository transazionale PostgreSQL del checkout. La raccolta non prenota ingredienti o slot. Gli invitati modificano solo le proprie righe; l'organizzatore può eliminare articoli/partecipanti e correggere la raccolta chiusa senza riaprire le scritture invitati. Quantità, opzioni, input extra e tipi ostili sono validati prima della delega HTTP, senza coercizione o rimozione silenziosa.

Preventivo e invio usano `OrderingService` canonico: un pagante, indirizzo, slot, ordine e insieme di riserve. Le note delle righe conservano `Per <nome>` e le note personali; il ristorante le vede nell'UI già esistente. La richiesta congelata e la chiave canonica privata casuale persistita permettono retry, recupero e riavvio senza duplicare ordini. Dopo invio la raccolta resta immutabile; l'organizzatore raggiunge `/ordina` per pagamento esistente, verifica esito, gestione ordine e ricreazione dopo pagamento fallito, anche in contanti.

## SDD e indipendenza

Prima dell'implementazione sono stati scritti design, TASKS, requisiti osservabili, contratto pubblico e design interno separato per i due task. Gli stub di firme sono nei relativi `public.stub.ts`; il port runtime è `GroupOrderingApi` in `@pizzaos/domain`.

L'agente test è stato avviato con `fork_turns=none`, ha ricevuto soltanto REQUIREMENTS/CONTRACT e i tipi/factory pubblici necessari. Non ha consultato implementazioni o design interni. L'implementazione backend è stata affidata a un agente distinto; il lead ha implementato UI/composizione. Il test agent ha scritto solo i cinque file test indicati sotto.

- RED iniziale: `pnpm exec vitest run services/checkout-api/src/group/group-service.test.ts apps/client/src/test/persistent-group.test.tsx` → exit 1, due suite fallite per moduli pubblici ancora assenti.
- I test HTTP indipendenti hanno riprodotto l'inoltro di tipi/campi ostili al port iniettato. Corretto con validazione rigorosa prima della delega; tutti i 27 test HTTP passano.
- RED anticollisione: un ordine individuale con chiave scelta dal cliente `group:<id pubblico>` faceva apparire la raccolta già inviata. Il test osservava `submitted` invece di `open`. Corretto con chiave canonica privata casuale persistita, esclusa da ogni DTO; il test pubblico passa, insieme a recovery concorrente e riavvio.
- La prova browser ha raggiunto il checkout ma rilevato una selezione ambigua tramite label contenente le opzioni. Aggiunte etichette ARIA esplicite ai select; il medesimo scenario completo passa.

## Evidenze di verifica

| Verifica | Risultato |
|---|---|
| Ultima suite mirata con PostgreSQL reale: `pnpm exec vitest run services/checkout-api/src/group apps/client/src/test/persistent-group.test.tsx` | **67/67**, quattro file, nessuno skip: servizio 28, HTTP 27, PostgreSQL 3, UI/adapter 9 |
| Suite completa servizio durante integrazione: `pnpm --filter @pizzaos/checkout-api test` | 205 passati, 8 PostgreSQL/Auth saltati senza env; eseguita prima dell'aggiunta della suite PostgreSQL gruppo. I cambiamenti successivi sono coperti dall'ultima suite mirata sopra. |
| Suite completa client durante integrazione: `pnpm --filter @pizzaos/client test` | 99 passati in 26 file; successivamente aggiunto un nono test UI (dirty draft durante polling), passato nell'ultima suite mirata. |
| `pnpm --filter @pizzaos/domain test` | 19 passati |
| Servizio typecheck, lint e build; dominio typecheck | PASS; typecheck/lint servizio ripetuti dopo la chiave privata |
| Client lint, typecheck e build con `PIZZAOS_BUILD_DIRECTORY=.next-group-build` | PASS; build include `/ordina/gruppo` e `/ordina/gruppo/[id]`; typecheck passa anche dopo pulizia dei riferimenti generati |
| `pnpm architecture:check` | PASS, tre test del checker |

PostgreSQL: container locale già dedicato `pizzaos-individual-sdd-20261105`, porta 55435, database obbligatoriamente `pizzaos_individual_test`. I tre nuovi test usano pool indipendenti e riconnessione: persistenza delle capability e righe, isolamento, conflitto concorrente di revisione, un ordine/un intento/un insieme di riserve attraverso due istanze e recupero dopo nuova connessione, scadenza worker persistente senza ordine automatico. Il container è stato riportato allo stato fermo dopo la verifica. Nessun database applicativo o dato reale utilizzato.

Playwright: `playwright.group-ordering.config.ts`, porte servizio/client/admin 3504/3501/3502, directory Next isolata `.next-group-e2e`, risultati `test-results/group-ordering`.

- Prima esecuzione completa: baseline individuale **PASS**, scadenza gruppo e tentativo ostile dopo chiusura **PASS**; scenario gruppo fermato sulla label pagamento, poi corretto.
- Dopo correzione e chiave privata: `pnpm exec playwright test --config playwright.group-ordering.config.ts --grep 'Alice, Marco'` → **1/1 PASS**, scenario 20,5 s, esecuzione 38,2 s.
- Complessivamente verificati i tre scenari: individuale completo fino a completamento admin; quattro contesti distinti Alice/Marco/Giulia/operatore con ingresso, refresh, cookie HttpOnly, isolamento contributi, payload cross-person respinto, aggiornamenti condivisi, rimozione partecipante, chiusura, preventivo e unico ordine contanti con righe Alice/Marco in admin; chiusura automatica e guest write `409 group_closed`.

Screenshot finali aperti e controllati visivamente: [host dopo invio](../../../test-results/group-ordering/persistent-group-Alice-Mar-c0fdf-s-one-attributed-cash-order/group-host-submitted.png), [ordine unico admin](../../../test-results/group-ordering/persistent-group-Alice-Mar-c0fdf-s-one-attributed-cash-order/group-admin-order.png). L'admin mostra un solo ordine da 16 euro con `Per Alice` e `Per Marco`, nessuna riga Giulia rimossa.

## File e confini

- Contratti: `packages/domain/src/group-ordering.ts`, export pubblico e README dominio.
- Servizio: `services/checkout-api/src/group/{group-service.ts,group-http.ts,README.md}`, tre suite test gruppo; wiring minimo `server.ts`, README servizio e `tests/fixtures/individual-service.ts`.
- Client: route `app/ordina/gruppo`, composizione `group-ordering-shell.tsx`, adapter `group-ordering-api.ts`, `PersistentGroupScreen` e CSS Module; link dalla schermata individuale; `individual-ordering/index.ts` rende pubblica la capability Stripe Elements riusata. Nessuna dipendenza da implementazioni private di altre app o dal servizio.
- Test: `group-service.test.ts`, `group-http.test.ts`, `group-postgres.test.ts`, `persistent-group.test.tsx`, `tests/e2e/persistent-group.spec.ts`; configurazione `playwright.group-ordering.config.ts`.
- Documentazione: questa cartella SDD, flow corrente `flows/group-ordering.md`, README client/composizione/feature/servizio/dominio.

Nessuna modifica al motore checkout canonico, a `pilot-extensions.ts`, al registro D61-D70 o al piano sequenziale. Modifiche esistenti delle altre chat preservate, nessun commit. Rimossi gli include `.next-group-*` aggiunti automaticamente dai check ai tsconfig e ripristinati i riferimenti next-env ai tipi canonici `.next`. Cache locali `.next-group-*` e risultati sono ignorati da Git; la pulizia ricorsiva delle cache è stata respinta dalla policy tool, quindi non è stata ritentata e non è necessaria per il risultato. Supporto già esistente `PIZZAOS_BUILD_DIRECTORY` documentato nel README client.

## Limiti reali

Nessun deploy o invio esterno. Google OAuth e Stripe/3DS reali non sono configurati: le prove carta coprono il boundary provider canonico e l'idempotenza con adapter sostituiti solo nei test. I browser usano il solo harness isolato con repository in memoria e identità di fixture; la persistenza reale PostgreSQL è provata separatamente con gli stessi moduli pubblici. Il server live usa PostgreSQL, Auth.js e Stripe reali e non importa l'harness né espone identità finte. Il percorso contanti è verificato end-to-end fino all'admin; la regressione individuale prosegue fino a completamento operativo.
