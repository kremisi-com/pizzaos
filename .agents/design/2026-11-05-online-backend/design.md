# Pubblicazione del backend pilota

Richiesta utente 2026-11-05: pubblicare backend, database e autenticazione, collegare admin/rider e verificare online. Il pilota usa dati fittizi e Stripe test secondo D56; la produzione resta isolata.

## Ownership e target

`services/checkout-api` conserva business logic, Auth.js, PostgreSQL e integrazioni. `apps/admin` resta l'unico frontend per i due host operativi. Nessun import inter-app o da frontend a implementazioni del servizio.

Il processo standalone attuale combina HTTP e riconciliazione periodica. Il deploy Vercel separa un ingresso HTTP Functions da un Daemon per il worker ogni 5 secondi; una funzione HTTP autosospesa non deve possedere da sola quel timer. Il runtime comune non avvia né socket né timer all'import. L'ingresso standalone conserva il comportamento locale. Un artefatto distribuibile del servizio permette un progetto Vercel con root propria senza pubblicare file env o modifiche delle altre app.

Al 2026-11-05: Neon `dawn-base-64314765`, regione `aws-eu-central-1`, branch `test` e `production`; il runtime usa lo schema versionato del database `pizzaos_test` nel branch test. Il database del branch produzione non contiene tabelle o dati applicativi. Nessuna credenziale va nei documenti.

## Configurazione realizzata

- Due email superadmin scelte dall'utente e predisposte nella configurazione riservata del deploy.
- Google OAuth con callback esatte admin/rider/client e due utenti di prova; login reale riuscito sui due host operativi. Resend gratuito, dominio verificato e SMTP autenticato; un solo magic link esterno autorizzato, consegna Delivered verificata.
- Credenziali Stripe test esistenti acquisite dalla sandbox dell'utente; webhook su api.pizzaos.app verificato, pagamento e rimborso sandbox da 100 centesimi riusciti. Nessun pagamento simulato nel server distribuito.
- Worker persistente: l'utente autorizza solo risorse gratuite. Artefatto con una istanza minima Hobby da 1 GiB; quota residua del team da verificare prima dell'attivazione. Nessun upgrade a pagamento. Hobby prevede quota mensile, non esecuzione continua illimitata.
- Backend verificato prima del rilascio admin/rider. Ordine contanti completato attraverso i pannelli reali, due sessioni Google distinte, permessi e persistenza dopo riavvio verificati. Stato definitivo e versioni in services/checkout-api/online-deployment.md.

## Verifica

Test indipendenti per configurazione e ciclo worker, regressione servizio e app, build artefatto e prova di avvio con PostgreSQL reale. Online: HTTPS/health, proxy senza credenziali vietato, CSRF, Google/magic link, isolamento operatore/rider, ordine contanti con assegnazione e consegna, persistenza dopo restart. Google richiede il login dell'utente nel proprio browser.
