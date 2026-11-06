# Design interno

Persistenza locale del tentativo con richiesta originale priva di dati carta, legata ad attore e chiave; retry identico dopo errore rete e ripristino dopo reload. Rimuovere tentativo solo dopo riscontro autorevole di invio/fallimento definitivo, mai per errore rete. Bloccare nuove richieste finché il tentativo precedente non viene chiarito. Mantenere la chiave anche in memoria se storage indisponibile.

Catalogo ricaricato su refreshVersion con protezione della richiesta obsoleta; invalidazione del preventivo quando il catalogo cambia, senza cancellare righe. Checklist: R1 recupero + nuovo ordine, R2 rete incerta protetta, R3 menu/slot live e preventivo invalidato, R4 selezione sede e errori.

Implementazione: `checkout-attempt.ts` serializza solo account, chiave e input originale con schema versionato; il telefono fa parte della richiesta idempotente, non del draft. Il risultato del checkout non viene serializzato, salvo l'identificativo ordine necessario per associare il recupero pagamento. Gli esiti economici definitivi liberano il tentativo solo se non è già stato ricevuto un ordine. Le risposte perdute e gli errori del recupero mantengono il tentativo. I record precedenti che contengono solo la chiave restano bloccanti e richiedono verifica con il ristorante: ricostruire una richiesta dal draft corrente introdurrebbe un conflitto o un duplicato.

Il recupero non avvia una nuova conferma Stripe. Se il servizio restituisce un pagamento ancora aperto, si usano le azioni di recupero pagamento già esistenti. Il carrello viene svuotato solo se coincide con quello inviato; un draft successivo resta disponibile. Ref sincroni conservano tentativo e carrello anche senza storage.

Il refresh catalogo confronta prodotti, ingredienti, fasce, accettazione ordini e condizioni di consegna prima di invalidare il preventivo; gli eventi ordine con catalogo invariato non disturbano il riepilogo. La pulizia dell'effetto scarta le risposte superate, anche fra sedi diverse; una revisione locale impedisce che un preventivo in volo ripristini un riepilogo invalidato.
