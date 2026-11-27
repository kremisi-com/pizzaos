# Ordinazione cliente e pagamento

## Stato della specifica

Specifica del flusso individuale persistente, basata sul primo incremento D49-D55 e integrata dagli incrementi successivi sotto indicati. Consolidamento documentale del 25 novembre 2026; le prove conservano la data delle rispettive evidenze. Le decisioni approvate sono nel [registro](../decisions.md).

## Incrementi integrati e responsabilità

Il servizio `services/checkout-api` possiede prezzi, riserve, ordini, pagamenti e transizioni; client e admin possiedono presentazione e interazioni tramite contratti pubblici. Il percorso di base sotto resta valido e si combina con:

- [Ordine di gruppo](group-ordering.md): carrello condiviso senza scadenza, anticipi per partecipante e saldo finale del creatore, secondo l'approvazione del 27 novembre che aggiorna D61-D63.
- [Coupon e fedeltà](promotions-and-loyalty.md): benefici applicabili sia all'individuale sia al gruppo, D64-D67; sostituiscono l'esclusione iniziale del primo incremento a prezzi ordinari, senza modificarne il contesto storico.
- [Email operative](operational-emails.md): notifiche automatiche del lifecycle, D68-D69. Il contatto per concordare alternative via email/WhatsApp resta manuale.
- [Operazioni e consegne rider](operations-and-delivery.md): assegnazione, avanzamento e problemi di consegna D57-D58 sullo stesso ordine canonico.

Il [menu operativo D79](menu-ordering.md) descrive consultazione, configuratore, scorte, allergeni e sconti sugli extra. Lo stesso preventivo si usa nel percorso individuale, di gruppo e nelle aggiunte.

Gli abbonamenti non sono integrati. Lo stato delle prove e i limiti residui sono nella [roadmap](../roadmap.md).

## Obiettivo

Consentire al cliente di comporre un ordine come ospite, autenticarsi al termine senza percepire interruzioni, pagare e seguire l'accettazione del ristorante. Il carrello deve sopravvivere a un reload; ordine e pagamento confermati devono essere recuperabili dallo stato autorevole del servizio.

## Percorso approvato

Le azioni iniziali del client sono «Sfoglia il menu» e «Ordine di gruppo». Il pulsante «I tuoi ordini» non compare in questo blocco; gli ordini restano accessibili dalla navigazione inferiore e lo storico mantiene le azioni di recupero e gestione.

Il menu mantiene 24 px tra l’ultima categoria e il pulsante Carrello. Lo storico «I tuoi ordini» e «Aggiorna ordini» non sono visibili in fondo al menu: compaiono aprendo Ordini nella navbar o un collegamento diretto allo storico o al singolo ordine. Tornare a Ordina o al menu nasconde nuovamente lo storico, anche tramite indietro/avanti. La suite browser del carrello verifica visibilità e spaziatura.

Il checkout `/ordina/checkout` non include lo storico «I tuoi ordini» né «Aggiorna ordini», anche per il cliente autenticato e dopo l'invio. La conferma mantiene «Segui l'ordine», che apre l'ordine nello storico di `/ordina`; resta disponibile anche Ordini nella navbar. La suite `tests/e2e/individual-cart.spec.ts` verifica l'assenza della sezione nel checkout e l'accesso allo stato dell'ordine dopo l'invio.

La navigazione inferiore evidenzia **Ordini** su `/ordina#i-tuoi-ordini` e sulle ancore del singolo ordine `/ordina#ordine-…`, anche all'apertura diretta, al reload e usando indietro/avanti. Il ritorno a `/ordina` o al menu ripristina **Ordina**; carrello e checkout mantengono **Carrello**. La POC conserva `/orders`. Verifiche locali: [navigazione](../../../apps/client/src/test/bottom-nav.test.tsx) e [browser](../../../tests/e2e/individual-cart.spec.ts); nessuna nuova evidenza online.

