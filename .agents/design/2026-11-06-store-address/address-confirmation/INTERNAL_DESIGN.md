# Implementazione

- Adattatore OpenCage con timeout, risposta minima e filtro per indirizzi con civico o edificio. Chiave opzionale solo nel runtime checkout, nessuna richiesta al provider dai test.
- Conferma firmata con HMAC, scadenza e vincoli su attore, sede e posizione precedente. Validare nel salvataggio transazionale; il provider viene interrogato fuori dalla transazione.
- Salvare la stringa opzionale nel record della sede già persistito in JSON. Nessuna migrazione SQL. Continuare a usare le coordinate canoniche e le stesse regole di consegna.
- Il form separa query e risultato confermato. Ignora risposte di ricerche superate. Passa al salvataggio il token del risultato scelto.
- Verificare scelta, salvataggio e rilettura, permessi e integrità della conferma, errore e retrocompatibilità.
