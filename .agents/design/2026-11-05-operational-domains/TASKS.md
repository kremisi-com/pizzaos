- [x] **operational-hosts**: Routing dei due ingressi, proxy e sessioni sull'host corretto, protezione delle schermate e verifiche indipendenti.
- [x] **hosting**: Entrambi i sottodomini associati e verificati sul progetto esistente `kremisis-projects/pizzaos-admin`; DNS autorevole corretto e HTTPS 200 sui due host.

Il rilascio del nuovo frontend resta in attesa del backend, confermato dall'utente ancora da pubblicare. Sono configurate soltanto le due origini di produzione; servono servizio HTTPS, segreto proxy, allowlist origini, callback Google e magic link verificati. La versione online attuale resta quella precedente.

Verifiche: 77 test contrattuali/UI della feature; 81 test admin; regressioni proxy/modalità 70 test; 23 test servizio per consegne e integrazione; lint, typecheck, build admin e architecture check superati. Tre prove browser dedicate ai due host, login/callback, isolamento sessioni/ruoli, API e demo rider.
