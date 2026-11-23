# Design interno

- Il servizio chiama l’endpoint autocomplete Geoapify con timeout, lingua italiana e priorità vicino alla sede caricata dal catalogo. Scarta coordinate fuori intervallo, risultati estranei e duplicati. Espone indirizzi civici e nomi di vie distintamente.
- Il componente riusabile conserva il testo parziale in memoria. Ritarda le chiamate e cancella la richiesta precedente quando cambia il testo o il campo viene chiuso. Il carrello riceve punti solo dalla scelta di un civico. Il controllo per la sola via sposta il cursore prima della località per aggiungere il numero.
- Controlli: ricerca ospite, completamento con puntatore e tastiera, esito vuoto, indisponibilità, cambio del testo dopo la scelta, preventivo individuale e gruppo, ritiro e recupero invariati.
