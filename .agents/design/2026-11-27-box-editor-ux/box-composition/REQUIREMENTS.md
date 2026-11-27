# Requisiti proposti — composizione Box

Da confermare prima dei test e dell'implementazione insieme al design generale.

- R1. La Box distingue contenuto sempre incluso e scelte del cliente; Pizza, Panino, Prodotto e Menu mantengono il comportamento corrente. Le voci incluse provengono dal Magazzino, non dai prodotti del catalogo.
- R2. Con Apribottiglie incluso, tre birre obbligatorie e ripetizioni consentite, l'operatore legge tutte queste regole senza aprire il gruppo. Due alternative e nessuna ripetizione devono risultare distinguibili da tre alternative ripetibili.
- R3. Il contenuto fisso può essere vuoto. Selezionare o rimuovere una voce aggiorna la bozza secondo D86: una unità per selezione, null conservati secondo le regole correnti. La visualizzazione non modifica alcuna dose.
- R4. L'operatore crea, modifica e rimuove gruppi selection; imposta quantità esatta o intervallo, ripetizioni e alternative. Esempi: esatta 3 equivale a min=3/max=3; facoltativa fino a 2 equivale a min=0/max=2. Limiti incoerenti sono correggibili e non presentati come validi.
- R5. Scegliendo una voce del Magazzino per una nuova alternativa, l'operatore verifica e conferma nome, composizione e supplemento. Il prezzo di vendita o di extra del Magazzino non diventa automaticamente il supplemento. Annullare prima della conferma non crea un'alternativa parziale.
- R6. Le alternative mostrano nome e supplemento; l'operatore può aprire i dettagli e modificare descrizione, ingredienti e rimozioni. Un'opzione con due ingredienti e una rimozione conserva questi dati dopo apertura/chiusura e modifica del solo nome.
- R7. Gruppi preesistenti non-selection e opzioni precedenti senza gruppi mantengono dati e possibilità di modifica. Nessuna conversione o eliminazione implicita. I riferimenti mancanti devono essere riconoscibili e correggibili.
- R8. Apertura/chiusura, ricerca e navigazione non salvano modifiche. Testi e numeri seguono il salvataggio su blur; le azioni seguono il flusso corrente. Errori o conflitti non scartano la bozza locale.
- R9. Tastiera e lettori di schermo raggiungono comandi e dettagli; chiudere un controllo restituisce un focus sensato. Non compaiono scorrimenti orizzontali o controlli irraggiungibili.

Testare anche Magazzino vuoto, filtro senza risultati, più gruppi con regole diverse e chiusura/riapertura della scheda.
