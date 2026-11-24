# Verifica locale — 24 novembre 2026

## Approvato e implementato

Editor operativo Admin a due colonne con selettore menu, scheda pizza essenziale e configurazione destra di impasti/basi/formati. Standard comuni; Pizza custom con nomi liberi, quota e percentuale. Magazzino possiede abilitazione, prezzo e dose degli extra. Snapshot commerciale aggiornato alla pubblicazione, con controllo della firma dopo modifiche Magazzino. I cataloghi precedenti si collegano esplicitamente, senza ricette dedotte dai nomi. Client individuale/gruppo con scelte iniziali, anteprima e card ispirate al POC; righe esistenti conservano le proprie scelte.

Il test agent SDD ha ricevuto requisiti e contratti, senza disegno interno; ha modificato solo test. I vecchi ordini e la demo mantengono i confini precedenti. Il provider notifiche resta nella composizione, mentre il contratto condiviso è ora in features/notifications: corregge gli import contrari ai confini trovati durante architecture:check.

## Controlli eseguiti

- Domain: typecheck, lint, build; 39 test passati (20 catalogo pizza).
- Servizio: typecheck, lint, build; suite completa 594 test passati e 22 esclusi per assenza di un database di test dedicato. Suite HTTP pizza aggiornata: 26 casi passati, inclusi prezzo/dose pubblicati, firma superata, scorte, custom disattivato e riferimenti conservati.
- Admin: typecheck, lint, build; suite completa 118 test passati. Suite editor aggiornata: 5 casi; regressioni sezioni/rimozione/import verificate.
- Client: typecheck, lint, build; suite completa 131 test passati; dettaglio aggiornato 10 casi passati, incluse le identità distinte di ingrediente incluso ed extra.
- Confini architetturali: controllo e 4 test passati.
- Browser: playwright.menu-ordering.config.ts, 3 scenari passati; prova pubblicazione/ordine cucina, composizione pizza, Magazzino/formula libera/preventivo. L'esempio finale produce 14,20 euro con base 9, extra 3/2/1 scontati sui due più costosi al 40% e supplemento impasto 1,20.

Screenshot desktop Admin e mobile Client prodotti in test-results/menu-ordering dalla suite browser e riesaminati. Corrette interferenze degli stili del form ospitante, spaziatura dell'header e scorrimento orizzontale da trasformazione decorativa dell'anteprima. Nel collaudo finale documento e dialogo misurano 390/390 px prima e dopo la selezione degli extra, senza scorrimenti orizzontali del contenuto. Il solo elemento decorativo trasformato rimane confinato nel frame con overflow:clip. Il caso di due topping distinti con lo stesso ingrediente rimane selezionabile.

Le build finali Admin e Client sono state eseguite con i server E2E arrestati: un primo tentativo concorrente era fallito perché Next rigenerava i tipi del server di test. Le build successive passano entrambe; nessuna modifica alle configurazioni Next preesistenti è necessaria. Rimane il messaggio informativo preesistente sul plugin ESLint Next non rilevato.

## Limiti delle evidenze

Nessun deploy, modifica di dati di produzione o collaudo online. Le prove browser usano app Next reali e API locale con repository fixture; non attestano un'esecuzione della suite PostgreSQL esterna. Nessun DDL richiesto sullo snapshot esistente. Per un futuro rilascio distribuire prima il servizio compatibile e poi le applicazioni. Le configurazioni Next/tsconfig già modificate prima del lavoro non sono incluse nel commit.
