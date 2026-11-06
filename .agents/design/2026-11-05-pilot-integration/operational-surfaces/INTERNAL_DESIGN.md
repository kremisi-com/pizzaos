# Disegno interno viste

Adapter fetch con credentials same-origin, cache no-store, risposte errore normalizzate. Riutilizzare il proxy /api/pilot per tutte le nuove route, mantenendo namespace /v1/pilot.

Integrare analytics e gestione rider nella shell operativa tramite sede selezionata; non importare composizione dentro le feature. Il wrapper server OperationalPage dell'incremento domini D71 sceglie l'accesso operatore/rider senza attribuire privilegi; non mantenere un secondo controllo duplicato nella composizione client. Il form accesso server sceglie returnTo da area esatta rider o dall'host verificato, nessuna URL arbitraria.

Checklist: sede corretta, port stabile, errori/stati accessibili, nessun mock live, ruoli distinti, polling con cleanup, sessione autenticata, timezone modificabile.

DeliveryAssignmentsPanel usa un sotto-componente keyed storeId per azzerare immediatamente lo stato al cambio sede. Un effetto ricarica riders/assignments in parallelo quando cambiano api, refreshVersion o un contatore reload. Cleanup scarta risposte obsolete. Un ref di esclusione garantisce una sola mutazione in corso anche prima del render disabilitato; ref di vita e generation impediscono aggiornamenti dopo smontaggio. L'operazione riuscita notifica onChanged e ricarica il server, senza creare assegnazioni ottimistiche. La selezione rider è per ordine e preserva esplicitamente la possibilità di riassegnare lo stesso rider per riprovare.
