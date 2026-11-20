# Comportamenti osservabili

R1. Le risposte errore mantengono `{code,message}`; aggiungono `requestId` e tutte le risposte HTTP hanno `x-request-id`. L'ID è un UUID nuovo del servizio, non si accetta quello fornito dal chiamante. Due richieste concorrenti hanno ID distinti, usati anche nei rispettivi log. Nessun dettaglio tecnico compare nel payload.

R2. Errori previsti conservano codici e status 400/401/403/404/409. Errori di validazione danno `invalid_input`; limite corpo 413 e media type 415 mantengono lo status appropriato. Un `Error('password secret')` sconosciuto dà 500 `internal_error`, messaggio italiano generico. Timeout/connessione rifiutata PostgreSQL e Stripe danno 503 `service_unavailable`. Un errore Fastify interno non è automaticamente un errore dell'utente. Il codice `service_unavailable` esplicito mantiene 503.

R3. Per ogni errore HTTP inatteso si produce un solo evento diagnostico di errore; il completamento HTTP è un evento distinto con durata e status. Gli errori 4xx previsti non producono segnalazioni al reporter. Metodo, route template, ID richiesta/ordine/sede/job, codice, categoria, ambiente e release permettono diagnosi e correlazione.

R4. Né log né reporter contengono body, query string, header, cookie, token, email/telefono/indirizzo cliente, messaggi arbitrari degli errori, cause arbitrarie o prima riga dello stack. Solo frame normalizzati (nome file, riga, colonna), tipi/codici ammessi e contesto esplicitamente autorizzato. Esempio: `new Error('postgres://user:password@host/db?token=secret')` con una cause contenente credenziali mantiene un evento diagnostico utile senza nessuna di quelle stringhe. Anche le chiamate dirette al logger devono filtrare oggetti e messaggi arbitrari.

R5. Errori di pagamento/rimborso recuperati, cancellazione incerta, singolo ordine nel tick e invio SMTP fallito producono diagnostica con identificatori pertinenti senza cambiare stati, retry, transazioni o idempotenza. Email `blocked` e `retrying` e rimborsi `refund_failed` restano visibili nell'admin attraverso i contratti esistenti. Nessun limite ai tentativi email viene introdotto.

R6. Lo stesso fallimento ripetuto di operazione+ordine/job+codice+categoria viene emesso subito e poi al massimo una volta ogni 60 secondi per processo, finché la chiave resta in memoria; la successiva emissione indica quante ripetizioni sono state soppresse. Una diversa richiesta HTTP deve restare diagnosticabile. La memoria di deduplica ha limite configurabile; l'evizione può anticipare una nuova emissione, senza promettere un rate limit globale. Reporter e sink guasti non fanno fallire il lavoro applicativo, inclusi errori asincroni. I timer continuano dopo il fallimento.

R7. Senza SENTRY_DSN nessuna comunicazione esterna. Con DSN il runtime collega il reporter a Sentry per eventi dependency/unexpected/operational, con ambiente/release e impronta stabile; nessuna raccolta automatica di richieste, breadcrumb o PII. Chiusura processo e completamento funzione serverless tentano flush con timeout delimitato. DSN/configurazione non vengono mai stampati. Alert e retention richiedono configurazione nel pannello e una prova online, non si dichiarano attivati dai test locali.

R8. Firma webhook Stripe assente/non valida dà 400; errore interno dopo la verifica dà 500 o 503 secondo categoria e consente al provider di ritentare. I byte originali non cambiano. Errori dopo apertura SSE vengono registrati e lo stream viene chiuso, senza tentare una risposta JSON tardiva.

R9. API/worker/Auth.js/PostgreSQL e avvio/arresto usano lo stesso sistema. Gli errori fatali vengono registrati e il processo termina, senza continuare in uno stato incerto. I proxy client/admin inoltrano `x-request-id` nella risposta senza introdurre coupling tra app. I client esistenti gestiscono il codice additivo `internal_error` conservando le protezioni dal doppio invio.

R10. Gli eventi ricevuti da Sentry identificano correttamente la piattaforma Node. I frame applicativi TypeScript (.ts/.tsx) risultano in-app; i frame normalizzati .js delle dipendenze non sono marcati come applicativi. La ricostruzione finale dell'evento deve conservare questi attributi senza reintrodurre percorsi assoluti, dati personali o messaggi arbitrari.

Caso concreto di R2/R4: errore PostgreSQL con code53000 (quota/capacità del provider non disponibile) produce 503 service_unavailable, category dependency; la diagnostica conserva error.code53000 senza il messaggio grezzo del provider. Non implica che un retry immediato possa rimuovere un limite di piano.
