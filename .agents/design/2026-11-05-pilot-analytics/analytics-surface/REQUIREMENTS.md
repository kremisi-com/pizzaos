# Pannello admin

1. PilotAnalyticsPanel riceve storeId e un port report asincrono. Al montaggio e al cambio sede carica today. Non legge mock, storage browser o database.
2. UI interamente italiana: titolo Vendite e ordini; cinque indicatori/presentazioni corrispondenti al rapporto. Valori EUR formattati in italiano. Non etichettare vendite come utile/incassi. Visualizzare fuso della sede.
3. Una select Periodo offre Oggi, Ultimi 7 giorni, Ultimi 30 giorni, Intervallo personalizzato. Selezionando un periodo predefinito lo carica subito. custom espone Dal e Al di tipo date e pulsante Applica; non richiedere un custom incompleto. Richiesta custom con entrambe date e ordine invertito viene impedita con messaggio italiano.
4. Durante il caricamento mostra Caricamento statistiche… e non presenta il vecchio rapporto come appartenente alla nuova sede. L'ultimo risultato richiesto vince; una risposta lenta per la sede precedente non sovrascrive quella attuale.
5. Errore produce messaggio Impossibile caricare le statistiche. e pulsante Riprova. Nessuna stacktrace o messaggio tecnico server. Il retry ripete l'ultima interrogazione valida della sede attuale.
6. Nessun dato: metriche zero e Nessun prodotto venduto nel periodo. Nessun grafico sintetico, insight AI o esportazione.
