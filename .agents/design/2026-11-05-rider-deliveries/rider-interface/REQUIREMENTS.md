# Vista rider

Una vista mobile italiana riceve un port RiderDeliveryApi. Mostra login quando sessione assente; se autenticato senza appartenenze rider mostra accesso non abilitato. Visualizza soltanto l'elenco ricevuto dal servizio, senza fallback mock.

Per ciascuna consegna mostra sede, riferimento, indirizzo, nome/telefono destinatario, note, riepilogo articoli, eventuali contanti dovuti e problema aperto. Da ready può avviare; da out_for_delivery senza problema può completare o segnalare una nota di problema. Dopo un problema mostra attesa intervento del ristorante e nessuna azione di completamento. Le azioni in corso non sono duplicabili; errori visibili; aggiornamento manuale e polling autenticato senza modificare stato localmente in modo autorevole. Login e composizione di route/proxy appartengono alla composizione admin.
