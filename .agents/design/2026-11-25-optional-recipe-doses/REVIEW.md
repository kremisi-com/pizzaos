# Verifica locale

Implementato il comportamento confermato: dosi nullable non bloccanti per pubblicazione e ordinazione, riferimenti/allergeni preservati, nessuna dose fittizia, policy zero invariata. Copertura indipendente aggiunta da agente test sui soli requisiti e contratti: 22 casi, inclusi percorso legacy e totale noto+ignoto.

Controlli eseguiti:
- Suite generale dominio, backend, Admin e Client: 1076 test passati, 22 skip di integrazione esterna; un vecchio test richiedeva ancora rifiuto della dose null ed è stato aggiornato alla regola confermata.
- Riesecuzione backend dopo aggiornamento e correzione legacy: 688 passati, 22 skip (DB/provider non configurati).
- Suite indipendenti dosi facoltative: 22 passati.
- Prova browser con servizio isolato `playwright.menu-publication.config.ts`: pubblicazione riuscita con dose ricetta ed extra null e modal chiuso.
- `pnpm lint`, `pnpm typecheck`, `pnpm build`, `pnpm architecture:check`: passati. Lint/build backend e typecheck dei moduli rieseguiti dopo la correzione legacy: passati.

Nessun deploy o collaudo online eseguito. Nessuna modifica automatica a dati commerciali o scorte.
