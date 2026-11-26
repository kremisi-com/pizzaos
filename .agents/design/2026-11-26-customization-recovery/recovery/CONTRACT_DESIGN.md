# Contratti pubblici

Le firme componenti restano quelle esistenti. Lo stub `contracts.d.ts` riporta i port di interazione senza corpi. `IndividualLine`, `IndividualProduct`, `IndividualStore`, `IndividualCart`, `GroupOrderingApi` e `IndividualApi` rimangono i contratti pubblici di `@pizzaos/domain`; nessun nuovo campo persistente.

`useSelectionRecovery(product, initial)` è esportato dall'entry customization per gli editor client: restituisce scelte correntemente offerte, setter locale, indicazione di recupero e messaggio accessibile; non muta input, non applica alternative automatiche e non salva presso il chiamante. Le scelte obsolete eliminate dalla proposta non vengono reintrodotte da successivi refresh; l'avviso rimane fino alla chiusura/conferma dell'editor.

- `MenuLineEditor`: apre l'editor adatto al prodotto; `onSave` viene chiamato soltanto da una conferma valida. `onSave` riceve una nuova riga, non muta la riga iniziale; chiusura/escape non chiamano `onSave`. Le scelte obsolete vengono rimosse dalla proposta con avviso, prezzo e azione «Conferma modifica».
- `LivePizzaEditor`: stesse garanzie anche quando `product` cambia durante l'apertura. Mantiene quantità, note e scelte valide, non applica default sostitutivi alle righe esistenti. Se manca un impasto obbligatorio apre la relativa sezione e mostra anche l'unica alternativa disponibile.
- `IndividualCartScreen`: `onChange` riceve il carrello aggiornato solo dopo conferma; apre la modifica anche se la riga conserva opzioni che il prodotto non offre più.
- `MealConfigurationDialog` (percorso invocato da MenuLineEditor): fase obsoleta da correggere, senza reset delle fasi valide e senza sostituzioni automatiche.

Esempio: riga con `optionIds: ["extra-rimosso"]`, quantità 2 e note «Ben cotta», catalogo senza opzioni → editor accessibile, avviso di rimozione, prezzo per 2 prodotti. Chiudi → zero callback. «Conferma modifica» → riga con array scelte vuoto, quantità 2 e stesse note.

Precondizioni: catalogo pubblico corrente e callback del chiamante. Postcondizioni: la composizione confermata è valida sul catalogo mostrato; ogni rimozione automatica è comunicata; una composizione obbligatoria incompleta non viene salvata. La validità locale non sostituisce quella server.

Contratti server invariati: quote restituisce fingerprint; checkout confronta il preventivo nella transazione prima di creare ordine/riserve/idempotenza, rifiutando conflitti tipizzati. GroupOrderingApi usa revisioni e conserva il tentativo originale. Ordini creati conservano snapshot e prezzi senza dipendere dal catalogo corrente.

L'agente test consulta questi requisiti e contratti, firme pubbliche e fixture/test esistenti; non legge INTERNAL_DESIGN né i corpi dell'implementazione interessata.
