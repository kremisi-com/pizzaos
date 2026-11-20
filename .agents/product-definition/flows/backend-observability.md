# Errori backend e diagnostica tecnica — F23/F24

Decisione D73. Attori: cliente/operatore che riceve un errore, responsabile tecnico che consulta log e Sentry. Owner: checkout-api per errori/diagnostica e stati persistenti; le app inoltrano la risposta e conservano i flussi di recupero. La configurazione commerciale resta nell'admin; logger, credenziali Sentry e release sono configurazione server.

## Percorso e risultato

Ogni richiesta riceve un identificatore nuovo generato dal servizio, restituito in `x-request-id` e nel payload errore `{code,message,requestId}`. Il proxy delle app conserva l'header. Il responsabile usa quell'ID per correlare log, release e ambiente. Il cliente riceve messaggi italiani sicuri. Il codice additivo `internal_error` indica HTTP 500; dipendenze temporaneamente indisponibili danno 503 `service_unavailable`. Gli errori previsti conservano i codici esistenti e non producono segnalazioni tecniche a Sentry.

La diagnostica contiene codici, operazioni, route template, identificatori opachi e posizioni di codice sanitizzate. Esclude body, query, header, contatti, token, credenziali e messaggi arbitrari degli errori. Gli errori recuperati restano registrabili anche se l'API restituisce successo o stato pending. I retry non autorizzano nuovi ordini o addebiti. Rimborsi falliti ed email bloccate/in retry restano nei pannelli operativi esistenti, secondo [ordinazione](customer-ordering-and-payment.md) e [email](operational-emails.md).

## Alternative e casi limite

- Guasto Stripe con esito incerto: preservare prenotazioni/idempotenza e recuperare lo stesso tentativo; log con ordine e operazione, nessun client secret.
- Webhook con firma errata: 400 senza elaborazione; errore dopo firma valida: 500/503, così il provider può ritentare.
- SMTP fallisce: stato retrying/bloccato nell'admin e diagnostica senza destinatario o contenuto; nessun blocco dell'ordine, nessun nuovo limite ai tentativi.
- Worker ripete un errore: prima emissione immediata, poi massimo una per minuto per chiave/processo con numero delle ripetizioni soppresse; richieste HTTP diverse restano distinguibili. La deduplica non è un audit durevole.
- Stream già aperto: chiusura e diagnostica; non tentare un secondo payload HTTP.
- Arresto durante l'inizializzazione: chiudere il runtime appena pronto senza avviare il worker; se il primo ciclo è già attivo, terminarlo prima di chiudere il runtime e saltare l'apertura della porta HTTP. [Test del processo](../../../services/checkout-api/src/process-host.test.ts).
- Reporter o sink guasto: non interrompere flussi o timer. Errore fatale del processo: diagnostica, flush limitato e terminazione; il processo non continua in stato incerto.
- DSN assente: solo log locali/piattaforma. DSN presente: invio opt-in di eventi sanitizzati; niente auto raccolta di richieste o breadcrumb. API serverless e worker tentano flush limitato.

## Attivazione e verifica

Approvato: D73. Implementazione e prove locali sono registrate nel [riesame SDD](../../design/2026-11-20-backend-observability/REVIEW.md). Test pertinenti: [diagnostica](../../../services/checkout-api/src/diagnostics.acceptance.test.ts), [HTTP](../../../services/checkout-api/src/diagnostics-http.acceptance.test.ts), [proxy](../../../tests/individual-proxy.test.ts) e suite servizio ordini/email/worker.

Il 20 novembre 2026 il progetto Sentry `kremisi/pizzaos-backend` è stato creato con approvazione dell'utente. Un errore intenzionale attraverso il vero ingresso HTTP locale è stato ricevuto online, con correlazione e frame TypeScript verificati: [verbale Sentry](../../design/2026-11-20-backend-observability/SENTRY_VERIFICATION.md). Il DSN è configurato localmente, non ancora sul deploy. La prova non attesta il backend online con database operativo.

L'alert dedicato per nuovi errori/regressioni è attivo (email team Kremisi, 30 minuti), è scattato e la prova è risolta. L'accesso Vercel corretto è verificato e le variabili sono predisposte; il nuovo codice non è pubblicato. I log e Neon hanno confermato quota di rete Free esaurita: l'utente ha scelto di restare gratis, sospendere il worker a zero istanze e [preparare il ripristino](../../../services/checkout-api/restore-test-after-quota.md) dopo il reset. SQLSTATE53000 è classificato dependency/503, con solo codice e frame nei log; l'issue reale quota resta aperta fino al recupero.

Il servizio riduce e misura in locale i byte trasferiti per lo snapshot degli ordini. L'operatore tecnico può ripetere il confronto prima/dopo su PostgreSQL dedicato. Il conteggio locale comprende avvii a caldo in quiete e con scritture; dopo migrazione e ripristino si misura il consumo effettivo del pilota nell'Overview Neon. Una cache già popolata richiede comunque la verifica nel database, quindi un database indisponibile continua a passare dal percorso degli errori di dipendenza. [Misura locale](../../design/2026-11-20-snapshot-traffic/REVIEW.md), [procedura per il pilota](../../../services/checkout-api/restore-test-after-quota.md).

Restano ripristino/rilascio e verifica online, recapito email, retention e metadati geo del provider. I log di hosting si consultano sul progetto API e sul worker; Sentry è il pannello tecnico, senza una nuova sezione diagnostica nell'admin. La [procedura operativa](../../../services/checkout-api/observability.md) descrive configurazione e prova. D16/D31, backup/ripristino e readiness commerciale restano aperte.
