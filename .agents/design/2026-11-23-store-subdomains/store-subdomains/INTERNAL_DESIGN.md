# Disegno interno

- Il campo opzionale del catalogo è salvato nella stessa transazione PostgreSQL di creazione o configurazione. La transazione controlla unicità, nomi riservati e stabilità.
- Il proxy Next inoltra l'origine canonica ricostruita dall'host e il segreto server. Il servizio ammette le origini statiche esistenti e risolve quelle dello spazio cliente su un'associazione persistente.
- Il confine HTTP di sede usa una lista di API cliente e lega gli identificativi alla sede prima di chiamare i servizi esistenti. Usa la vista pubblica del catalogo e filtra storico ed eventi per cliente e sede. Gli endpoint admin e rider restano esclusi.
- La callback Google usa il supporto redirect proxy del provider Auth.js sulla sola origine client canonica e sui siti di sede. La demo resta sull'origine canonica.
- Il layout cliente mostra lo stato non configurato in caso di 404 e i componenti di ordinazione omettono la scelta su un sito di sede.
