# Configurazione della sede e magazzino

Owner: checkout-api per dati, autorizzazioni e transazioni; admin per Profilo/Magazzino. Copre F03/F06/F07/F08, D28/D29/D55/D75–D78 e la stabilizzazione del 25 novembre. [Menu e pubblicazione](menu-ordering.md) possiedono prezzi, ricette e personalizzazioni commerciali.

## Percorso e responsabilità

Il superadmin crea la sede in Profilo con ID, identità/contatti, indirizzo confermato, configurazione operativa e accessi. L'operatore autorizzato aggiorna la propria sede, imposta apertura ordini, settimana tipo, capacità e fasce di consegna. I valori commerciali restano modificabili dal pannello.

Il gestore registra in Magazzino ingredienti, scorte, allergeni e tracce. Ogni ingrediente mostra i multiselect **Contiene** e **Può contenere**, basati sulla lista statica italiana condivisa e abilitati dalla conferma **Informazioni allergeni verificate**. Le selezioni sono indipendenti per ingrediente e si salvano con la configurazione. Un allergene può appartenere a una sola delle due liste; selezionarlo nell’altra lo sposta. I valori esistenti sono conservati anche quando non appartengono alla lista statica. Togliere la conferma ripristina il dato da verificare; confermare senza selezioni dichiara liste vuote. Copertura locale: `apps/admin/src/test/inventory-allergens.test.tsx`. `null` significa dato da verificare, distinto da zero/esaurito. Le quantità delle ricette sono intere positive; una composizione con dati incompleti non diventa ordinabile. Gli extra abilitati con prezzo/dose passano nelle bozze e diventano commerciali alla pubblicazione. Le scorte correnti governano immediatamente disponibilità e riserve.

L'indirizzo si cerca tramite Geoapify nel servizio e si salva solo dopo la scelta esplicita di una corrispondenza. La conferma temporanea lega identità, sede e posizione precedente: un token scaduto, alterato o relativo a un'altra sede non cambia coordinate. Le sedi precedenti possono conservare la posizione già salvata. Chiave provider assente/guasto: ricerca indisponibile, nessuna posizione inventata.

Il superadmin assegna una sola etichetta pubblica univoca e immutabile per sede; i nomi riservati e le collisioni vengono rifiutati. Host e regole cliente sono in [ordinazione](customer-ordering-and-payment.md#sottodomini-delle-sedi). Fasce settimanali e date protette sono nel [calendario](customer-ordering-and-payment.md#calendario-e-capacità).

## Salvataggi concorrenti

Il Magazzino salva testi e numeri quando il campo perde il focus e selezioni/rimozioni immediatamente, senza pulsante **Salva configurazione**. Un ingrediente nuovo viene salvato dopo aver compilato il nome obbligatorio. Durante una richiesta i campi restano editabili: i salvataggi successivi attendono la risposta e usano come confronto l'ultima bozza riuscita, senza rimontare il form o perdere il focus. Errori e conflitti mantengono la bozza e fermano la coda; **Riprova salvataggio** o una nuova modifica avviano un tentativo esplicito, soggetto alle stesse verifiche di concorrenza. Il messaggio di successo compare solo dopo la risposta positiva. Profilo e creazione sede mantengono il salvataggio manuale. Copertura locale: `apps/admin/src/test/inventory-autosave.test.tsx`, `apps/admin/src/test/inventory-allergens.test.tsx`, `apps/admin/src/test/store-configuration-concurrency.test.tsx`. Nessuna nuova verifica online attestata.

La lettura operatore e il salvataggio restituiscono `configurationRevision`, un token opaco della configurazione canonica. Non è esposto ai clienti. La creazione non richiede token; l'aggiornamento di una sede esistente lo richiede. Il servizio confronta il token dentro la stessa transazione che applica la modifica.

- Due modifiche indipendenti: l'admin rilegge la sede e conserva i campi aggiornati da altri che l'operatore non ha cambiato. Invia la versione di questa rilettura.
- Lo stesso campo è cambiato rispetto alla bozza: l'admin conserva la bozza e chiede di ricaricare la sede. Nessun salvataggio parziale.
- Un altro salvataggio, una pubblicazione menu o un consumo scorte avvengono dopo la rilettura: il servizio risponde 409 `revision_conflict`; la configurazione corrente resta intatta. Non ritentare automaticamente con una nuova versione.
- Versione assente su una sede esistente: 409. Versione malformata: 400. Rileggere la sede e riesaminare la modifica consente un nuovo invio consapevole. Un ID già esistente non è sovrascrivibile ripetendo una creazione senza token.
- Una scorta 20 letta prima del completamento di un ordine non può ripristinare la scorta a 20 dopo il consumo a 19. Le validazioni delle riserve restano aggiuntive al controllo di versione.
- Menu e calendario conservano le proprie revisioni. Le capacità residue proiettate non diventano capacità nominali quando si salvano gli altri campi.

## Risultato e verifiche

Solo una risposta riuscita aggiorna la conferma di salvataggio. Il database resta autorevole anche quando un pannello aperto conserva una bozza precedente. Il token non richiede migrazione dei dati esistenti; servizio e admin vanno rilasciati insieme per rendere utilizzabile il nuovo contratto.

[Concorrenza e consumo scorte](../../../services/checkout-api/src/store-configuration-concurrency.test.ts), [riserve](../../../services/checkout-api/src/ordering-service.test.ts), [indirizzo](../../../services/checkout-api/src/store-address-http.test.ts), [sottodomini](../../../services/checkout-api/src/store-subdomains.test.ts), [calendario](../../../services/checkout-api/src/order-calendar.test.ts), [repository PostgreSQL](../../../services/checkout-api/src/postgres-repository.test.ts). Le prove DB richiedono ambiente dedicato; collaudo cloud e versione locale restano distinti.
