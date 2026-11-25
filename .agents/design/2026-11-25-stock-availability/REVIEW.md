# Verifica locale dell'incremento

Richiesta e default approvati da Andrea: assenza di scorta non bloccante; policy zero configurabile per sede da Profilo; default visibile disabilitato con Esaurito. Implementazione e specifiche correnti aggiornate insieme. Nessuna scrittura sui dati online, pubblicazione del menu o rilascio cloud effettuati.

## Test indipendenti

L'agente dei test ha ricevuto soltanto REQUIREMENTS e CONTRACT_DESIGN e non ha letto l'implementazione. Prima esecuzione: 16 falliti su 22; suite ampliata: 23 falliti su 35. Le tre suite nuove passano ora tutti i 35 casi. Due aspettative sono state corrette senza cambiare requisiti: parametro opzionale addressConfirmation nel salvataggio Profilo e rifiuto dell'ID ingrediente mancante già al salvataggio bozza.

## Controlli eseguiti

- Checkout API: 673 passati, 22 saltati dalle suite PostgreSQL/Auth che richiedono il database dedicato. I nuovi test policy non sono saltati.
- Admin: 168 passati.
- Client: 157 passati, esecuzione con maxWorkers=2/minWorkers=1. Due timeout di ricerca DOM nella prima esecuzione concorrente sono passati nelle ripetizioni mirata e completa; nessuna modifica ai test preesistenti del Client per aggirarli.
- `pnpm lint`, `pnpm typecheck`, `pnpm build`: tutti gli 11 workspace superati.
- `pnpm architecture:check`: confini rispettati e quattro test del checker superati.
- `pnpm exec playwright test --config playwright.stock-policy.config.ts`: un percorso completo passato. Pubblicazione con null, salvataggio e rilettura delle tre policy in Profilo, Esaurito disabilitato per default, prodotto assente in hide, avviso soltanto admin e quote riuscita in allow. Il menu pubblicato resta lo stesso quando cambia policy.
- Suite HTTP pregresse menu/pizza/impasti/gruppo aggiornate alle nuove semantiche e superate; quote conserva il controllo autorevole anche per richieste con identificativi già noti.
- `git diff --check`: superato per l'incremento.

Le evidenze locali riguardano il codice incluso in questa modifica. Non certificano la versione servita dagli alias online. Il deploy richiede API, Admin e Client coerenti; nessuna migrazione DDL è necessaria per il campo opzionale nello snapshot JSONB.
