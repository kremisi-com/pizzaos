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
| D12 | Ordine di gruppo autorizzato come incremento successivo all’ordine individuale completato e verificato; regole D21/D61-D63. | DECISO | Conferma utente 2026-11-05 in chat sequenza gruppo/fedeltà/notifiche |
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
| D40 | SSE con polling di recupero per aggiornamenti senza reload della dashboard; stesso stato consultabile nel client (D54). | DECISO | Conferma utente 2026-11-05 |
| D41 | Riserve atomiche di stock/capacità durante pagamento, confermate all’invio; rilascio su abbandono/fallimento definitivo, annullamento o scadenza. Attesa alternativa senza limite secondo D43/D45 (D51). | DECISO | Conferma utente 2026-11-05 |

| D17 | Dashboard con nuovi ordini, countdown e attese evidenziate; soglie D34 invariate. Per il primo incremento niente escalation esterna automatica (D54). | DECISO | Conferma utente 2026-11-05 |
| D18 | Carta rifiutata: conservare carrello, riprovare o scegliere contanti. Esito incerto: verifica in corso e nessun secondo pagamento fino a risoluzione. Rimborso fallito: ordine annullato, avviso admin e ritenta. Contanti secondo D46. | DECISO | Conferma utente 2026-11-05 |
| D19 | Regole di modifica definite in D36. | DECISO | Dettaglio ordine e gestione modifiche |
| D20 | Se un articolo diventa indisponibile dopo l'invio, il ristorante contatta il cliente via email o WhatsApp; se non risponde, può attendere senza scadenza o annullare e rimborsare (D35/D39). Se concordano un'alternativa, l'ordine originale viene annullato e “Ripeti ordine annullato” ricrea il carrello senza l'articolo mancante; il cliente lo modifica e invia un nuovo ordine/pagamento (D38). | DECISO | Prenotazione scorte, accettazione, conflitti checkout |
| D22 | Cinque metriche del pilota e filtri temporali approvati; definizioni in D59/D60. | DECISO | Conferma utente 2026-11-05 in chat parallela |
| D23 | Primo incremento: raggio dalla sede e fasce di distanza con costo/minimo configurabili; fuori copertura proporre ritiro (D52). | DECISO (primo incremento) | Conferma utente 2026-11-05 |
| D24 | Fasce e massimo ordini per fascia configurabili per sede; ASAP prima disponibilità. Riserva temporanea durante pagamento, trasformata alla creazione ordine, rilasciata se abbandono/fallimento definitivo (D51). | DECISO (primo incremento) | Conferma utente 2026-11-05 |
| D27 | Dopo login mantenere carrello del dispositivo, senza merge multi-device. Nome/email account, telefono ordine, indirizzo solo per consegna (D50). | DECISO (primo incremento) | Conferma utente 2026-11-05 |
| D28 | Operatori con stessi permessi nella propria sede; tassonomia dettagliata ruoli rinviata e non blocca primo incremento (D55). | DECISO (primo incremento) | Conferma utente 2026-11-05 |
| D29 | Superadmin crea sede e invita operatori per email; ristoratore configura menu, ingredienti/scorte, orari e consegna tramite admin (D55). | DECISO | Conferma utente 2026-11-05 |
| D30 | Primo incremento con contatti manuali D54; successivo incremento email operative automatiche autorizzato dopo coupon/fedeltà verificati, secondo D68/D69. WhatsApp resta manuale. | DECISO | Conferma utente 2026-11-05 |
| D42 | Carrello conservato 7 giorni dall’ultima modifica. Prezzi cambiati richiedono conferma; indisponibilità/slot persi richiedono correzione prima dell’invio (D50). | DECISO | Conferma utente 2026-11-05 |
| D43 | Mantenere riservate le risorse disponibili e la capacità dello slot mentre si attende senza scadenza la risposta del cliente via email o WhatsApp, finché il ristoratore non accetta o annulla l'ordine. Se si crea il nuovo ordine con l'alternativa, rilasciare la riserva dell'originale e convalidare nuovamente disponibilità e capacità del carrello nuovo. | DECISO | Risposta utente 2026-09-29 |
| D44 | Il cliente può annullare autonomamente mentre l'ordine è in attesa di accettazione; dopo l'accettazione contatta il ristorante via email o WhatsApp per chiedere l'annullamento. | DECISO | Risposta utente 2026-09-29 |
| D45 | Se il ristoratore attende senza scadenza una risposta e passa l'orario richiesto, l'ordine resta evidenziato e le risorse restano riservate finché il ristoratore non lo risolve manualmente. | DECISO | Risposta utente 2026-09-29 |
| D46 | Per un ordine rifiutato/annullato prima dell'evasione, il pagamento in contanti non richiede rimborso; il contante viene pagato al ritiro o alla consegna. | DECISO | Risposta utente 2026-09-29 |
| D47 | Il cliente può aggiornare le note dopo l'accettazione solo prima che inizi la preparazione; l'aggiornamento deve apparire in admin. | DECISO | Risposta utente 2026-09-29 |
| D48 | Persistenza del carrello guest in localStorage: conservare carrello, personalizzazioni, note, sede, modalità e slot, senza dati di pagamento. Non sincronizzare automaticamente il carrello su altri dispositivi. | DECISO | Risposta utente 2026-09-29 |

