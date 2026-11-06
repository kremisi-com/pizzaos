# Backend pilota online

Stato verificato il 5 novembre 2026: client, backend e ingressi admin/rider pubblicati e verificati sull'ambiente **test**. Il percorso cliente → admin → rider con Stripe Elements, challenge 3DS e tre email operative Delivered è riuscito; dettagli e limiti nel [verbale della verifica client](online-client-verification.md). Le tre applicazioni frontend restano landing, client e admin; rider appartiene ad admin. `pizzaos-api` è il servizio condiviso per identità, permessi, ordini, pagamenti e persistenza.

## Risorse attive

- Frontend operativo: [admin.pizzaos.app](https://admin.pizzaos.app) e [rider.pizzaos.app](https://rider.pizzaos.app), stesso progetto Vercel `pizzaos-admin` (`prj_KzbNoKFKlPO2c8VhzHi5pfDCxDuO`), deployment `dpl_51w6s39E8WCzX8uyd95Tdk45EKxz`.
- Client: [client.pizzaos.app](https://client.pizzaos.app), progetto `pizzaos-client` (`prj_0qkFSagSHGAOMNrtRIRdRlQb1GmE`), deployment `dpl_CiDb5zmoSTrPnebTdhq3zsGEJmcm`, collegato allo stesso backend test.
- Backend: [api.pizzaos.app](https://api.pizzaos.app/health), progetto `pizzaos-api` (`prj_01XINfSPgNT78cwfwq34z62SyDbg`), deployment corrente `dpl_74ZKgDk81HKFv7oUtnggxiTdiWQP` (sostituisce `dpl_2j3cHhiq2jcXBwrBqg7FTg3eXkYv` per applicare la allowlist email). API Node 24 e Daemon `reconciliation` separati, una istanza da 1 GiB a Francoforte (`fra1`), stato Alive/Ready verificato.
- Team Vercel `kremisis-projects`, piano Hobby. Il nome ambiente Vercel Production identifica gli alias pubblici: il servizio usa `PIZZAOS_ENVIRONMENT=test`, database test e chiavi Stripe test. Nessun upgrade a pagamento.
- Backend configurato con 14 variabili Secret, inclusa la allowlist dei destinatari email test. Client e admin usano il backend HTTPS e il relativo segreto proxy server-only; le origini canoniche di admin/rider sono configurate nello stesso progetto. Nessun segreto nei sorgenti o nel pacchetto caricato.
- Neon, account Andrea: progetto `pizzaos` (`dawn-base-64314765`), PostgreSQL 17, `aws-eu-central-1`. Branch test `br-tiny-art-baqa23dy`, database `pizzaos_test`, migrazione idempotente. Ruolo `pizzaos_test_app` con lettura/scrittura, senza superuser o CREATE nello schema pubblico.
- Produzione isolata: branch `br-sweet-recipe-baucjxbe`, database `pizzaos_production`, vuoto e non migrato. Nessuna credenziale applicativa di produzione pubblicata. La copia iniziale di questo database nel branch test è inutilizzata.

## Autenticazione e provider

Google OAuth usa l'account scelto dall'utente e il progetto `pizzaos-pilota-2026`, client `PizzaOS Pilota Web`, pubblico esterno in modalità test, con i due superadmin come utenti di prova. Callback esatte: ciascuna origine admin/rider/client + `/api/pilot/auth/callback/google`. Gli scope sono soltanto openid, profilo ed email. Entrambe le email comunicate sono configurate come superadmin; l'accesso rider richiede comunque l'abilitazione nella sede.

Resend è sul piano gratuito verificato nel pannello ($0/mese, 3.000 email transazionali), con `pizzaos.app` verificato in Irlanda e mittente `PizzaOS <accesso@pizzaos.app>`. La chiave dedicata permette soltanto invio da questo dominio. SMTP TLS 465 autenticato. Aggiunti TXT `resend._domainkey` e CNAME `rsend`/`send` richiesti dal provider; nessuna modifica ai nameserver o alla posta in ingresso. Termini e creazione delle credenziali approvati esplicitamente dall'utente. Inviato un solo magic link di prova a `andrea.napolitano@kremisi.com`, con autorizzazione specifica: Resend conferma **Delivered**, email `01a1ab8d-b2df-7c62-9264-aadef5e46e14`. Il link non è stato consumato durante quella verifica. Nella successiva prova cliente, autorizzata dall'utente, le email operative sono rimaste in modalità test con allowlist limitata all'account di prova `napolitanoandrea00@gmail.com`: ricevuta, accettazione e avvio consegna del nuovo ordine risultano Delivered. ID ed evidenze nel [verbale client](online-client-verification.md); le altre destinazioni restano bloccate.

Stripe usa la sandbox dell'utente. Webhook `we_1UYORKAPiFV6wt8hBrXIYBh6` su `https://api.pizzaos.app/v1/stripe/webhook`, per stati PaymentIntent e rimborsi; segreto protetto su Vercel. Le chiavi Stripe esistenti non sono state create o ruotate.

## Verifiche online iniziali (prima del rilascio client)

- HTTPS e health del backend; API senza segreto proxy rifiutate; sessione e provider corretti per entrambi gli host; callback OAuth sul proprio dominio.
- Google reale su admin e rider, due sessioni Auth.js persistenti e distinte. Rider inizialmente anonimo dopo il login admin; autenticato ma non abilitato prima della relativa appartenenza; autorizzato dopo l'abilitazione attraverso il pannello admin.
- Cookie Secure/HttpOnly senza Domain, risposte auth no-store, mutazioni da origine diversa negate. Percorsi dell'altra area ricondotti alla home locale, API amministrative e demo vietate sull'host rider. DTO rider senza email cliente o dettagli Stripe.
- Sede fittizia `verifica-online`: ordine contanti `d19533cd-1e58-4154-85e2-48b420152021`, retry idempotente sullo stesso ordine, accettazione/preparazione/pronto nel pannello admin, assegnazione, avvio e completamento nel pannello rider. Esito `completed/cash_paid`; scorta da 10 a 9.
- Ordine carta `b8d18990-f4e1-4b93-8773-3e5b91dd20ec`: pagamento sandbox da 100 centesimi EUR confermato con Visa di test tramite API Stripe, rilevato automaticamente; evento Stripe con zero consegne webhook pendenti. Annullamento e rimborso reale in sandbox da 100 centesimi riuscito: `cancelled/refunded`. Nessun addebito live. La prova non copre Stripe Elements/3DS nel browser cliente.
- Firma webhook valida accettata, payload alterato rifiutato. Riconciliazione eseguita anche senza le viste ordini aperte.
- Worker arrestato e riavviato: nuova istanza Alive a `fra1`, stessi ordini, incasso, rimborso e stock dopo il riavvio. Nessuna identità o sessione sintetica creata in SQL: le prove HTTP autenticate hanno usato le sessioni prodotte dai login Google reali.
- Corretto il collegamento «Area rider» del pannello consegne: usa l'origine rider fornita dalle pagine server; fallback locale `/rider`.
- Corretta la conferma «Controlla la tua email» per i metadati email aggiunti da Auth.js all'URL di verifica; regressioni per flag locale, metadati standard e URL combinato. La stessa correzione è presente e verificata nei sorgenti client, senza pubblicare quel frontend.
- Sede di prova lasciata **chiusa ai nuovi ordini**. I due ordini fittizi restano consultabili nel database test; nessun dato commerciale di produzione.

Verifiche repository: 425 test backend inclusi PostgreSQL reale e SMTP locale, 97 test admin e 116 test client; TypeScript/lint/build delle app e controllo architettura superati. Artefatto backend Node 24 installabile con npm ci, audit senza vulnerabilità note. Evidenze locali e riepilogo senza segreti in `.codex/evidence/`.

## Verifica successiva con il client pubblicato

Il [verbale del 5 novembre](online-client-verification.md) documenta il percorso completo dal browser cliente con login Google reale, ordine `30d3f817-4f14-44fb-82ac-d0b67a67530d` da 1,00 €, Stripe Elements e challenge 3DS autenticata, accettazione/preparazione admin, assegnazione/partenza/completamento rider e tre email operative Delivered. Stato finale `completed/paid`, scorta 9 → 8 e punti 1 → 2; sede richiusa. Client lint/typecheck, 116 test e build rieseguiti con successo. Restano prova da dispositivi fisici distinti e gli altri scenari online elencati nel verbale, incluso il limite delle bozze di configurazione obsolete.

## Limiti e gestione successiva

La quota gratuita Daemon Hobby è condivisa dal team: 420 GB-ore di memoria al mese permettono al massimo 17,5 giorni a 1 GiB; la quota CPU o altri Daemon possono ridurre tale durata. Al raggiungimento del limite Vercel arresta i Daemon. Non è un servizio continuo mensile illimitato. [Limiti ufficiali](https://vercel.com/docs/daemons/limits).

Anche Neon Free ha una quota: 100 CU-ore mensili per progetto. Con il compute fissato a 0,25 CU e il worker che interroga il database ogni 5 secondi, equivale a circa 400 ore (16,7 giorni) di database attivo, prima di altri utilizzi. La durata effettiva del pilota gratuito dipende quindi da entrambe le quote, senza upgrade automatici. [Piano Neon](https://neon.com/pricing).

Il plugin Vercel collegato a Development Kremisi legge il progetto backend, ma la scrittura delle sue variabili risponde ancora Project not found: allowlist email e redeploy backend sono stati applicati dal pannello. Admin/rider e il successivo client sono stati pubblicati tramite il plugin esistente. La landing non è stata aggiornata. Le callback dei tre host applicativi sono configurate; il login Google del client è ora verificato.

L'attivazione commerciale con database, utenti e pagamenti live richiede un rilascio distinto; restano le decisioni D16/D31 del progetto.
