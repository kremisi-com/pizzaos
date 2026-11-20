# Ripristino gratuito del pilota dopo la quota Neon

## Stato verificato il 20 novembre 2026

- Neon progetto `dawn-base-64314765` (`pizzaos`), piano Free: **5.533.768.020 byte** di traffico pubblico nel periodo 1 novembre → 1 dicembre. Il limite Free documentato è 5 GB/progetto/mese; le connessioni rifiutate con SQLSTATE `53000` confermano il blocco. Il periodo termina il **1 dicembre 2026 alle 01:00 Europe/Rome**. Il compute misurato è 80.330 CU-secondi (circa 22,31 CU-ore): il limite raggiunto è quello del traffico, non un esaurimento dimostrato delle CU-ore.
- Endpoint test `ep-broad-sky-bahgbm8t`, branch `br-tiny-art-baqa23dy`, sospeso dal 9 novembre. Nessun dato cancellato, schema modificato o piano aggiornato durante questa diagnosi. [Regole ufficiali quota/reset](https://neon.com/docs/introduction/plans).
- Vercel account `development-4049`, team Hobby `kremisis-projects`, progetto `pizzaos-api` (`prj_01XINfSPgNT78cwfwq34z62SyDbg`). Il deployment pubblico resta `dpl_74ZKgDk81HKFv7oUtnggxiTdiWQP`; non è stato pubblicato il nuovo codice. `/health` è stato osservato in errore di invocazione durante il blocco database.
- Il worker `reconciliation` è stato sospeso su richiesta dell'utente: override **fra1=0**, desired/total/ready 0, nessuna istanza residua. Il manifest conserva la configurazione nominale fra1=1; l'override resta da ripristinare esplicitamente dopo la verifica.
- Predisposti sul progetto, target Vercel Production che qui serve il **pilota test**: SENTRY_DSN Secret, PIZZAOS_RELEASE Config `pizzaos-observability-20261120`, NODE_OPTIONS Config `--enable-source-maps`. Valori Config riletti e confrontati; nessuna lettura delle Secret. Node del progetto riallineato a 24.x, coerente con il pacchetto. Le nuove variabili diventano effettive soltanto con un nuovo deploy.
- Sentry `kremisi/pizzaos-backend` è collegato; alert 1519285 attivo (team Kremisi, nuovi errori/regressioni, 30 minuti) e scattato nella verifica. Prova sintetica [PIZZAOS-BACKEND-1](https://kremisi.sentry.io/issues/162614072/) risolta; problema reale quota [PIZZAOS-BACKEND-2](https://kremisi.sentry.io/issues/162619938/) aperto.

## Pacchetto pronto, senza rilascio

Da root, `pnpm --filter @pizzaos/checkout-api build:deployment` genera `.codex/deployments/pizzaos-api`. Il lock npm è presente e le dipendenze del manifest sono già state verificate con npm ci. Il dry-run CLI del 20 novembre ha incluso esattamente nove file: i due bundle, i due package.json, i due package-lock.json, Dockerfile, vercel.json e .vercelignore. Nessun env, credenziale o node_modules. I bundle hanno mappe inline senza sourcesContent.

Archivio preparato: `.codex/uploads/pizzaos-api-observability-20261120-145104.zip`. Hash/manifest ed evidenze: `.codex/sentry/release-manifest.json`, `deploy-dry-run-private.json`, `worker-paused-final.json`. Sono materiali locali ignorati da Git; non condividere i file privati della stessa cartella.

## Sequenza di ripristino manuale

1. **Verificare il reset effettivo.** Rileggere consumo/periodo in Neon sul progetto sopra e controllare una sola connessione `SELECT 1` con il ruolo applicativo test. La data di rinnovo non sostituisce la prova di connessione. Non creare nuovi progetti o cambiare piani per aggirare il limite.
2. **Includere la riduzione del traffico nel rilascio.** Il repository aggiornato evita di trasferire lo snapshot invariato e di riscriverlo nelle transazioni senza cambiamenti. Il [riesame SDD](../../.agents/design/2026-11-20-snapshot-traffic/REVIEW.md) riporta la misura su PostgreSQL locale e i casi di lettura a freddo. La verifica sull'egress del pilota resta al punto 7.
3. **Controllare destinazione e costo.** Login dedicato in `.codex/vercel-auth`; verificare progetto ID, team Hobby, Node24 e quote residue del worker. `PIZZAOS_ENVIRONMENT=test`, database `pizzaos_test` e Stripe test restano requisiti. Nessun piano, trial o upgrade automatico autorizzato.
4. **Migrare e rilasciare il pacchetto verificato.** Rigenerare e verificare i bundle dal codice corrente. Applicare `pnpm migrate` da `services/checkout-api` con la connessione diretta al database del pilota test prima di avviare l'API aggiornata. La migrazione additiva supporta anche il vecchio binario durante il passaggio. Usare il progetto Vercel esistente. Il comando seguente è per il rilascio futuro.

   ```powershell
   npx vercel@66.5.0 deploy D:/Projects/github/pizzaos/.codex/deployments/pizzaos-api --prod --project prj_01XINfSPgNT78cwfwq34z62SyDbg --scope kremisis-projects --global-config D:/Projects/github/pizzaos/.codex/vercel-auth --json
   ```

5. **Verificare API prima del worker.** Attendere Ready, controllare `/health`, sessione anonima/catalogo, rifiuto proxy non autorizzato, x-request-id e log sanitizzati; verificare ambiente/release e un evento controllato senza inviare ordini. Finché fallisce la connessione, mantenere il worker a zero.
6. **Riattivare esplicitamente una sola istanza.** Solo dopo database/API e riduzione del traffico verificati:

   ```powershell
   npx vercel@66.5.0 daemons scale reconciliation fra1=1 --project pizzaos-api --scope kremisis-projects --global-config D:/Projects/github/pizzaos/.codex/vercel-auth --json
   ```

   Verificare desired/ready/alive=1 a fra1 e stato stabile; niente crash_looping. Il worker riprenderà scadenze, riconciliazioni e outbox già persistite: controllare gli esiti test e la allowlist email prima di riaprire la sede.
7. **Misurare il consumo dopo il ripristino.** Rilevare i byte di traffico pubblico nell'Overview del progetto Neon e le CU-ore all'inizio e alla fine di due finestre di uguale durata, una con worker attivo e browser chiusi e una con attività controllata. Registrare il numero di istanze, le richieste e le scritture di prova; se il dato è aggregato a livello di progetto, annotare altre attività nella stessa finestra. Verificare recapito alert e stato operativo admin, poi aggiornare il registro con deployment, data, ambiente e limiti della prova. Risolvere l'issue quota dopo il recupero reale. [Misura del traffico pubblico su Neon](https://neon.com/docs/introduction/network-transfer#how-to-monitor-network-transfer).

Non è stato pianificato un riavvio automatico. La scelta approvata è mantenere il piano gratuito e preparare la procedura, conservando il worker fermo finché le precondizioni non sono soddisfatte.
