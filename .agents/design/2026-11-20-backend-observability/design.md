# Errori e osservabilità backend

Approvato in chat il 20 novembre 2026: eseguire la proposta completa con SDD. Owner: `services/checkout-api`; dominio per il codice pubblico aggiuntivo, proxy delle app per propagare la correlazione. F23/F24, D49/D69 e nuova D73. Nessun deploy o nuova risorsa a pagamento è incluso.

Il servizio distingue errori previsti, dipendenze temporaneamente indisponibili e bug. Log JSON uniformi e sanitizzati coprono HTTP, Auth.js, PostgreSQL, Stripe, email e worker. Un ID generato dal servizio collega risposta e diagnostica. Le operazioni recuperate restano osservabili senza modificare idempotenza, riserve o retry. Ripetizioni dei worker sono limitate con memoria delimitata. Sentry è opzionale e riceve soltanto eventi già sanitizzati; il suo guasto non può compromettere l'ordine.

I problemi operativi restano negli stati canonici già presentati nell'admin (rimborsi ed email); il pannello tecnico è Sentry, senza una seconda banca dati di stack trace. La configurazione tecnica usa variabili server; non esiste un flusso CMS/admin per logger o Sentry. Conservazione e destinatari degli alert si configurano nel pannello del provider. Non si attivano piani a pagamento.

Una sola task integra contratti, diagnostica e runtime. Test indipendenti dai dettagli di implementazione prima del codice; poi regressioni di servizio, proxy e app, lint/typecheck/build e controllo architetturale. Evidenza locale separata da attivazione del DSN, alert e verifica online. Fonti: https://fastify.dev/docs/latest/Reference/Logging/ e https://docs.sentry.io/platforms/javascript/guides/node/configuration/filtering/ .