Nel menu operativo, se una sola sezione contiene prodotti visibili, il suo titolo non compare sotto «Il menu». Con più sezioni visibili, il client mostra titoli e navigazione delle categorie. Le descrizioni restano visibili anche per la sezione singola; i nomi salvati nell'admin non cambiano.

La home mostra il checkout «Consegna e pagamento» solo dopo il clic su «Vai a consegna e pagamento», disponibile quando il carrello contiene articoli. Il focus passa alla sezione aperta. Un reload conserva il draft ma richiede nuovamente il clic per aprire il checkout; il recupero «Completa pagamento esistente» apre i campi necessari anche senza articoli nel carrello. Verifica browser: `tests/e2e/individual-ordering.spec.ts`.

1. Sull'indirizzo pubblico della sede il cliente trova già il menu della sede e sceglie modalità (consegna o ritiro), prodotti, personalizzazioni e slot. Può iniziare senza autenticarsi. L'origine storica del pilota conserva la scelta della sede.
2. Il carrello e il contesto di checkout si conservano localmente quanto basta per recuperare il percorso dopo reload. La UI mantiene i dati durante il passaggio a login/signup.
3. Prima di inviare l'ordine, il cliente accede o crea un account usando Google o magic link con Auth.js.
4. Dopo l'accesso, il sistema verifica nuovamente prezzi, disponibilità, slot e regole dell'ordine; eventuali differenze sono mostrate e confermate prima dell'invio.
5. Il pagamento carta viene incassato quando l'ordine viene inviato. Sono ammessi anche contanti alla consegna o al ritiro.
6. L'ordine entra in attesa di accettazione del ristorante. Il timeout dal momento di invio è calcolato dalla distanza all'orario di fulfillment richiesto:
   - ASAP o entro 30 minuti inclusi: 5 minuti;
   - oltre 30 e fino a 90 minuti inclusi: 10 minuti;
   - oltre 90 minuti: 15 minuti.
7. Se il ristorante accetta entro il timeout, l'ordine prosegue nel flusso operativo.
8. Se il ristorante non risponde entro il timeout, il sistema annulla l'ordine e avvia il rimborso. Il client mostra l'annullamento e lo stato del rimborso senza promettere un accredito immediato.
9. Se un articolo risulta indisponibile dopo l'invio, il ristorante contatta il cliente via email o WhatsApp per proporre un'alternativa. Se il cliente accetta, l'ordine originale viene annullato; “Ripeti ordine annullato” ricrea il carrello senza il prodotto mancante. Il cliente può modificarlo, aggiungere l'alternativa autonomamente e inviare un nuovo ordine con un nuovo pagamento.
10. Se il cliente non risponde alla proposta, il ristoratore può continuare ad attendere senza scadenza automatica oppure annullare l'intero ordine e avviare il rimborso. L'ordine in attesa è evidenziato in modo persistente nella dashboard admin; non si procede a sostituzione silenziosa o rimozione parziale.
11. Mentre il ristoratore attende, le risorse disponibili e la capacità dello slot restano riservate fino all'accettazione o all'annullamento. Se si procede con un nuovo ordine, si rilascia la riserva dell'ordine originale e si riconvalidano le disponibilità del nuovo carrello.
12. Il cliente può annullare autonomamente mentre l'ordine è in attesa di accettazione. Dopo l'accettazione, per chiedere l'annullamento contatta il ristorante via email o WhatsApp.
13. Se l'attesa di una risposta sull'alternativa supera l'orario richiesto, l'ordine resta in evidenza e le risorse continuano a essere riservate finché il ristoratore non lo risolve manualmente.
14. Gli ordini in contanti non richiedono rimborso se annullati prima del pagamento: il cliente paga al ritiro o alla consegna.

## Regole di modifica approvate

