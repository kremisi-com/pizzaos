# Conferma delle personalizzazioni obsolete

Andrea approva la correzione delle scelte obsolete con un solo passaggio di conferma, senza modali aggiuntive: proposta locale, avviso visibile e «Conferma modifica» con prezzo corrente. La chiusura senza conferma conserva la riga originale. Una scelta obbligatoria mancante richiede un'alternativa esplicita, senza sostituzioni standard automatiche. Restano esclusi i cambi di significato di un'opzione con lo stesso identificativo.

Owner: app client per interazioni di modifica; domain per validazione pubblica delle composizioni; checkout-api per quote, revisioni gruppo, transazioni, scorte, idempotenza e snapshot ordini. I controlli server esistenti restano autorevoli: il carrello non prenota scorte e la conferma della riga non garantisce il checkout successivo. Non servono nuove tabelle o migrazioni.

Un incremento copre gli editor condivisi e i rispettivi caller (individuale, contributo proprio gruppo e aggiunte), conservando isolamento demo e regola dei contributi altrui. Le opzioni assenti o esaurite vengono escluse soltanto dalla proposta nell'editor; restano in bozza fino alla conferma. Il riepilogo evidenzia la correzione, anche dopo la scelta di un'alternativa richiesta. Il Menu a fasi conserva le scelte valide e richiede correzione delle fasi obsolete.

Il checkout continua a confrontare il preventivo corrente e a creare ordine/riserve/idempotenza atomicamente. Esiti incerti recuperano il tentativo originale; gli ordini creati conservano lo snapshot acquistato. Si verificano queste invarianti attraverso le suite esistenti, aggiungendo copertura soltanto per lacune pertinenti.
