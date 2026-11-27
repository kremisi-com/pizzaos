# Riesame — carrello condiviso e quote

## Approvazione e ownership
Andrea ha approvato il flusso nella chat del 27 novembre 2026; [decisione corrente](../../product-definition/decisions.md#carrello-condiviso-e-pagamenti-per-quota), [specifica proprietaria](../../product-definition/flows/group-ordering.md). Domain possiede DTO, checkout-api identità/denaro/stock, client le interazioni, admin visibilità e rimborsi. Nessun import tra app o ciclo nel dominio.

## Implementazione
Conversione automatica e idempotente del draft, identità ospiti collegate all'account, contesto attivo per sede e ritorno al carrello individuale. Pagina richiesta senza card/form, QR già visibile, condivisione e persone espandibili. Checkout diretto: nessuna chiusura manuale preliminare; il servizio congela alla conferma finale.

Anticipi carta con prezzi/snapshot/ingredienti riservati senza scadenza, saldo del creatore carta/contanti, coupon su righe non pagate. Pizzeria informata al primo incasso senza preparazione anticipata, rimborsi per quota e ordine al finanziatore effettivo, contanti restituiti manualmente. Recupero dopo risposta persa, riavvio, errore definitivo e provider incerto. Rimborsi riusciti aggiornano ricavi e punti senza cambiare comanda/data. Aggiunte canoniche e contanti rider conservano importi effettivi.

## SDD e indipendenza
Agente test separato: solo REQUIREMENTS e CONTRACT_DESIGN, nessun INTERNAL_DESIGN o sorgente di produzione. Primo red: 15 casi falliti sul vecchio contratto. Nuova copertura indipendente: 23 servizio + 4 notifiche/analytics/fedeltà + 14 admin. Le asserzioni sulle riserve usano disponibilità pubblica, senza imporre la rappresentazione interna delle scorte. I test hanno trovato un blocco reale dopo price_changed e verificano la correzione.

## Verifiche locali
- Servizio: suite completa 44 file passati, 6 saltati; 734 test passati, 22 saltati. Typecheck, lint e build riusciti. Controllo finale HTTP + integrazione: 32/32.
- Client: suite completa 48 file, 269 test passati; verifiche mirate successive per checkout diretto, trasferimenti/retry e ciclo Stripe registrate nel completamento sotto. Lint e typecheck riusciti.
- Admin: suite completa 44 file, 198 test passati; nuovi casi successivi 14/14, inclusi assenza di duplicati durante 3DS e restituzione contanti esplicita. Lint, typecheck e build isolata riusciti.
- Regressioni trasversali: 201 test su catalogo/menu, tipi prodotto, calendario, sottodomini, promozioni, email e analytics riusciti. Proxy: 36/36, inclusa rimozione degli header di rete falsificati.
- Architettura: confini e quattro test del controllo riusciti.
- Browser: tre scenari gruppo passati nella prima versione verificata (conversione/QR multi-browser, consegna, anticipo/pizzeria/rimborso/rientro). Verifica finale dell'ultima versione registrata sotto.
- QA visiva: screenshot mobile locale in test-results/group-ordering/shared-cart-mobile.png; QR centrale leggibile e decodificato, link affiancato all'icona, persone espandibili e nessuna sovrapposizione con la navigazione.

## Limiti delle evidenze
PostgreSQL/Auth richiedono PIZZAOS_TEST_DATABASE_URL con database dedicato pizzaos_individual_test: variabile assente e Docker Desktop non avviato, quindi test relativi saltati. Browser e servizi usano repository/provider isolati; nessuna prova Stripe/3DS o SMTP esterna è certificata. Non è stato eseguito o verificato un deploy online dell'incremento; push Git e stato del rilascio automatico restano evidenze distinte. Lavori paralleli e file Next generati restano esclusi dal commit del task.

## Completamento finale
Versione finale: lint, typecheck e build di client/admin/servizio riusciti. Client: ultima verifica mirata 64/64 (20 UI gruppo, 9 bootstrap/trasferimenti, 35 ordini). Browser gruppo 3/3 sull'ultima versione, senza build concorrenti; regressione del checkout corrente 2/2 tramite `pnpm exec playwright test --config playwright.checkout-alignment.config.ts tests/e2e/operational-checkout.spec.ts --output test-results/shared-cart-current-checkout-regression`. Il trasferimento da sede diversa dalla prima, il recupero identità dopo 503 e Stripe Elements durante 3DS hanno regressioni dedicate.

La prova legacy `individual-ordering.spec.ts` è stata tentata e fallisce sull'asserzione di focus dell'interfaccia precedente, prima di raggiungere il pagamento. Il checkout corrente approvato in un lavoro parallelo usa controlli e pagina Ordini nuovi: sono verificati tramite la relativa suite attuale 2/2, senza alterare il prodotto per soddisfare asserzioni superate. Il comando del gruppo ora seleziona esplicitamente `persistent-group.spec.ts`.

La revisione finale ha trovato ed eliminato l'esposizione dei dati fulfillment del creatore agli invitati: il nuovo test indipendente prima fallisce, poi passa. Solo host riceve indirizzo, note globali e selezione benefici; nomi/scelte dei partecipanti restano condivisi. La suite servizio finale registra 734 successi e 22 skip dopo questa correzione. Link locali dei 17 documenti SDD/proprietari controllati senza riferimenti mancanti.

Commit e push vengono eseguiti al termine del riesame del diff; solo i cambiamenti di questo incremento, senza file generati Next o modifiche di altri lavori.
