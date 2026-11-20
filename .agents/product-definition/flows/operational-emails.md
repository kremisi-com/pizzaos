# Email operative

Fonte D68-D69. Al cliente che invia l'ordine, nel gruppo soltanto all'organizzatore pagante: ricevuto dopo submission, accettato, pronto al ritiro oppure in consegna, annullato ed esiti effettivi del rimborso. Nessun messaggio raccolta/invitati, marketing, push o SMS; WhatsApp resta manuale e lo stato è sempre nell'app.

L'outbox è persistente e atomica con il lifecycle canonico. Invio separato, retry automatici e stato/errori sanitizzati nell'admin della sede; email guasta non blocca ordine o pagamento. Per ogni ordine l'invio conserva l'ordine degli eventi, senza bloccare altri ordini. Message-ID stabile e deduplica applicativa; un ACK SMTP perso può ancora causare duplicati esterni, senza promessa exactly-once.

Modalità test predefinita con allowlist esplicita. Le prove locali dell'incremento usano sink SMTP e indirizzi `.test`. Successivamente, nel pilota online test del 5 novembre 2026, ricevuta, accettazione e avvio consegna sono state recapitate all'account di prova: il [verbale online](../../../services/checkout-api/online-client-verification.md) registra i tre esiti Delivered e i limiti della prova. L'invio live richiede configurazione SMTP/live esplicita; D16/D31 non sono risolte dai test.

Il servizio email possiede outbox e dispatch; il lifecycle canonico produce gli eventi e l'admin ne presenta lo stato. Configurazione e limiti operativi: [README email](../../../services/checkout-api/src/operational-emails/README.md).

## Casi limite e verifiche

Con D73 il dispatch registra errori tecnici sanitizzati correlati a email/ordine/sede, senza destinatario o contenuto e senza cambiare retry o stato pubblico. I guasti del reporter non bloccano il dispatch. [Regole diagnostiche](backend-observability.md), [test SMTP e worker indipendenti](../../../services/checkout-api/src/diagnostics-operational.acceptance.test.ts).

- SMTP non raggiungibile o lento: ordine e pagamento continuano, il worker riprova e l'admin espone stato/errore sanitizzato.
- Un invio fallisce: conserva l'ordine degli eventi di quell'ordine, senza bloccare ordini diversi.
- ACK SMTP perso dopo l'invio: un retry può duplicare la consegna esterna; non si promette exactly-once.
- Ordine di gruppo: riceve soltanto l'organizzatore pagante, senza notifiche agli invitati.
- Rimborso pending/fallito/eseguito: si comunica l'esito effettivo, senza anticipare un accredito non confermato.

Requisiti completi: [outbox](../../design/2026-11-05-operational-emails/email-outbox/REQUIREMENTS.md) e [admin](../../design/2026-11-05-operational-emails/email-admin/REQUIREMENTS.md). Verifiche: [worker](../../../services/checkout-api/src/operational-emails/emails-worker.test.ts), [SMTP](../../../services/checkout-api/src/operational-emails/emails-smtp.test.ts), [browser](../../../tests/e2e/operational-emails.spec.ts). Evidenze locali: [riesame](../../design/2026-11-05-operational-emails/REVIEW.md); restano distinte dalla prova online sopra citata.
