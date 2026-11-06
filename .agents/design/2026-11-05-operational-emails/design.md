# Email operative

Incremento D68-D69 dopo gate promozioni verificato. Il servizio checkout possiede outbox, snapshot dei messaggi, policy destinatari e invio SMTP; l'admin presenta lo stato degli invii. Nessuna email marketing, a invitati gruppo, iscrizione o raccolta; nessun nuovo motore ordine.

Un decorator del repository condiviso aggiunge l'evento email nello stesso commit della transizione canonica, compresi rider, gruppo, promozioni e worker. Payload italiano immutabile basato su ordine e riepilogo economico confermati, destinatario esclusivamente `order.contact.email` dell'acquirente. Nessun recupero retroattivo di eventi storici. Quote, pending pagamento e deadline raccolta non inviano ricevute.

L'invio avviene fuori transazione e fuori dalle API ordine. Claim con lease persistente e token protegge worker concorrenti; retry/backoff recupera crash ed errori. Message-ID persistente stabile e deduplica evento applicativa. Per ogni ordine si consegna prima il messaggio precedente; un invio in errore non blocca ordini diversi. SMTP può aver accettato un messaggio prima della perdita dell'ACK: retry con lo stesso Message-ID riduce duplicati ma non garantisce esattamente una consegna esterna.

Modalità test predefinita con allowlist esplicita; senza configurazione/destinatario consentito non si marca mai inviato. La configurazione live richiede attivazione esplicita nell'ambiente produzione. Le prove usano provider finti solo nei test e un sink SMTP effettivo su127.0.0.1 con indirizzi.test, senza servizi remoti. Il worker continuo e il cron esistenti richiamano la dispatch; webhook/azioni ordine non attendono SMTP.

SDD con requisiti/contratti pubblici e testwriter nuovo senza implementazioni, RED semantico, backend separato e lead sulle superfici. Verifiche su lease/retry/riavvio, PostgreSQL due pool, SMTP locale e browser errore→retry admin con ordine sano.
