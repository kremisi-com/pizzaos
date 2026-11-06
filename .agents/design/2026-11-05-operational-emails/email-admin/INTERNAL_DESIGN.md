# Implementazione UI

Feature nuova app-local con CSS Module operativo. Adapter porta solo GET. Composizione crea una istanza stabile e monta panel con key storeId. Feature fetch/poll3s e refreshVersion, request sequence+cleanup, dati etichettati con sede per non mostrare snapshot precedente. Nessun form di invio, configSMTP o pulsante failuretest.

Lista articoli server con labelstato/evento, date italiane, destinatario e prossimo retry. Ultimo errore pubblico già sanitizzato; UI non stampa oggetti JSON/exceptionmessage. Fallbackcontrollato per status sconosciuto? Tipi unione, typecheck esaustivo. Errori di lettura tengono chiaro che non è aggiornato e bottone riprova; nessuno stato locale avanza email a sent. Empty-state solo dopo risposta valida vuota.

Checklist: ownership e port pubblici; ownstore; tutti stati/eventi; sanitizzazione; polling/riprova/sede; ordine operativo resta sano; browser failure/retry e screenshot; lint/typecheck/build; nessun invio reale o azioni nonautorizzate.