- Solo il cliente può modificare l'ordine. Prima dell'accettazione può aggiungere articoli e modificare note, senza applicare modifiche che riducono il prezzo.
- Ogni aggiunta che aumenta il totale richiede consenso esplicito e pagamento del delta prima che la modifica diventi effettiva. Se il pagamento non riesce o il cliente non conferma, resta l'ordine originale.
- Dopo l'accettazione non si modificano più gli articoli. Le note possono essere aggiornate solo fino all'inizio della preparazione.
- In caso di accordo via email o WhatsApp su un'alternativa, usare il percorso di annullamento e nuovo ordine; non alterare silenziosamente ordine e pagamento originali.

## Persistenza e autorità dei dati

### Presentazione del checkout operativo

Il checkout individuale `/ordina/checkout` riprende l'intestazione, le superfici e la gerarchia del carrello. Modalità, contatti, pagamento e riepilogo sono distinguibili. Ritiro/consegna e contanti/carta sono alternative visibili e utilizzabili da tastiera. L'indirizzo compare per la consegna; il telefono resta necessario per confermare. I contenuti commerciali continuano a provenire dal catalogo pubblicato.

Il blocco fisso mostra la stima dei prodotti prima della verifica e il totale autorevole dopo la risposta del servizio. La stima include le composizioni e non inventa consegna o benefici. Il prossimo passo è accesso, verifica o conferma; il motivo di un blocco è leggibile vicino all'azione. L'ospite può verificare il totale prima di accedere. Lo spazio finale permette di leggere e raggiungere l'intero form sopra blocco e navbar, anche su mobile.

La verifica non invia un ordine: annuncia l'attesa e sul successo porta il focus al riepilogo. La fascia prevista per «Appena possibile» è distinta dall'orario confermato dal servizio. Modificare modalità, indirizzo, fascia, note o benefici invalida il preventivo: il checkout spiega la necessità di verificare nuovamente. Lo stesso avviene se il catalogo cambia nelle condizioni rilevanti. I campi già compilati restano disponibili.

Un tentativo irrisolto o un pagamento carta precedente hanno precedenza sul nuovo invio. Il checkout permette di recuperare l'ordine originale anche a carrello vuoto, conservando identità del tentativo e autorità del servizio. Il totale zero verificato non raccoglie dati carta. Dopo successo resta «Segui l'ordine», senza aggiungere lo storico alla pagina. Requisiti e verifiche dell'incremento: [SDD checkout](../../design/2026-11-27-checkout-alignment/design.md); prove locali e online restano distinte.

Il cliente apre **Carrello** dalla navigazione o dal menu: `/ordina/carrello` mostra prodotti, personalizzazioni, note, quantità a passi, rimozione e svuotamento con la presentazione del POC. Diminuire da uno elimina la riga. Il carrello vuoto propone il menu senza accesso al checkout. I prodotti rimossi dal catalogo o esauriti restano visibili e rimovibili. La stima include le personalizzazioni correnti di Pizza e Menu; non aggiunge un costo di consegna fittizio. **Vai al checkout** apre `/ordina/checkout` con consegna e pagamento già aperti. Menu, carrello e checkout rileggono lo stesso draft locale; il preventivo server conferma disponibilità, benefici e importo da pagare.

Nel carrello operativo il fondo è uniforme a tutta larghezza, senza sfumature o rettangoli decorativi vuoti in fondo alla pagina; su desktop il contenuto conserva una larghezza di lettura limitata. Il totale stimato e il collegamento al checkout restano fissi sopra la navigazione inferiore durante lo scorrimento. Anche con molte righe, a fondo pagina il riepilogo e «Svuota carrello» sono leggibili e raggiungibili senza sovrapposizioni con il blocco checkout. Regressione locale: [suite browser del carrello](../../../tests/e2e/individual-cart.spec.ts), con viewport mobile e desktop; nessuna nuova evidenza online.

Il pagamento carta del pilota usa Stripe Elements e credenziali sandbox; non usa il pagamento simulato del POC. Il recupero del tentativo e la riconciliazione restano nel servizio: una risposta incerta non autorizza un secondo ordine. Dal menu, **Completa pagamento esistente** raggiunge il checkout per riprendere il pagamento sicuro anche a carrello vuoto. Le vecchie rotte `/cart` e `/checkout` in modalità operativa raggiungono le schermate corrispondenti; la sessione demo conserva l'isolamento POC. [Contratti e prove del carrello](../../design/2026-11-26-client-cart/design.md).

