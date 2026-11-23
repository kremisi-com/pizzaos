# Ingresso alla demo dalla landing

I due CTA dopo un invio demo riuscito aprono rispettivamente il POC cliente e ristorante. L'endpoint mail rimane la prova di invio riuscito. Un pass firmato, di breve durata e specifico per destinazione, sostituisce l'immissione della password in questo percorso. La sessione risultante è la stessa sessione demo isolata già usata da `/poc`. Le richieste di contatto restano semplici messaggi.

La navigazione usa una form POST nativa per superficie, così il pass viaggia nel corpo e l'URL finale è sempre `/poc`. Ogni app inoltra unicamente questo POST di accesso dalla landing al servizio, che verifica origine e firma. Non occorre persistenza per i pass, riutilizzabili per la sola demo dell'host destinatario fino alla loro scadenza. La password demo è mantenuta sul servizio per la disattivazione e l'accesso manuale.
