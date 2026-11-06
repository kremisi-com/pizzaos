# Ingressi admin e rider per dominio

D71 confermata il 2026-11-05. Un solo progetto frontend `apps/admin` serve gli ingressi operatore e rider. Il dominio sceglie l'esperienza, mentre il servizio mantiene l'autorità su identità, sedi e assegnazioni.

Il lavoro riguarda routing per host, accesso dedicato, proxy same-origin e verifica dei permessi già esistenti. Non modifica appartenenze o persistenza né crea un quarto frontend. DNS, associazione Vercel e HTTPS si verificano separatamente dall'implementazione locale. Dopo il collegamento dell'account corretto Development Kremisi, entrambi i domini sono verificati sul progetto `pizzaos-admin` di `kremisis-projects`. L'utente conferma che il backend è ancora da pubblicare: il nuovo frontend non viene rilasciato sopra la versione esistente prima che accesso e servizio siano configurati.

## Verifica

Test indipendenti dal contratto pubblico, poi implementazione, lint/typecheck/test/build admin e architecture check. Test browser con due host locali e servizio di prova separato: ingresso e login corretti, origine proxy selezionata, blocco di accessi incrociati e permessi senza privilegi impliciti. Regressione dei test servizio per isolamento rider/sede e DTO minimizzati.