## Decisioni aperte o da validare

| ID | Decisione necessaria | Stato | Blocca almeno |
|---|---|---|---|
| D21 | Gruppo con organizzatore autenticato, invitati via link e nome senza account, contributi personali, chiusura e pagamento unico; dettagli D61-D63. | DECISO | Conferma utente 2026-11-05 |
| D25 | Coupon e fedeltà autorizzati dopo il gruppo verificato; configurazione admin, regole economiche D64-D67. Non cambiano il primo incremento a prezzi ordinari D53. | DECISO | Conferma utente 2026-11-05 |
| D26 | Abbonamenti restano nel perimetro del prodotto; regole e collegamento checkout rinviati a incremento successivo (D53). | RINVIATO | Incrementi successivi promozioni/abbonamenti; non blocca ordine individuale a prezzi ordinari (D53) |


## Conferme del 2026-11-05

L'utente ha confermato tutte le sette proposte per il primo flusso completo di ordine individuale e pagamento. Queste decisioni sbloccano l'incremento; non risolvono le regole delle capacità rinviate.

| ID | Decisione | Stato | Fonte |
|---|---|---|---|
| D49 | Errori pagamento: carta rifiutata conserva carrello e permette retry/contanti; esito incerto blocca nuovi pagamenti; rimborso fallito mantiene ordine annullato ed è visibile/ritentabile dall'admin. | DECISO | Conferma utente 2026-11-05 |
| D50 | Draft guest 7 giorni dall'ultima modifica; mantenere carrello del dispositivo dopo login; nome/email account, telefono per ordine e indirizzo solo delivery. Cambi prezzo da confermare, indisponibilità/slot da correggere. | DECISO | Conferma utente 2026-11-05 |
| D51 | Slot e massimo ordini configurabili per sede; ASAP prima disponibilità; riserva temporanea stock e capacità durante pagamento, consolidata all'invio e rilasciata su abbandono/fallimento definitivo. Regole precedenti su attesa alternativa e annullamento restano valide. | DECISO | Conferma utente 2026-11-05 |
| D52 | Delivery iniziale per raggio dalla sede e fasce distanza, costo e minimo configurabili; fuori copertura proporre ritiro. | DECISO | Conferma utente 2026-11-05 |
| D53 | Primo incremento con ordine individuale a prezzi ordinari; coupon, premi e abbonamenti collegati successivamente dopo definizione delle rispettive regole. Gruppo resta rinviato secondo D12/D21. | DECISO | Conferma utente 2026-11-05 |
| D54 | Stato nel client; dashboard con nuovi ordini, countdown e attese. SSE con recupero polling. Contatti email/WhatsApp manuali; notifiche automatiche da specificare successivamente. | DECISO | Conferma utente 2026-11-05 |
| D55 | Superadmin crea sedi e invita operatori per email; ristoratore configura menu, scorte, orari e consegna da admin. Stessi permessi operatori nella propria sede. | DECISO | Conferma utente 2026-11-05 |

Nessuna raccomandazione delle sette proposte è ancora in attesa di conferma. Le scelte di prodotto non coperte restano nei rispettivi flussi.

## Conferme parallele del 2026-11-05: analytics e consegne

Queste scelte aggiungono incrementi al flusso individuale in lavorazione; non ne dichiarano completata l'implementazione. D57 introduce il ruolo rider con accesso ristretto, distinto dagli operatori equiparati di D05/D55.

