# Disegno interno

`CustomerOrdersShell` crea adapter HTTP e usa `useCustomerOrderUpdates` sul contratto eventi esistente, senza dipendere dal bootstrap dei carrelli condivisi. Il callback riordino usa i contratti draft e tentativo dall'entry pubblico individual-ordering; non dipende da modelli POC. Le aggiunte sono iniettate dalla composizione.

`OperationalOrdersScreen` possiede lettura sessione/ordini, generazione richieste, selezione ancore, bozze note e comandi. Usa CSS del POC e un foglio aggiuntivo locale per layout senza mappa e dettagli. Modifiche server rileggono senza mutazioni ottimistiche; errori autorizzazione eliminano dati account. Errori transitori lasciano l'ultima lettura visibile. Letture revisionate impediscono rollback UI.

Navbar punta alla pagina; vecchie ancore sono normalizzate dalla shell menu con router.replace. Middleware /orders operativo normalizza al nuovo percorso. Conferme checkout e gruppo cambiano soltanto destinazione. Checkout recupera da ancora ordine e seleziona carta senza inviare nuove richieste checkout.

Checklist: coprire tutti i requisiti 1–8, mantenere demo, preservare modifiche altrui, documentare solo verifiche effettive e commit/push della sola differenza task.
