# Email operative

Fonte D68-D69. Al cliente che invia l'ordine, nel gruppo soltanto all'organizzatore pagante: ricevuto dopo submission, accettato, pronto al ritiro oppure in consegna, annullato ed esiti effettivi del rimborso. Nessun messaggio raccolta/invitati, marketing, push o SMS; WhatsApp resta manuale e lo stato è sempre nell'app.

L'outbox è persistente e atomica con il lifecycle canonico. Invio separato, retry automatici e stato/errori sanitizzati nell'admin della sede; email guasta non blocca ordine o pagamento. Per ogni ordine l'invio conserva l'ordine degli eventi, senza bloccare altri ordini. Message-ID stabile e deduplica applicativa; un ACK SMTP perso può ancora causare duplicati esterni, senza promessa exactly-once.

Modalità test predefinita con allowlist esplicita. In questo incremento le sole consegne effettive sono verso sinkSMTP locale e indirizzi.test, senza invii a persone reali o servizi remoti. Produzione richiede configurazione SMTP/live esplicita; D16/D31 non sono risolte dai test.

Specifica corrente: `../../design/2026-11-05-operational-emails/`.
