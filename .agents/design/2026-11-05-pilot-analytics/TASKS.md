- [x] **analytics-service**: Journal durevole, autorizzazioni e cinque metriche con filtri nel fuso della sede.
- [x] **analytics-surface**: Pannello admin italiano con selezione periodo, stati vuoto/errore e port iniettato.

Integrazione runtime/HTTP/composizione admin: coordinatore dopo stabilizzazione dell'incremento ordine individuale; non dichiarare l'incremento end-to-end completo prima di questa verifica.

Verifica moduli: 25 test indipendenti (18 servizio, 7 pannello), prima rossi su stub e poi verdi; typecheck admin/servizio, lint dei nuovi file e build servizio superati. Build admin e verifica completa attraverso proxy/API/database restano alla fase di integrazione.
