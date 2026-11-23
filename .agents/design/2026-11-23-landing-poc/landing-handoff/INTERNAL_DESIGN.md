# Disegno interno

La route landing legge e convalida il form attraverso il flusso esistente. Solo il ramo successo demo chiama il firmatario server con le due destinazioni configurate. Il messaggio del provider rimane invariato. Un componente React usa il pass restituito nel corpo di una form POST e mantiene il link manuale come fallback. La landing non ha accesso alla password del servizio o al segreto dei proxy.

I proxy mantengono il controllo Origin usuale per tutte le mutazioni. Per il solo percorso POST di handoff passano al backend l'header Origin effettivo, con credenziali e destinazione impostate dal proxy. Il proxy rider blocca tutte le rotte demo. Il servizio compara firma, scadenza, destinazione ed origine e usa lo stesso rilascio di cookie del login manuale. I log non contengono i pass o i campi dei form.

Controllare invio valido, contatto, errore, assenza configurazione, due destinazioni, pass alterato/scaduto, isolamento app/rider e pagina finale senza password.