- `localStorage` conserva carrello, personalizzazioni, note, sede, modalità e slot. Non sincronizza il carrello su altri dispositivi e non è il registro autorevole degli ordini.
- Non memorizzare credenziali, segreti o dati della carta nel browser storage.
- Dopo l'invio, il client deve poter recuperare ordine e stato pagamento dal servizio anche dopo reload o perdita della sessione UI.
- Prima dell'invio, validare nuovamente prezzi, scorte e slot sul server; segnalare i conflitti e richiedere conferma del nuovo riepilogo quando cambia il totale.

## Aggiornamenti admin

La dashboard admin è il canale operativo per nuovi ordini e scadenze; si aggiorna tramite SSE con polling di recupero (D40/D54). I contatti per concordare alternative via email/WhatsApp sono avviati manualmente. Le email automatiche del lifecycle sono descritte nella [specifica email operative](operational-emails.md).

## Sottodomini delle sedi

Per D76, il superadmin usa **Profilo → Sottodominio ordini** creando una sede o modificando una sede senza indirizzo pubblico. Il campo accetta una sola etichetta, per esempio `lapizzaspeciale`. Dopo il salvataggio il profilo mostra il link. L'etichetta resta fissa per mantenere validi i link condivisi. Il servizio rifiuta etichette già assegnate, riservate, irregolari o impostate da un ruolo non autorizzato. Due salvataggi concorrenti per la stessa etichetta producono una sola assegnazione.

Il cliente ordina sul sottodominio della sede. Menu, disponibilità, storico cliente, eventi e wallet sono limitati alla stessa sede. Un carrello o un gruppo di un'altra sede viene rifiutato. Un host senza associazione mostra **Sito ordini non configurato**. La chiusura ordini della sede conserva il menu e mostra lo stato di sospensione. Google e link email concludono l'accesso nell'host della sede con cookie limitati a quell'host.

