# Stabilizzazione e punto zero del 25 novembre 2026

## Perimetro

Base isolata: `9c27263610a01e57ef08e3bd5e1762a76c04aa0d`. Le modifiche non committate del checkout principale non vengono copiate né modificate. Nessun deploy, scrittura su database remoto o attivazione worker è parte di questa attività.

Correggere gli alias della suite repository, rendere deterministiche le prove del calendario e proteggere atomicamente il salvataggio generale della sede da una configurazione superata, anche dopo consumi di magazzino. Conservare il merge di modifiche indipendenti dell'admin; bloccare la finestra fra rilettura e salvataggio lato servizio.

## Ownership e struttura documentale risultante

- `services/checkout-api`: confronto atomico della versione della configurazione, DTO operatore e contratto HTTP.
- `packages/domain`: token opaco opzionale sul DTO sede; obbligatorio per aggiornare una sede esistente.
- `apps/admin`: inoltra la versione della lettura usata per il merge; un conflitto conserva la bozza e mostra un errore.
- `.agents/product-definition/current-state.md`: fotografia iniziale, perimetro, prove, limiti e criteri di rilascio; non duplica le regole dei flussi.
- `.agents/product-definition/flows/`: fonti correnti, inclusi accessi/configurazione e operazioni/rider/analytics consolidati dagli SDD.
- `.agents/archive/`: pianificazione POC, sequenza completata, ricerca iniziale e piano di ripristino superato. I design/riesami datati restano nelle posizioni esistenti come evidenze.
- `services/checkout-api/online-deployment.md`: stato ultimo registrato separato dalla cronologia; non dichiarare una nuova verifica online.

La roadmap diventa lavoro residuo ordinato, con la fotografia corrente come ingresso. Decisioni approvate, comportamento implementato, prove locali e prove online restano distinti. I flussi demo non diventano capacità operative per effetto del riordino.

## Verifica

Test indipendenti RED/GREEN per il confronto concorrente, regressioni proxy e calendario, suite repository, lint/typecheck/architettura, build servizio e app interessate, Playwright calendario e ordine individuale. Le prove PostgreSQL richiedono il database dedicato e gli skip vanno dichiarati. Verificare i link documentali locali e il diff prima di commit/push sul ramo isolato.
