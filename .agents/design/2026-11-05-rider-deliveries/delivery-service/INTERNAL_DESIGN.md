# Disegno interno

Usare il repository JSON canonico tramite intersezione locale `DeliveryOrderingState`, senza cambiare il contratto base durante la lavorazione parallela. Inizializzare pigramente `delivery` soltanto nelle scritture; letture e guard usano collezioni vuote per documenti precedenti. Le email vengono normalizzate e i rider conservati separatamente dalle memberships operatore.

Le autorizzazioni operatore consultano le memberships esistenti o l'elenco superadmin. Le autorizzazioni rider risolvono l'assegnazione per orderId, il rider attivo e l'email dell'attore verificato. I DTO sono costruiti esplicitamente e copiati. Non serializzare l'ordine originale.

Assegnazione ammessa soltanto su delivery pronti/in consegna. Il problema è una mappa separata per ordine: segnalazione non modifica lo stato ordine; riassegnazione lo rimuove. Incrementare revisione ordine e cursor con evento canonico quando assegnazione/problema cambiano. Modifiche anagrafiche rider non cambiano ordine o privilegi operatore.

Dispatch/complete eseguono controllo preliminare e chiamano il gateway canonico fuori dalla transazione preliminare. Il gateway, integrato dal coordinatore, deve chiamare `isRiderProgressAllowed` nella transazione che muta l'ordine; la prelettura serve solo a fornire errori chiari. Nessuna duplicazione delle transizioni, stock, pagamenti o rimborsi.

Checklist: separazione ruoli; isolamento sede/rider; DTO minimo; invito idempotente; revoca immediata; ordine aperto su problema; nuovo tentativo tramite riassegnazione; guard atomico; eventi e copie; nessun import inter-app; nessun provider nel DTO; gateway canonico per contanti/scorte.
