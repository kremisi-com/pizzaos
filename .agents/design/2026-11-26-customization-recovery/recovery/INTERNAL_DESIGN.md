# Disegno interno

Normalizzare le scelte soltanto nella proposta degli editor, filtrando ID non presenti, indisponibili o non più associati ai gruppi correnti. Confrontare scelte originali/locali con proposta per mantenere l'avviso fino a chiusura; nessun salvataggio in effect. Validazione e prezzo usano i resolver pubblici esistenti. Righe nuove conservano i default, righe esistenti non ricevono sostituzioni.

Un helper client riutilizzabile attraverso l'entry pubblico della customization può esporre la proposta per editor pizza e generico senza dipendenze circolari. I metadati di avviso sono effimeri, mai fidati nel servizio. Stato locale conserva scelte richieste e note; l'intersezione col catalogo corrente viene ricalcolata durante aggiornamenti. Le scelte eliminate non devono riapparire durante interazioni successive.

Aprire/focalizzare la prima sezione obbligatoria incompleta e rendere visibili Impasto/Formato anche con una sola alternativa se la scelta è mancante. Per il Menu localizzare fase non valida, mantenendo selezioni valide e chiedendo correzione esplicita delle altre. Attivare editor dai caller anche se opzioni correnti sono vuote ma la riga contiene scelte.

Checklist: avviso; conferma unica con prezzo; annulla senza scrivere; nessuna mutazione; note/quantità preservate; obbligatorie senza default; refresh a editor aperto; tutti i caller; permessi gruppo; server autorevole; riordino/snapshot/idempotenza; POC invariato; nessuna migrazione.