| ID | Decisione | Stato | Fonte |
|---|---|---|---|
| D56 | Obiettivo di verifica: ambiente di test online condiviso, utilizzabile da cliente e ristoratore su dispositivi diversi, con dati fittizi e Stripe test. L'apertura a dati e pagamenti reali è successiva e resta soggetta a D16/D31. | DECISO | Approvazione utente 2026-11-05 in questa chat |
| D57 | Gestione consegne con elenco rider e assegnazione manuale dall'admin; includere subito un accesso essenziale per il rider limitato alle proprie consegne. Il cliente vede lo stato. GPS e ottimizzazione percorsi restano fuori da questo incremento. Il rider non eredita i permessi dell'operatore. | DECISO | Approvazione utente 2026-11-05, modifica esplicita alla proposta 2 |
| D58 | Consegna non riuscita: segnalazione con nota, ordine aperto ed evidenziato; l'operatore può riassegnarlo per un nuovo tentativo oppure annullarlo con le regole di rimborso già approvate. Nessuna chiusura automatica o penale. | DECISO | Approvazione utente 2026-11-05 |
| D59 | Analytics reali per sede: numero ordini completati; vendite come valore ordini completati inclusa consegna; valore medio degli ordini completati; numero annullamenti; prodotti più venduti per quantità negli ordini completati. Vendite non rappresentano utile o saldo degli incassi. Nessuna inclusione di mock o insight AI. | DECISO | Approvazione utente 2026-11-05 |
| D60 | Filtri Oggi, Ultimi 7 giorni, Ultimi 30 giorni e intervallo personalizzato nel fuso della sede. Vendite/ordini completati attribuiti al completamento, annullamenti all'annullamento. Esportazione esclusa da questo incremento. | DECISO | Approvazione utente 2026-11-05 |

La successiva D71 conferma i sottodomini operativi e la separazione dei database tra ambienti. Hosting, DNS e collegamenti del pilota test sono ora pubblicati e verificati: il 5 novembre 2026 l'utente ha autorizzato il rilascio client e la prova completa con Stripe test, 3DS ed email operative. Il [verbale online](../../services/checkout-api/online-client-verification.md) ne registra l'esito riuscito, distinto dall'approvazione di prodotto; resta la prova su dispositivi fisici distinti prevista da D56.

## Conferme del 2026-11-05: sequenza gruppo, coupon/fedeltà, notifiche

Approvazione esplicita dell’utente in chat: «Approvo tutto. Aggiorna il registro delle decisioni e procedi in autonomia con gli agenti e SDD nella sequenza proposta, avviando ogni feature dopo che la precedente è completata e verificata». L’utente chiede anche il motivo della scadenza: serve a terminare la raccolta delle scelte, distinta dallo slot di evasione; non avvia ordini o pagamenti.

| ID | Decisione | Stato | Fonte |
|---|---|---|---|
| D61 | Organizzatore autenticato; invito tramite link. Gli invitati entrano con nome senza account e modificano soltanto i propri articoli. Prima della chiusura l’organizzatore può rimuovere partecipanti o articoli. | DECISO | Approvazione utente 2026-11-05, proposta 1 |
| D62 | L’organizzatore sceglie una scadenza per la raccolta e può chiuderla prima; la scadenza chiude la raccolta, senza pagamento o invio automatico. Conferma e paga tutto l’organizzatore, carta o contanti; un indirizzo, uno slot e un ordine al ristorante con articoli identificati per partecipante. Pagamenti separati rinviati. | DECISO | Approvazione utente 2026-11-05, proposta 2 e chiarimento scadenza |
| D63 | Il gruppo non riserva stock o capacità durante la raccolta. Alla chiusura si verificano prezzi e disponibilità; l’organizzatore risolve i conflitti prima del pagamento. Dopo invio solo l’organizzatore gestisce modifiche/annullamento secondo le regole dell’individuale. | DECISO | Approvazione utente 2026-11-05, proposta 3 |
| D64 | Punti a ordine completato: inizialmente 1 punto per euro netto speso sui prodotti, arrotondato per difetto, esclusi consegna/mance. Nel gruppo i punti spettano all’organizzatore pagante. Saldo e movimenti persistenti per ristorante/cliente, senza duplicare accrediti. | DECISO | Approvazione utente 2026-11-05, proposta 4 e D11 |
| D65 | Premio iniziale 100 punti = 5 euro sui prodotti; rapporto punti e premi configurabili dal ristoratore nell’admin, nessuna scadenza punti nella prima versione. Punti impegnati nel checkout e restituiti su annullamento; nessun accredito su ordini annullati. | DECISO | Approvazione utente 2026-11-05, proposta 5 |
| D66 | Coupon percentuali/importo fisso configurabili nell’admin: validità, minimo spesa, prodotti ammessi, limite complessivo e per cliente. Nessun prezzo o sconto automatico AI. | DECISO | Approvazione utente 2026-11-05, proposta 6 |
| D67 | Promozioni cumulabili: percentuali in sequenza, poi importi fissi e premio fedeltà; solo prodotti, mai sotto zero, minimo spesa prima degli sconti. Coupon consumati all’invio e ripristinati su annullamento; limiti e saldo con controllo concorrente autorevole sul server. | DECISO | Approvazione utente 2026-11-05, proposta 7 e D11 |
| D68 | Email operative per ordine ricevuto, accettato, pronto al ritiro/in consegna, annullato ed esito rimborso. Stato sempre consultabile nell’app. WhatsApp manuale; push, SMS e messaggi promozionali rinviati. | DECISO | Approvazione utente 2026-11-05, proposta 8 |
| D69 | Email al cliente che effettua l’ordine, nel gruppo all’organizzatore. Errori visibili nell’admin con retry automatico senza bloccare l’ordine. Nell’ambiente test solo destinatari di prova. | DECISO | Approvazione utente 2026-11-05, proposta 9 |
| D70 | Sequenza vincolante: ordine individuale completo e verificato → gruppo completo e verificato → coupon/fedeltà completi e verificati → notifiche operative. Agenti SDD con test indipendenti dall’implementazione; avviare ogni feature solo dopo il gate precedente. Autonomia autorizzata senza ripetere conferme per queste scelte. D16/D31 e abbonamenti D26 restano rinviati. | DECISO | Istruzione esplicita utente 2026-11-05 |

