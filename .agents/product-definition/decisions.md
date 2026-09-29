# Decisioni di prodotto

Questo è il registro canonico delle decisioni di alto livello. Aggiornarlo quando il proprietario del prodotto decide o modifica un punto; collegare ogni requisito e task dipendente all'ID di decisione. Non dedurre una decisione da mock, copy marketing o mera esistenza di un contratto.

## Regola di blocco per progressive disclosure

Prima di pianificare o implementare una task:

1. Individuare il flusso in `flow-inventory.md` e leggere solo la relativa specifica.
2. Controllare in questa pagina le decisioni richieste da quel flusso.
3. Se una decisione **necessaria** è `APERTO` o `DA VALIDARE`, fermare la parte dipendente e segnalare l'ID, la scelta richiesta e le alternative concrete. Non inventare un default e non chiedere di nuovo punti già decisi.
4. Si può proseguire sulle parti indipendenti. Registrare la dipendenza nel piano della task come `Bloccata da: Dxx`.
5. Una decisione non necessaria alla task non blocca il lavoro: indicare il vincolo e rinviare la definizione alla specifica proprietaria.

Una task è sbloccata quando tutte le decisioni obbligatorie sono `DECISO` o `NON APPLICABILE`. Le decisioni di prodotto ancora aperte non si risolvono autonomamente durante l'implementazione.

Stati ammessi: `DECISO`, `APERTO`, `DA VALIDARE`, `RINVIATO`, `NON APPLICABILE`.

## Decisioni confermate

| ID | Decisione | Stato | Fonte |
|---|---|---|---|
| D01 | Obiettivo: prima versione utilizzabile e testabile da una pizzeria pilota, con capacità fondamentali di ordini, pagamenti e dashboard admin. | DECISO | Risposta utente 2026-09-29 |
| D02 | Funzioni considerate indispensabili per la prima versione: ordini cliente, admin, gestione menu e scorte, marketing, consegne, ordini di gruppo e abbonamenti. I teaser non vanno realizzati per ora. | DECISO | Risposta utente 2026-09-29 |
| D03 | Il cliente può iniziare l'ordine senza autenticarsi; al termine, prima di completare l'ordine, deve poter accedere o registrarsi. | DECISO | Risposta utente 2026-09-29 |
| D04 | Metodi di accesso iniziali: Google e magic link, usando Auth.js. | DECISO | Risposta utente 2026-09-29 |
| D05 | Esistono ruoli operatore distinti, ma inizialmente tutti hanno gli stessi permessi funzionali all'interno della propria sede. | DECISO | Risposta utente 2026-09-29 |
| D06 | Prima versione senza catene. Menu, orari, prezzi e disponibilità sono configurati per singola sede. | DECISO | Risposta utente 2026-09-29 |
| D07 | Solo il superadmin PizzaOS può creare sedi e invitare operatori, per ora. | DECISO | Risposta utente 2026-09-29 |
| D08 | Il ristorante deve accettare l'ordine prima che entri in preparazione. | DECISO | Risposta utente 2026-09-29 |
| D09 | Alla prima versione i metodi pagamento includono carta e contanti, con contanti alla consegna o al ritiro. | DECISO | Risposta utente 2026-09-29 |
| D10 | Prima versione con rider propri. Il ristoratore configura area/raggio di consegna, soglie di distanza, costo minimo, costo di consegna e ordine minimo. | DECISO | Risposta utente 2026-09-29 |
| D11 | Punti loyalty accreditati a ordine completato; promozioni cumulabili; programma configurabile per singolo ristorante. | DECISO | Risposta utente 2026-09-29 |
| D12 | Ordine di gruppo: la definizione è rinviata. La capacità resta nel perimetro desiderato, ma le task che dipendono da partecipanti, condivisione, chiusura o pagamento di gruppo sono bloccate da D21. | RINVIATO | Risposta utente 2026-09-29 |
| D13 | Gli insight AI sono rinviati a versioni successive. | DECISO | Risposta utente 2026-09-29 |
| D14 | Prima versione con analitiche semplici; BI e MLOps sono prospettiva futura, non da costruire ora. Metriche e definizioni puntuali ancora da decidere con D22. | DECISO (perimetro), APERTO (metriche) | Risposta utente 2026-09-29 |
| D15 | Non modificare ora la strategia commerciale di PizzaOS e i relativi contenuti landing. | RINVIATO | Risposta utente 2026-09-29 |
| D16 | Non sono ancora state svolte analisi privacy/normative/operative; saranno affrontate più avanti. Il lavoro che le rende necessarie resta bloccato fino alla decisione. | RINVIATO | Risposta utente 2026-09-29 |
| D33 | Pagamento carta: incasso al momento dell'invio dell'ordine; se il ristorante annulla/rifiuta, avvio del rimborso. Lo stato del rimborso deve essere tracciato e comunicato senza promettere accredito immediato. | DECISO | Risposta utente 2026-09-29 |
| D34 | Il timeout è calcolato dal momento di invio in base alla distanza dall'orario richiesto: ASAP o entro 30 minuti = scadenza in 5 minuti; oltre 30 e fino a 90 minuti = 10 minuti; oltre 90 minuti = 15 minuti. Alla scadenza senza risposta, ordine annullato e rimborso avviato automaticamente. | DECISO | Risposta utente 2026-09-29 |
| D35 | Se il cliente non risponde alla proposta per un articolo indisponibile, il ristoratore può solo attendere o annullare l'intero ordine e avviare il rimborso; non può accettare il resto con rimborso parziale in assenza di risposta. | DECISO | Risposta utente 2026-09-29 |
| D36 | Solo il cliente modifica il proprio ordine. Prima dell'accettazione può aggiungere articoli o modificare note; ogni aumento totale richiede conferma e pagamento del delta. Non può applicare modifiche che riducono il prezzo. Dopo l'accettazione può aggiornare solo le note fino all'inizio della preparazione. | DECISO | Risposta utente 2026-09-29 |
| D37 | Il cliente deve percepire un flusso continuo durante il login/signup alla fine dell'ordine. Carrello e selezione si conservano e il carrello deve sopravvivere al reload, usando persistenza locale; prezzi e disponibilità sono convalidati prima dell'invio. | DECISO | Risposta utente 2026-09-29 |
| D38 | Per un articolo indisponibile, ristorante e cliente comunicano via email o WhatsApp (non telefono). Se concordano un'alternativa, si annulla l'ordine originale; “Ripeti ordine annullato” ricrea il carrello senza l'articolo mancante. Il cliente può modificarlo e inviare un nuovo ordine con un nuovo pagamento. L'alternativa proposta non viene inserita automaticamente. | DECISO | Risposta utente 2026-09-29 |
| D39 | Se il ristoratore aspetta la risposta del cliente per un'alternativa, non c'è scadenza automatica; la dashboard admin deve evidenziare graficamente l'ordine in attesa. | DECISO | Risposta utente 2026-09-29 |
| D40 | Notifiche per mancata accettazione: solo dashboard admin; deve aggiornarsi in tempo reale senza reload quando possibile, tramite stream/socket. | DECISO (canale/obiettivo), APERTO (trasporto e fallback) | Risposta utente 2026-09-29 |
| D41 | Alla creazione dell'ordine riservare temporaneamente stock e capacità slot; rilasciarli se l'ordine viene annullato o scade. | DECISO (regola generale), APERTO (concorrenza e durata per ordini sospesi) | Risposta utente 2026-09-29 |

