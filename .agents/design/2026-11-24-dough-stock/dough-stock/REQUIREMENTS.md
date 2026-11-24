# Comportamento osservabile

- In Menu compare Impasti e formati. Non compaiono Basi, Ricette e dosi dal Magazzino, né le due frasi introduttive indicate dall'utente.
- Ogni impasto associa una sola voce esistente del Magazzino tramite selezione filtrabile; scegliere un'altra voce sostituisce la precedente.
- Ogni formato indica una quantità intera positiva da scalare dalla voce dell'impasto scelto dal cliente. Non moltiplica condimenti o extra.
- Esempio: Classico → panetto-classico, Integrale → panetto-integrale; Tonda = 2, Maxi = 3. Integrale/Maxi consuma 3 panetti integrali e zero classici. Pomodoro incluso con dose 1 resta 1. Due pizze consumano 6 panetti integrali e 2 pomodori.
- Cambiare impasto o formato aggiorna i consumi senza duplicare contributi; i prezzi mantengono i supplementi rispetto allo standard.
- Associazione o quantità non compilate sono salvabili in bozza; riferimenti inesistenti, quantità zero/negative/frazionarie/non finite sono rifiutati. Dati mancanti e scorte ignote bloccano la pubblicazione. Scorte insufficienti bloccano l'ordine.
- Le basi precedenti non sono più scelte del cliente nelle nuove configurazioni: la ricetta della base standard diventa normale ricetta inclusa, conservata senza doppio consumo e modificabile come gli altri ingredienti. Le formule possono conservare questi ingredienti senza diventare gusti.
- Conversione idempotente, input non mutato, prezzi e identità conservati. Snapshot storici e menu già pubblicati restano leggibili; il cambiamento della bozza vale dopo pubblicazione.
- Il catalogo pubblico conserva ingredienti/allergeni e omette le dosi di magazzino. Il backend ricompone consumi e riserve dalla sorgente, senza fidarsi delle proiezioni del browser.
