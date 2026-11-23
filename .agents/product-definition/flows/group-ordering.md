# Ordine di gruppo

Fonte: D61-D63. L'organizzatore autenticato apre una raccolta per ristorante e sceglie la scadenza; condivide un link. Gli invitati entrano con nome senza account e possono modificare solo le proprie scelte. L'organizzatore può eliminare articoli e partecipanti. Gli inviti funzionano tra dispositivi distinti con dati persistenti server.

La scadenza chiude la raccolta automaticamente; l'organizzatore può chiuderla prima. Non rappresenta uno slot di consegna e non genera ordini o pagamenti. Durante raccolta non si riservano ingredienti o capacità. Alla conferma l'organizzatore verifica prezzi/disponibilità correnti, corregge conflitti, sceglie un solo indirizzo e slot, conferma e paga il totale con carta o contanti.

Il ristorante riceve un solo ordine con articoli attribuiti ai partecipanti. Dopo l'invio solo l'organizzatore gestisce l'ordine secondo il flusso individuale. Gli invitati non ricevono contatti del cliente o dati di pagamento. Nessun pagamento separato. [Coupon/fedeltà](promotions-and-loyalty.md) ed [email operative](operational-emails.md) sono stati integrati dopo la verifica del gruppo: benefici, punti ed email spettano all'organizzatore pagante.

Il servizio gruppo possiede raccolta, accessi e revisioni persistenti; il servizio ordini possiede il checkout canonico. Il client gestisce le interazioni attraverso i contratti pubblici.

L'organizzatore sceglie tra le [stesse finestre e disponibilità del checkout individuale](customer-ordering-and-payment.md#calendario-e-capacità). L'intero gruppo occupa un posto e un conflitto di capacità conserva la raccolta.

## Casi limite e verifiche

- Un invitato tenta di cambiare le scelte altrui: il servizio nega l'azione; i contributi restano personali.
- Scade la raccolta o l'organizzatore la chiude prima: si chiudono le scelte, senza inviare un ordine, pagare o riservare stock/slot.
- Prezzi, prodotti o capacità cambiano durante la raccolta: l'organizzatore risolve i conflitti e riconferma prima del checkout.
- Retry o errore pagamento: valgono le regole di recupero e idempotenza dell'[ordine individuale](customer-ordering-and-payment.md).

Requisiti completi: [servizio gruppo](../../design/2026-11-05-group-ordering/group-service/REQUIREMENTS.md) e [superfici](../../design/2026-11-05-group-ordering/group-surfaces/REQUIREMENTS.md). Verifiche: [test servizio](../../../services/checkout-api/src/group/group-service.test.ts), [browser multi-identità](../../../tests/e2e/persistent-group.spec.ts). Evidenze locali: [riesame](../../design/2026-11-05-group-ordering/REVIEW.md); non attestano una prova online completa del gruppo.