[Requisiti](../../design/2026-11-23-store-subdomains/store-subdomains/REQUIREMENTS.md) · [Test HTTP](../../../services/checkout-api/src/store-subdomains.test.ts) · [Prova browser](../../../tests/e2e/store-subdomains.spec.ts) · [Configurazione hosting](../architecture/pilot-deployment.md#sottodomini-delle-sedi).

## Indirizzo di consegna

Per la consegna, D77 introduce il campo **Indirizzo completo** anche per l’ospite. Digitando via, civico e comune si ottengono suggerimenti con priorità vicino alla sede scelta. È possibile identificare prima la via e completare il numero civico. La verifica del totale si abilita dopo la scelta di un indirizzo completo. Il servizio usa il punto restituito dalla ricerca per applicare le [fasce di distanza della sede](../../../services/checkout-api/README.md#persistence-and-scaling).

- Modificare il testo annulla la scelta e il preventivo precedenti. Il carrello conserva soltanto l’indirizzo selezionato. Gli indirizzi completi già salvati restano riutilizzabili.
- Se l’indirizzo è fuori zona, il servizio chiede di correggerlo o scegliere il ritiro. Se la ricerca non restituisce risultati, il campo invita a precisare via, civico e comune. In caso di errore si può ritentare la ricerca o passare al ritiro.
- Il servizio checkout gestisce Geoapify e la sua configurazione. La selezione non modifica la richiesta originale di un tentativo da recuperare.

[Requisiti](../../design/2026-11-23-delivery-address-autocomplete/delivery-address/REQUIREMENTS.md) · [Test HTTP](../../../services/checkout-api/src/delivery-address-http.test.ts) · [Percorso browser individuale](../../../tests/e2e/individual-ordering.spec.ts).

## Calendario e capacità

D75 estende D24 con una settimana tipo per sede, nel fuso della sede. Da **Profilo → Fasce orarie e capacità** il ristoratore imposta il massimo ordini di ogni finestra, modifica i bordi, unisce o divide fasce e copia un giorno sugli altri. Le otto fasce iniziali coprono 11:00–15:00 e 18:00–22:00 con 5 posti ciascuna. Un ordine individuale o di gruppo occupa un posto. Le finestre coprono ritiro e consegna. La gestione manuale delle eccezioni per data è un incremento separato.

- Il servizio propone oggi e i 13 giorni successivi. Una finestra in corso rimane selezionabile fino alla sua fine. Quando termina, esce dall'elenco. Quando si esaurisce, rimane visibile come **Al completo** e la selezione è disabilitata.
- **Appena possibile** prende la prima finestra ancora aperta con posti. Un conflitto sull'ultimo posto aggiorna le opzioni, conserva il carrello e richiede una nuova scelta. L'ordine conserva gli estremi della finestra verificata.
- All'attivazione, e quando si modifica la settimana tipo, le date interessate che hanno ordini assegnati o riserve in pagamento conservano gli orari e le capacità precedenti fino a fine giornata. Il pannello elenca quelle date. Ordini già assegnati a un orario puntuale conservano quell'orario nello storico.

[Requisiti del calendario](../../design/2026-11-23-order-calendar/calendar/REQUIREMENTS.md) · [Prove del servizio](../../../services/checkout-api/src/order-calendar.test.ts) · [Percorso browser](../../../tests/e2e/order-calendar.spec.ts).

## Decisioni e fonti correnti

Le regole del flusso sono approvate da D18/D49, D27/D42/D50, D24/D41/D51, D23/D52, D17/D30/D40/D54 e D28/D29/D55, integrate da gruppo/promozioni/email D61–D69 e dalle successive decisioni menu/calendario. L'esclusione iniziale di queste estensioni dal primo incremento non è più un limite del flusso corrente. Gli abbonamenti restano esclusi. D16/D31 continuano a riguardare l'avvio in esercizio.

La [configurazione sede](store-configuration.md) descrive il salvataggio concorrente: una bozza precedente a consumo scorte, pubblicazione o altra modifica non può sovrascrivere lo stato canonico. I controlli di versione sono verificati localmente; il [registro online](../../../services/checkout-api/online-deployment.md) distingue i rilasci effettivi. [SDD storico individuale](../../design/2026-11-05-individual-ordering/design.md).

## Casi limite e verifiche

La [diagnostica backend D73](backend-observability.md) aggiunge correlazione `requestId`, 500 `internal_error` e 503 per dipendenze temporanee. Un errore tecnico durante checkout non autorizza un nuovo tentativo di pagamento: recuperare sempre l'ordine/idempotency key esistente. Le verifiche HTTP distinguono firma webhook errata da guasto dopo verifica; la diagnostica dei pagamenti incerti conserva stato pending e unicità dell'ordine. [Test operativi indipendenti](../../../services/checkout-api/src/diagnostics-operational.acceptance.test.ts).

Questi scenari restano requisiti di regressione; l'elenco non certifica che ogni variante sia verificata online.

- Login completato in una nuova scheda o su dispositivo diverso da quello del carrello.
- Prezzo, ingrediente o slot cambiato durante il login.
- Reload durante autenticazione, pagamento o attesa 3DS.
- Doppio invio o retry di rete: una sola creazione ordine e un solo addebito.
- Carta rifiutata, 3DS abbandonato, servizio pagamenti non raggiungibile, pagamento riuscito ma risposta persa.
- Rifiuto esplicito e annullamento automatico allo scadere del timeout.
- Ordine in attesa di alternativa, sostituzione concordata via email/WhatsApp e ricreazione del carrello da ordine annullato.

Verifiche pertinenti: [servizio ordini](../../../services/checkout-api/src/ordering-service.test.ts), [recupero client](../../../apps/client/src/test/individual-recovery.test.tsx), [draft](../../../apps/client/src/test/individual-draft.test.ts) e [browser individuale](../../../tests/e2e/individual-ordering.spec.ts). [Strategia e prerequisiti dei test](../../../docs/testing/strategy.md). La prova su dispositivi fisici distinti resta aperta nel verbale online.


## Dettagli confermati di checkout

Draft locale per 7 giorni dall'ultima modifica; leggere o autenticarsi non rinnova la scadenza. Quantità, personalizzazioni, note, sede, modalità, slot e indirizzo scelto sono dati browser-owned; credenziali, contatti ordine e dati pagamento non vengono memorizzati nel draft. Metadati di recupero del tentativo (identificatore/chiave, senza segreti) consentono retry sicuro.

Lo stato dopo l'invio è recuperato dal servizio. Ordine annullato e rimborso sono stati distinti: l'interfaccia mostra in corso/fallito/eseguito secondo conferma provider. L'operatore può ritentare un rimborso fallito senza riaprire l'ordine. Una perdita di connessione non autorizza un nuovo addebito.

Il [recupero delle personalizzazioni obsolete](menu-ordering.md#recupero-delle-personalizzazioni-obsolete) propone la rimozione delle opzioni non più offerte senza salvare finché il cliente non conferma. La conferma modifica il draft, non riserva scorte e non sostituisce il preventivo server. Se il catalogo cambia dopo il riepilogo, il checkout richiede una nuova verifica. Ordini esistenti e tentativi incerti conservano rispettivamente snapshot acquistato e richiesta originale.

## Pagina Ordini cliente
La navigazione inferiore apre `/ordina/ordini`, una pagina dedicata con intestazione e storico compatto del POC. Ogni ordine in corso mostra stato server, timeline per consegna/ritiro, prodotti e totale acquistati; i terminali e i pagamenti falliti sono nello storico con dettagli e **Riordina**. Sono raggiungibili più ordini attivi. Il catalogo corrente non riscrive prezzi o composizioni già acquistati. Non sono inclusi tracking GPS, stime di arrivo simulate, feedback o centro notifiche.

L'ospite vede l'invito ad accedere, con ritorno alla pagina Ordini. Caricamento, assenza ordini, errore e riprova sono espliciti. La revoca della sessione elimina i dati riservati dalla vista. Aggiornamenti SSE/polling e **Aggiorna ordini** rileggono il servizio senza avanzamenti locali né perdita delle note in bozza. Un errore transitorio conserva l'ultima lettura; una risposta precedente non sovrascrive quella nuova.

Le note restano modificabili prima della preparazione; l'annullamento cliente è disponibile soltanto prima dell'accettazione. Le aggiunte conservano preventivo e pagamento canonici, con le preferenze alimentari dell'account. Pagamento in verifica e rimborsi in attesa, falliti o completati restano distinti dall'avanzamento ordine. **Verifica pagamento** riconcilia il tentativo; **Completa pagamento esistente** apre il checkout con il riferimento dell'ordine, senza generare un nuovo checkout.

**Riordina** ricrea il draft operativo con quantità e personalizzazioni acquistate e note correnti, senza la fascia precedente, benefici commerciali o prodotti segnalati indisponibili. Un pagamento incerto o un tentativo persistito blocca la scrittura; il catalogo corrente e il preventivo successivo confermano disponibilità e prezzi. Non viene inviato alcun ordine automaticamente. Il link **Vai al carrello** appare solo dopo il salvataggio riuscito; errori storage non dichiarano il successo.

Conferme individuali e gruppo raggiungono la pagina dedicata. Le vecchie ancore `/ordina#i-tuoi-ordini` e `/ordina#ordine-ID` vengono normalizzate mantenendo il riferimento; `/orders` in modalità live raggiunge la pagina operativa, mentre la demo conserva il proprio schermo e repository locali. Reload e cronologia mantengono la sezione corretta.

Verifica locale: [contratto della schermata](../../../apps/client/src/test/operational-orders.test.tsx), [browser con servizio isolato](../../../tests/e2e/customer-orders.spec.ts), `pnpm exec playwright test --config playwright.customer-orders.config.ts`. Prove locali e stato online restano distinti.
