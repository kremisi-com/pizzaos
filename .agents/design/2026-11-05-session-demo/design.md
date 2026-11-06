# POC e prodotto reale nella stessa applicazione

Decisione approvata dall'utente il 2026-11-05: conservare il POC e accedervi con `poc@pizzaos.app` e password dedicata; gli altri accessi continuano a usare le funzionalità reali. Il ramo locale `poc` è già antenato di `client`: nessun merge necessario.

Il servizio possiede l'accesso demo e firma una sessione distinta da Auth.js. Le app scelgono shell e navigazione per sessione verificata dal servizio. Il POC mantiene gli adapter locali e il reset; non usa il database operativo. Tutti gli endpoint operativi rifiutano la sessione demo, comprese letture, preventivi e stream. La carta nel POC è simulata senza Stripe.

L'accesso demo è disabilitato senza password server `PIZZAOS_DEMO_PASSWORD`. Nessuna password predefinita o pubblica. L'account demo non è un'identità Auth.js né un operatore. La sessione è limitata all'origine, scade dopo otto ore, usa HttpOnly/SameSite e Secure in HTTPS. Accesso e uscita richiedono origine e CSRF. Il logout elimina anche eventuali cookie di sessione reale residui; un successivo accesso reale sostituisce la modalità demo solo quando completato.

La selezione globale `PIZZAOS_MODE` viene ritirata: senza sessione demo si apre sempre il prodotto reale, anche come guest. I vecchi URL POC sono protetti e reindirizzati al flusso reale per gli altri utenti. I link reali aperti in demo riportano al POC. Sono preservate le modifiche locali precedenti all'intervento.

Le regressioni POC hanno evidenziato due problemi nel percorso esistente: il carrello rimpiazzava i nomi con identificativi dopo la lettura API, e il pulsante prodotto poteva ricevere un click prima dell'idratazione. Il carrello combina catalogo e righe tramite i port pubblici; il pulsante si abilita solo quando pronto. Il fallback del provider locale resta stabile tra render. Le prove browser del gruppo e del riordino coprono queste capacità conservate.
