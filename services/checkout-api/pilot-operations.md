# Esercizio del pilota test

Runbook corrente dal 25 novembre 2026. [Runtime e comandi](README.md), [ultimo stato registrato e cronologia](online-deployment.md), [lavoro residuo](../../.agents/product-definition/roadmap.md). Non sostituisce una procedura di produzione né attesta nuovi controlli cloud.

## Prima di un rilascio

Identificare commit candidato, progetto backend `pizzaos-api` nel team corretto, database `pizzaos_test`, origini app e chiavi Stripe sandbox. Non usare il nome Vercel Production come prova di un ambiente commerciale: gli alias pubblici del pilota servono test. Il database commerciale separato non va usato dalle prove.

Eseguire suite e build dal candidato; `pnpm --filter @pizzaos/checkout-api build:deployment` prepara l'artefatto API/worker. Applicare le migrazioni richieste da quella versione con la connessione diretta del database corretto. La protezione `configurationRevision` del 25 novembre non richiede una migrazione ma richiede un admin aggiornato: pubblicare servizio/admin coordinati e far rileggere le configurazioni prima del salvataggio. Non aprire una sede durante un disallineamento.

Controllare health e letture via proxy, 403 senza credenziale, cookie/ruoli per host, `x-request-id` su risposte/errori e log sanitizzati. Un health positivo non prova dispatch email o avanzamento delle scadenze.

## Worker e apertura controllata

Il worker è necessario per scadenze, riconciliazioni e outbox senza browser aperti. L'ultima evidenza lo registra fermo: verificare override e istanze della versione candidata, senza dedurre lo stato dal manifest. Durante un collaudo pianificato verificare una sola istanza stabile, stato delle operazioni pendenti, modalità email/destinatari e costo/quote disponibili sull'account attuale. Non riattivare vecchi ordini o invii senza riesaminarli.

Aprire solo la sede di prova con capacità controllata e dati validati. Provare ordine contanti e carta/3DS, coda, ritiro/consegna, email e scadenza con viste chiuse; controllare ordini, scorte, riserve, punti e rimborsi dopo riavvio. Registrare data, commit di ogni superficie, ID ordine/pagamento/invio, dispositivi e limiti. Lasciare espliciti lo stato finale di sede e worker.

## Misura del traffico

Annotare piano corrente, contatori disponibili e ritardo di aggiornamento mostrato dalla piattaforma. Confrontare due finestre della stessa durata: worker attivo con browser chiusi, poi attività controllata. Registrare byte trasferiti, CU/tempo compute, istanze, richieste e scritture; distinguere attività estranee e aggregazioni di progetto. La misura su [PostgreSQL locale](../../.agents/design/2026-11-20-snapshot-traffic/REVIEW.md) verifica l'ottimizzazione ma non il traffico fatturabile Neon.

Il vecchio piano di attesa del reset Free è [archiviato](../../.agents/archive/2026-11-20-restore-test-after-quota.md), superato dal ripristino su Launch. Non usarlo come azione pendente. Quote/prezzi e piani vanno letti sulla piattaforma al momento dell'azione, non dedotti da verbali precedenti.

## Guasti e limiti

Correlare errori con la [diagnostica](observability.md). Un pagamento incerto si recupera sullo stesso tentativo; un rimborso fallito si ritenta dalla gestione ordine; email e worker non autorizzano duplicazioni manuali. Un conflitto configurazione richiede rilettura e revisione della bozza.

Backup con ripristino provato, retention, alert recapitati, supporto e D16/D31 restano criteri aperti prima dell'uso commerciale. Il ripristino della connessione dopo una quota non è una prova di ripristino da backup.
