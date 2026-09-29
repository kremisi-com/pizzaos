# Ordinazione cliente e pagamento

## Stato della specifica

Versione iniziale del flusso pilota. Le decisioni approvate sono nel registro [`../decisions.md`](../decisions.md). Le parti dipendenti da decisioni aperte sono bloccate come indicato sotto.

## Obiettivo

Consentire al cliente di comporre un ordine come ospite, autenticarsi al termine senza percepire interruzioni, pagare e seguire l'accettazione del ristorante. Il carrello deve sopravvivere a un reload; ordine e pagamento confermati devono essere recuperabili dallo stato autorevole del servizio.

## Percorso approvato

1. Il cliente sceglie sede, modalità (consegna o ritiro), menu, prodotti, personalizzazioni e slot. Può iniziare senza autenticarsi.
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

- `localStorage` conserva carrello, personalizzazioni, note, sede, modalità e slot. Non sincronizza il carrello su altri dispositivi e non è il registro autorevole degli ordini.
- Non memorizzare credenziali, segreti o dati della carta nel browser storage.
- Dopo l'invio, il client deve poter recuperare ordine e stato pagamento dal servizio anche dopo reload o perdita della sessione UI.
- Prima dell'invio, validare nuovamente prezzi, scorte e slot sul server; segnalare i conflitti e richiedere conferma del nuovo riepilogo quando cambia il totale.

## Aggiornamenti admin

La dashboard admin è il canale operativo per nuovi ordini e scadenze; deve aggiornarsi senza reload quando possibile tramite stream/socket. La scelta di trasporto e fallback è aperta in D40. Le notifiche esterne non fanno parte del comportamento deciso.

## Decisioni che bloccano la specifica eseguibile

- D48: durata del carrello locale e comportamento quando il server rifiuta prezzo/stock/slot.
- D18: carta rifiutata, pagamento pendente e rimborso fallito.
- D40: trasporto live e fallback della dashboard.
- D25/D26: coupon e abbonamenti quando incidono sul totale.

## Casi da specificare

- Login completato in una nuova scheda o su dispositivo diverso da quello del carrello.
- Prezzo, ingrediente o slot cambiato durante il login.
- Reload durante autenticazione, pagamento o attesa 3DS.
- Doppio invio o retry di rete: una sola creazione ordine e un solo addebito.
- Carta rifiutata, 3DS abbandonato, servizio pagamenti non raggiungibile, pagamento riuscito ma risposta persa.
- Rifiuto esplicito e annullamento automatico allo scadere del timeout.
- Ordine in attesa di alternativa, sostituzione concordata via email/WhatsApp e ricreazione del carrello da ordine annullato.

