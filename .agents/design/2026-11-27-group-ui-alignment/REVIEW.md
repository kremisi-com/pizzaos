# Riesame locale dell'allineamento

## Approvato e implementato

L'approvazione di Andrea mantiene regole economiche, ruoli e pagina di condivisione e allinea le viste operative al percorso individuale. Nessuna modifica di contratti server, configurazioni commerciali o persistenza. Le capacità di presentazione sono esportate dagli entry pubblici delle feature proprietarie; individuale e gruppo conservano la propria logica.

La pagina menu riusa copertina, intestazione e pulsante Carrello con conteggio personale. Il carrello riusa righe prodotto e controlli, preservando note locali, permessi e snapshot pagati. Il blocco fisso distingue creatore e invitato; gli importi personali aggiornati dal servizio sono mostrati prima della seconda conferma. Il checkout riusa sezioni, radio, fasce dettagliate e focus del riepilogo e distingue totale, anticipi e residuo. Accesso e recupero restano utilizzabili anche dopo una sessione scaduta. Nessuna raccolta carta a residuo zero, neppure durante invio; Elements positivo conservato attraverso 3DS.

## Test indipendenti e controlli eseguiti

L'agente dei test ha ricevuto requisiti e contratti, senza disegno interno o nuova implementazione. Primo red: 19 test passati e 9 falliti (uno corretto come race del fixture); successivi test coprono i comportamenti, non nomi di classi. La revisione React ha individuato e corretto perdita del link accesso con tentativo pendente e montaggio superfluo Stripe a residuo zero; regressioni indipendenti per loading, errore e ospite verificato.

- `pnpm --filter @pizzaos/client test`: 287 test superati in 48 file; include 32 test gruppo e regressioni individuali, promozioni, personalizzazioni, POC e navigazione.
- `pnpm --filter @pizzaos/client lint`: superato.
- `pnpm --filter @pizzaos/client typecheck`: superato. Un tentativo concorrente al riavvio Next ha incontrato file generati in sostituzione; ripetuto dopo il browser con esito positivo.
- `PIZZAOS_BUILD_DIRECTORY=.next-group-ui-build pnpm --filter @pizzaos/client build`: superato, 21 pagine generate. Avviso preesistente sulla configurazione ESLint Next.
- `pnpm architecture:check`: confini e 4 test superati.
- `pnpm exec playwright test --config playwright.group-ordering.config.ts tests/e2e/persistent-group.spec.ts`: 5 scenari superati. QR decodificato, browser distinti, conversione draft, permessi, invio ordine unico, indirizzo, anticipo/rimborso, dock creatore/invitato/ospite; geometria 375/390/1280 px. Scenario menu/carrello/checkout ripetuto dopo l'ultimo adeguamento della presentazione: 1/1 superato.
- `pnpm exec playwright test --config playwright.checkout-alignment.config.ts`: 9 scenari individuali superati, inclusi carrello lungo, draft, percorsi legacy, ordini, invio contanti, recupero personalizzazioni e indirizzo.
- Screenshot cart/checkout mobile e desktop controllati visivamente negli artefatti ignorati `test-results/group-ordering/`. Nessuna eccedenza orizzontale; azioni sopra la navbar e contenuti finali raggiungibili.

Il chiamante radio gruppo nella suite promozioni E2E è aggiornato; quella suite storica non è stata eseguita, perché il suo percorso di creazione gruppo usa ancora nome/scadenza precedenti al carrello condiviso. La regressione promozioni client è nella suite completa. Servizio, Google e Stripe reali non sono ricollaudati da questo incremento: il browser usa il fixture pubblico e le prove 3DS client usano callback controllate. Nessuna nuova verifica online o prova su dispositivi fisici è attestata.
