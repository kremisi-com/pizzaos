# Verifica dei sottodomini delle sedi

D76 è approvata nella chat del 23 novembre 2026. L'implementazione riguarda superadmin, client e servizio checkout. Un alias cliente esistente dichiarato esplicitamente conserva il flusso pilota fino alla sua eventuale associazione a una sede.

## Verifica locale

- Sette [test HTTP indipendenti](../../../services/checkout-api/src/store-subdomains.test.ts) coprono permessi, salvataggi precedenti, duplicati, concorrenza, isolamento tra sedi e callback Google con discovery simulata.
- `pnpm exec playwright test --config playwright.store-subdomains.config.ts` ha superato tre scenari. Copre assegnazione, menu e gruppo della sede, host sconosciuto e passaggio di un alias precedente al sito assegnato.
- `pnpm exec playwright test --config playwright.group-ordering.config.ts` ha superato nove scenari regressione. Lint, TypeScript e build delle superfici sono riusciti. Il pacchetto API è stato anche installato fuori dal monorepo e l'ingresso HTTP caricato in Node.

Le prove browser indirizzano gli host HTTPS a un ambiente locale isolato. La prova OAuth non effettua lo scambio di token con Google.
