# Confronto atomico

Calcolare un digest canonico della configurazione persistita, ordinando ricorsivamente le chiavi oggetto e omettendo i campi di sola proiezione. Nessun contatore da aggiornare manualmente in tutti i percorsi di consumo/importazione/pubblicazione; nessuna migrazione.

La vista operatore genera il token dopo l'eventuale attivazione del calendario e prima di proiettare le capacità residue. Il confronto avviene nella transazione serializzata di saveStore, dopo autorizzazione e prima di mutazioni. Per la creazione accettare assenza del token. Escludere il token dai dati salvati e dalla vista pubblica. Restano validazioni scorte/indirizzo/calendario/menu.

Il merge admin ignora la chiave di versione fra i campi modificati e conserva quella del catalogo riletto. Non ritentare automaticamente una PUT conflittuale. Adeguare i fixture che aggiornavano una sede da dati privi di versione affinché simulino una lettura operatore.

Checklist: creazione e dati legacy; autorizzazioni; conflitti atomici senza effetti; consumi; stabilità JSONB/riavvio; proiezione privata; calendario/menu; merge e conservazione bozza.
