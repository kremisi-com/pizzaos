# Disegno interno

- `schema.sql` aggiunge un UUID sulla riga esistente, con default anche sui nuovi inserimenti. Un trigger `BEFORE UPDATE OF snapshot` lo sostituisce per ogni scrittura, incluse quelle del binario precedente. Non usare `cursor`, che non rappresenta tutte le mutazioni, o un contatore che possa ripartire allo stesso numero dopo la sostituzione della riga.
- `BEGIN` in `READ COMMITTED`. `SELECT … FOR UPDATE` restituisce UUID e, con `CASE`, il JSON solo se l'UUID differisce dalla copia locale. La versione e il JSON provengono dalla stessa valutazione della riga sotto lock. Se manca la riga, inizializzare con `INSERT … ON CONFLICT DO NOTHING` e ripetere la lettura in una nuova istruzione. La cache è di una sola versione per repository. Tenere un riferimento locale alla coppia già passata alla query per associare correttamente la risposta anche con invocazioni concorrenti.
- Usare una stringa JSON locale immutabile, ricavata da una lettura del database. Ogni callback riceve un oggetto indipendente; serializzare il risultato dello stato e confrontarlo con l'originale prima di decidere l'update. Pubblicare in cache solo le letture confermate, dopo il commit. Dopo una propria scrittura il primo lettore rilegge la rappresentazione normalizzata da JSONB. Conservare l'errore originale e scartare la connessione quando il rollback non riesce. Una copia disponibile non esenta mai dalla verifica nel database.

## Checklist

- [x] Schema additivo ripetibile su dati legacy, anche con vecchi writer.
- [x] Verifica di freschezza sotto lock, rollback e risultati staccati.
- [x] Lettura condizionale e niente update per JSON identico.
- [x] Confronto dei byte in entrambi i versi su database locale isolato.
- [x] Suite di checkout, client e confini passano con contratti invariati.
