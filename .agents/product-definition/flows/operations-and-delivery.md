# Operazioni, preparazione e consegne

Owner: checkout-api per ordine, riserve e avanzamento; modulo consegne per assegnazioni e problemi; admin/rider per le interazioni. Copre F12–F14 e D17/D18/D36/D49/D54/D57/D58. Esiste un solo ordine autorevole condiviso con cliente, [pagamenti](customer-ordering-and-payment.md), [promozioni](promotions-and-loyalty.md) ed [email](operational-emails.md).

## Percorso principale

1. L'ordine in contanti inviato o con carta confermata entra nella coda della sede in attesa di accettazione. La coda mostra scadenza, importi, contatti, articoli, note e stato pagamento/rimborso. SSE e polling recuperano le variazioni, senza avanzamenti simulati nel browser.
2. L'operatore accetta, avvia la preparazione e dichiara l'ordine pronto. Per il ritiro completa e registra i contanti dovuti. Per la consegna assegna manualmente un rider attivo della stessa sede.
3. Il rider vede solo le consegne proprie pronte/in corso. Avvia e completa la consegna; la transizione canonica aggiorna scorte, incasso contanti, punti, analytics ed email una sola volta.
4. Completati e annullati escono dall'elenco consegne attive. La coda/storico restano nel servizio dopo riavvio. La navigazione admin e la scelta sede sono descritte nelle [interfacce](poc-and-interface.md).

## Alternative e casi limite

- Scadenza o annullamento: si applicano tempi e rimborsi della [specifica ordine](customer-ordering-and-payment.md). Attesa cliente sospende la scadenza e mantiene riserve/slot finché l'operatore risolve; niente sostituzioni silenziose.
- Rider assente/non abilitato: nessun accesso operativo. Abilitare una email non invia un invito automatico. Ripetere l'abilitazione non duplica né riattiva implicitamente; riattivazione esplicita necessaria.
- Si assegnano solo delivery pronti/in consegna. Pickup, ordini terminali e rider di un'altra sede sono rifiutati. Assegnazione identica senza problema è idempotente.
- Il rider segnala un problema con nota non vuota (massimo 2.000 caratteri) solo su consegna propria in corso. L'ordine resta in consegna; partenza/completamento sono bloccati finché l'operatore riassegna, anche allo stesso rider per un nuovo tentativo, oppure annulla secondo il flusso canonico.
- Riassegnazione fra lettura e azione: il vecchio rider perde accesso; il servizio ricontrolla l'assegnazione nella transazione di avanzamento. Il problema non completa l'ordine e ripetere la stessa nota non duplica eventi.
- Rider non può accettare/annullare, rimborsare, cambiare note cliente o configurare la sede. Riceve nome/telefono, indirizzo, note, articoli e contanti dovuti; non email cliente, identificativi Stripe o dati di magazzino.
- Rete interrotta o errore provider: mostrare stato autorevole e retry consentiti. Un rimborso fallito non significa ordine riaperto o rimborso già accreditato.

## Verifiche e confini

[Servizio ordini](../../../services/checkout-api/src/ordering-service.test.ts), [consegne](../../../services/checkout-api/src/delivery/delivery-service.test.ts), [integrazione](../../../services/checkout-api/src/pilot-extensions.test.ts), [UI rider](../../../apps/admin/src/test/rider-deliveries.test.tsx), [browser estensioni](../../../tests/e2e/pilot-extensions.spec.ts), [browser individuale](../../../tests/e2e/individual-ordering.spec.ts). GPS, ottimizzazione percorsi e logistica esterna non sono implementati da questo flusso. Le evidenze sandbox datate sono nel [registro online](../../../services/checkout-api/online-deployment.md).