Piano di coordinamento e verifiche: [sequenza incrementi](sequential-increments.md). D53/D54 descrivono il primo incremento e non escludono quelli successivi ora approvati.

## Conferma del 2026-11-05: domini operativi e ambienti

| ID | Decisione | Stato | Fonte |
|---|---|---|---|
| D71 | `admin.pizzaos.app` e `rider.pizzaos.app` sono gli ingressi operativi distinti della stessa applicazione `apps/admin`, serviti dallo stesso progetto e deploy frontend per ambiente. Restano tre applicazioni e tre deploy frontend, con accesso, navigazione e permessi distinti per operatori e rider; le autorizzazioni sono verificate lato servizio. Cliente, admin e rider condividono il database del servizio nello stesso ambiente; test e produzione hanno database e credenziali separati. | DECISO | Conferma esplicita utente 2026-11-05 in chat sui sottodomini admin/rider |

Dettagli e attività di configurazione ancora necessarie: [architettura del deploy pilota](architecture/pilot-deployment.md). La scelta dei due sottodomini non attesta un deploy o una configurazione DNS già eseguiti; gli indirizzi degli altri frontend e dell'ambiente di test restano da definire.

## Conferma del 2026-11-05: POC autenticato nello stesso prodotto

| ID | Decisione | Stato | Fonte |
|---|---|---|---|
| D72 | Conservare POC e funzionalità reali nello stesso codice. L'accesso dedicato con `poc@pizzaos.app` e password demo apre il POC per quella sessione; gli altri utenti usano il prodotto reale. Il servizio verifica la sessione e impedisce qualsiasi operazione reale alla demo. Il POC usa dati locali fittizi, pagamenti simulati e reset. Nessuna identità fittizia entra nell'autenticazione reale. La password è opzionale e server-only; senza configurazione la demo è disabilitata. Il ramo locale `poc` è già incluso in `client`; non occorre un ulteriore merge. | DECISO | Approvazione esplicita utente in chat 2026-11-05: «ok, puoi procedere con l'implementazione», dopo proposta di modalità per sessione e accesso email/password dedicato |

Design e verifiche: [POC per sessione](../design/2026-11-05-session-demo/design.md).

## Decisioni che richiedono una ricerca o conferma esterna

- D31 — Obblighi legali/fiscali e gestione privacy per il mercato iniziale. RINVIATO con D16; non progettare come risolti.
- D32 — Pratiche correnti dei prodotti concorrenti: usare solo come input comparativo, mai come decisioni automatiche per PizzaOS. DA VALIDARE.

## Fonti e assunzioni da non confondere

- Risposte dell'utente in chat del 2026-09-29: fonte per D01-D16.
- Le pratiche di settore riassunte in `flow-inventory.md` sono esempi osservati, non policy PizzaOS.
- `ClientApiContract` e `checkout-api` attestano basi tecniche esistenti, non approvazione di ogni dettaglio di processo.


- Conferma utente in chat del 2026-11-05: fonte per D49-D55 e aggiornamento delle decisioni richiamate.
