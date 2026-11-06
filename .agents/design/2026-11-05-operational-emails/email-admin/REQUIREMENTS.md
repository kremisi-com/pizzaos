# Esperienza admin

La sede operativa ha una scheda «Email operative» con stato inviato/in attesa/invio in corso/nuovo tentativo/bloccato, evento italiano, identificativo ordine, destinatario, numero tentativi, ultimo aggiornamento, prossimo retry ed errore sanitizzato. Non contiene impostazioni SMTP, segreti o azioni per simulare l'invio. L'operatore può aggiornare la lettura; il polling recupera cambiamenti anche senza eventi ordine.

Un errore SMTP non impedisce accettazione/preparazione/completamento dell'ordine. Il pannello spiega che il servizio riprova automaticamente e che il cliente vede sempre lo stato nell'app; WhatsApp resta manuale. Dopo retry riuscito lo stesso record passa a inviato senza duplicare il messaggio applicativo. Cambio sede non mostra dati residui di altra sede, errori di caricamento prevedono riprova. Nessun accesso rider/guest/altro tenant.

Browser: cliente invia ordine contanti con nota test; worker fakeSMTP isolato fallisce una volta, admin vede errore e retry, può accettare ordine durante errore, poi pannello diventa inviato senza reload manuale. Altra transizione mostra nuovo evento in sequenza. Gruppo riceve soltanto host (test servizio), riderdispatch genera evento corretto, no raccolta/guest emails. Client ordine continua funzionante anche con provider in errore.
