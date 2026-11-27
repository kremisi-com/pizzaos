# Email operative

Fonte D68-D69, aggiornata per il [carrello condiviso](group-ordering.md) il 27 novembre 2026. Il creatore riceve le notifiche dell'ordine completo: ricevuto dopo submission, accettato, pronto al ritiro oppure in consegna, annullato. Ogni pagante riceve separatamente la conferma della propria quota e gli esiti dei propri rimborsi, senza dati o note degli altri. Nessuna ricevuta ordine anticipata al primo pagamento. Marketing, push e SMS esclusi; WhatsApp manuale, stato sempre nell'app.

L'outbox è persistente e atomica con il lifecycle canonico. Invio separato, retry automatici e stato/errori sanitizzati nell'admin della sede; email guasta non blocca ordine o pagamento. Per ogni ordine l'invio conserva l'ordine degli eventi, senza bloccare altri ordini. Message-ID stabile e deduplica applicativa; un ACK SMTP perso può ancora causare duplicati esterni, senza promessa exactly-once.

Modalità test predefinita con allowlist esplicita. Le prove locali dell'incremento usano sink SMTP e indirizzi `.test`. Successivamente, nel pilota online test del 5 novembre 2026, ricevuta, accettazione e avvio consegna sono state recapitate all'account di prova: il [verbale online](../../../services/checkout-api/online-client-verification.md) registra i tre esiti Delivered e i limiti della prova. L'invio live richiede configurazione SMTP/live esplicita; D16/D31 non sono risolte dai test.

Su richiesta del 23 novembre 2026, il pilota può attivare `test_open` e inviare le email operative all'indirizzo di qualsiasi cliente autenticato che effettua un ordine, anche se assente dalla lista di prova. La modalità richiede `PIZZAOS_ENVIRONMENT=test` esplicito. I messaggi già accodati diventano idonei al prossimo tentativo pianificato e conservano l'ordine di invio. «Segna pronto» genera l'email per il ritiro. Per un ordine a domicilio l'email parte all'avvio della consegna. [Verifica della politica test](../../../services/checkout-api/src/operational-emails/emails.test.ts).

Il servizio email possiede outbox e dispatch; il lifecycle canonico produce gli eventi e l'admin ne presenta lo stato. Configurazione e limiti operativi: [README email](../../../services/checkout-api/src/operational-emails/README.md).

## Casi limite e verifiche

Con D73 il dispatch registra errori tecnici sanitizzati correlati a email/ordine/sede, senza destinatario o contenuto e senza cambiare retry o stato pubblico. I guasti del reporter non bloccano il dispatch. [Regole diagnostiche](backend-observability.md), [test SMTP e worker indipendenti](../../../services/checkout-api/src/diagnostics-operational.acceptance.test.ts).

- SMTP non raggiungibile o lento: ordine e pagamento continuano, il worker riprova e l'admin espone stato/errore sanitizzato.
- Un invio fallisce: conserva l'ordine degli eventi di quell'ordine, senza bloccare ordini diversi.
- ACK SMTP perso dopo l'invio: un retry può duplicare la consegna esterna; non si promette exactly-once.
- Ordine di gruppo: lifecycle al creatore, incassi/rimborsi al finanziatore effettivo con contenuto limitato alla quota. Il blocco di un destinatario non ferma un altro pagante dello stesso gruppo.
- Rimborso pending/fallito/eseguito: si comunica l'esito effettivo, senza anticipare un accredito non confermato.

Requisiti completi: [outbox](../../design/2026-11-05-operational-emails/email-outbox/REQUIREMENTS.md) e [admin](../../design/2026-11-05-operational-emails/email-admin/REQUIREMENTS.md). Verifiche: [worker](../../../services/checkout-api/src/operational-emails/emails-worker.test.ts), [SMTP](../../../services/checkout-api/src/operational-emails/emails-smtp.test.ts), [browser](../../../tests/e2e/operational-emails.spec.ts). Evidenze locali: [riesame](../../design/2026-11-05-operational-emails/REVIEW.md); restano distinte dalla prova online sopra citata.
