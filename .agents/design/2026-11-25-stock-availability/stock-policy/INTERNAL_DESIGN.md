# Implementazione

- Aggiungere outOfStockBehavior opzionale a IndividualStore e soldOut opzionale a IndividualProduct. Validare i tre valori, preservare campo su aggiornamento omesso e includerlo nel confronto Profilo della composizione.
- Owner servizio: modulo stock-availability per scorta non tracciata, policy, ingredienti zero e ricette effettivamente tracciate. Le scorte positive continuano a usare riserve. Quote conserva ricetta completa nel fingerprint, ma restituisce ai consumer di riserve solo le quantità tracciate, così rifornimento/cambio policy non consuma le vecchie righe accettate con null/zero.
- Proiezione pubblica differenzia esaurito da indisponibile manuale. Hide filtra prodotti e opzioni zero, pulisce riferimenti a prodotti/gruppi. Allow non trasforma in available un prodotto manualmente disabilitato. Quote controlla le scorte zero anche sulle ricette standard prima di risolvere rimozioni per mantenere coerenti menu e carrelli precedenti.
- Pubblicazione controlla dosi, riferimenti e prezzi, senza richiedere stock. Quantità nulle di ricette restano incomplete. Ingredienti mancanti restano errori.
- Profilo selettore persistente; admin Menu alert sui nomi zero in allow. Client usa soldOut per Esaurito. La policy non entra nella bozza menu.
- Test indipendenti prima del codice; aggiornare i test precedenti che assumono null bloccante o extra zero sempre nascosti, con le nuove aspettative approvate.

Checklist: null pubblicabile/ordinabile; zero tre modalità; default disable; configurazione concorrente e permessi; alert solo admin; nessuna giacenza negativa o consumo retroattivo; positive e riserve protette; dosi/ID invalidi ancora bloccanti; flussi individuali e gruppi condividono la validazione; verifiche di tutte le superfici e documentazione.