## Decisioni aperte o da validare

| ID | Decisione necessaria | Stato | Blocca almeno |
|---|---|---|---|
| D17 | Timeout di accettazione proporzionale alla prossimità dell'orario richiesto, con soglie e durate definite in D34; alla scadenza senza risposta, annullamento e rimborso automatici. Restano da definire soltanto gli avvisi/escalation. | DECISO (policy timeout), APERTO (avvisi) | State machine ordini, dashboard operativa, notifiche |
| D18 | Incasso al checkout e avvio rimborso su annullamento decisi in D33; restano carta rifiutata, pagamenti pendenti, fallimento/ripetizione rimborso e contanti. | DECISO (regola principale), APERTO (dettagli) | Contratto checkout, integrazione pagamenti, annullamenti e rimborsi |
| D19 | Regole di modifica definite in D36. | DECISO | Dettaglio ordine e gestione modifiche |
| D20 | Se un articolo diventa indisponibile dopo l'invio, il ristorante contatta il cliente via email o WhatsApp; se non risponde, può attendere senza scadenza o annullare e rimborsare (D35/D39). Se concordano un'alternativa, l'ordine originale viene annullato e “Ripeti ordine annullato” ricrea il carrello senza l'articolo mancante; il cliente lo modifica e invia un nuovo ordine/pagamento (D38). | DECISO | Prenotazione scorte, accettazione, conflitti checkout |
| D21 | Flusso di gruppo: invitati/link, account richiesto o no, permessi partecipanti, scadenza, chiusura e pagante. | RINVIATO | Implementazione end-to-end gruppo |
| D22 | Metriche minime analytics per il ristorante pilota e loro definizioni (es. lordo/netto, annullati, vendite, ticket medio, prodotti). | APERTO | Specifica e dashboard analytics |
| D23 | È deciso che la sede configura area/raggio, soglie di distanza, costo di consegna e ordine minimo. Restano aperti punto di partenza, forma area (raggio o zone), fasce/prezzi e regole pickup. | DECISO (perimetro), APERTO (calcolo) | Verifica indirizzo e calcolo consegna |
| D24 | Capacità slot e disponibilità: capienza, prenotazione, rilascio su rifiuto/timeout, ASAP vs programmato, sospensione ordini durante picchi. | APERTO | Slot, inventario e checkout concorrente |
| D25 | Regole di coupon/promozioni: cumulabilità confermata, ma ordine di applicazione, limiti, esclusioni e rimborsi dei benefici restano da decidere. | APERTO | Prezzo autorevole, coupon, loyalty |
| D26 | Abbonamenti cliente inclusi nel perimetro, ma regole non definite: pacchetto, rinnovo, consumo, condivisione, scadenza, annullamento e rimborsi. | APERTO | Vendita e riscatto abbonamenti |
| D27 | Identità cliente e carrello anonimo: dati minimi raccolti, cosa conservare pre-login e come associare/merge il carrello dopo Google o magic link. | DA VALIDARE | Guest checkout e autenticazione |
| D28 | Ruoli operatori: nomi/uso dei ruoli e possibilità futura di permessi granulari; la parità permessi iniziale è decisa, non la tassonomia. | APERTO | Modello identità/tenant e audit |
| D29 | Onboarding della singola sede pilota: chi inserisce catalogo, ingredienti/allergeni, orari e impostazioni rider prima dell'avvio. | APERTO | Setup sede e avvio pilota |
| D30 | Canali di notifica al cliente e all'operatore (in-app/web, email, SMS/WhatsApp) e quali sono indispensabili al pilota. | APERTO | Flussi ordini e comunicazioni |
| D42 | Carrello locale: durata/scadenza e comportamento quando il server rifiuta prezzo/stock/slot. Non salvare dati carta o segreti; ordine e pagamento sono autorevoli lato servizio. Campi e assenza di sincronizzazione multi-device definiti in D48. | APERTO | Carrello resiliente, login, checkout |
| D43 | Mantenere riservate le risorse disponibili e la capacità dello slot mentre si attende senza scadenza la risposta del cliente via email o WhatsApp, finché il ristoratore non accetta o annulla l'ordine. Se si crea il nuovo ordine con l'alternativa, rilasciare la riserva dell'originale e convalidare nuovamente disponibilità e capacità del carrello nuovo. | DECISO | Risposta utente 2026-09-29 |
| D44 | Il cliente può annullare autonomamente mentre l'ordine è in attesa di accettazione; dopo l'accettazione contatta il ristorante via email o WhatsApp per chiedere l'annullamento. | DECISO | Risposta utente 2026-09-29 |
| D45 | Se il ristoratore attende senza scadenza una risposta e passa l'orario richiesto, l'ordine resta evidenziato e le risorse restano riservate finché il ristoratore non lo risolve manualmente. | DECISO | Risposta utente 2026-09-29 |
| D46 | Per un ordine rifiutato/annullato prima dell'evasione, il pagamento in contanti non richiede rimborso; il contante viene pagato al ritiro o alla consegna. | DECISO | Risposta utente 2026-09-29 |
| D47 | Il cliente può aggiornare le note dopo l'accettazione solo prima che inizi la preparazione; l'aggiornamento deve apparire in admin. | DECISO | Risposta utente 2026-09-29 |
| D48 | Persistenza del carrello guest in localStorage: conservare carrello, personalizzazioni, note, sede, modalità e slot, senza dati di pagamento. Non sincronizzare automaticamente il carrello su altri dispositivi. | DECISO | Risposta utente 2026-09-29 |

## Raccomandazioni in attesa di conferma

Le proposte non sono decisioni PizzaOS finché l'utente non le conferma; quelle approvate sono riportate come `DECISO` sopra.

- **D17 / avvisi:** definire gli avvisi/escalation per il ristorante prima della scadenza; le soglie e l'esito automatico sono definiti in D34.
- **D37 / dettagli della persistenza:** specificare i campi e la durata del draft locale, coerenti con l'account cliente e la policy di conservazione del prodotto.

## Decisioni che richiedono una ricerca o conferma esterna

- D31 — Obblighi legali/fiscali e gestione privacy per il mercato iniziale. RINVIATO con D16; non progettare come risolti.
- D32 — Pratiche correnti dei prodotti concorrenti: usare solo come input comparativo, mai come decisioni automatiche per PizzaOS. DA VALIDARE.

## Fonti e assunzioni da non confondere

- Risposte dell'utente in chat del 2026-09-29: fonte per D01-D16.
- Le pratiche di settore riassunte in `flow-inventory.md` sono esempi osservati, non policy PizzaOS.
- `ClientApiContract` e `checkout-api` attestano basi tecniche esistenti, non approvazione di ogni dettaglio di processo.

