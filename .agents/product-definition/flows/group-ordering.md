# Ordine di gruppo

Fonte: D61-D63. L'organizzatore autenticato apre una raccolta per ristorante e sceglie la scadenza; condivide un link. Gli invitati entrano con nome senza account e possono modificare solo le proprie scelte. L'organizzatore può eliminare articoli e partecipanti; sui contributi altrui il servizio consente soltanto rimozioni e riduzioni di quantità, mantenendo personalizzazioni e note. Gli inviti funzionano tra dispositivi distinti con dati persistenti server.

La scadenza chiude la raccolta automaticamente; l'organizzatore può chiuderla prima. Non rappresenta uno slot di consegna e non genera ordini o pagamenti. Durante raccolta non si riservano ingredienti o capacità. Alla conferma l'organizzatore verifica prezzi/disponibilità correnti, corregge conflitti, sceglie un solo indirizzo e slot, conferma e paga il totale con carta o contanti.

Il ristorante riceve un solo ordine con articoli attribuiti ai partecipanti. Dopo l'invio solo l'organizzatore gestisce l'ordine secondo il flusso individuale. Gli invitati non ricevono contatti del cliente o dati di pagamento. Nessun pagamento separato. [Coupon/fedeltà](promotions-and-loyalty.md) ed [email operative](operational-emails.md) sono stati integrati dopo la verifica del gruppo: benefici, punti ed email spettano all'organizzatore pagante.

Il servizio gruppo possiede raccolta, accessi e revisioni persistenti; il servizio ordini possiede il checkout canonico. Il client gestisce le interazioni attraverso i contratti pubblici.

Sul [sito pubblico di una sede](customer-ordering-and-payment.md#sottodomini-delle-sedi) la raccolta usa la sede dell'indirizzo. L'invito resta sullo stesso host. L'API rifiuta la creazione per una sede diversa e gli inviti a raccolte di altre sedi.

L'organizzatore sceglie tra le [stesse finestre e disponibilità del checkout individuale](customer-ordering-and-payment.md#calendario-e-capacità). L'intero gruppo occupa un posto e un conflitto di capacità conserva la raccolta.

Per la consegna l’organizzatore usa lo stesso [campo indirizzo con autocompletamento](customer-ordering-and-payment.md#indirizzo-di-consegna). La sola via non abilita il preventivo. Se l’organizzatore modifica l’indirizzo dopo aver visto il totale, verifica di nuovo prima dell’invio. Se la ricerca è indisponibile può ritentare o scegliere il ritiro.

## Casi limite e verifiche

L'organizzatore può premere **Mostra QR** accanto al link invito e nasconderlo con **Nascondi QR**. Il QR viene generato nel browser e codifica esattamente il link completo, con origine della sede e frammento invito; nessun token è inviato a generatori esterni. Chi lo scansiona apre lo stesso ingresso degli invitati via link e inserisce il proprio nome senza account. Non cambia le autorizzazioni: dopo la chiusura la scansione mostra la raccolta chiusa, senza permettere nuove scelte. Il QR è disponibile solo all'organizzatore che riceve il token invito dal servizio, anche dopo il ricaricamento; il link resta copiabile senza mostrare il QR.

La suite [browser multi-identità](../../../tests/e2e/persistent-group.spec.ts) decodifica il QR SVG e usa l'URL risultante per l'ingresso di un ospite distinto; verifica anche il layout mobile. I [test client](../../../apps/client/src/test/persistent-group.test.tsx) verificano apertura/chiusura del QR e assenza del comando per l'invitato. Questa copertura locale non attesta una scansione con fotocamera su un dispositivo fisico.

Verifica locale del 25 novembre 2026 per il QR: 134 test client, lint, typecheck, build isolata `.next-qr-build` e controllo architettura superati. Passano i tre scenari browser gruppo, inclusa decodifica e ingresso via QR. La suite combinata gruppo/individuale ha 9 successi e un errore estraneo al QR: lo scenario sidebar admin attende un titolo «Menu pubblicato», mentre la schermata corrente espone questa informazione come stato. Nessuna nuova verifica online eseguita.

Verifica locale del 26 novembre 2026 per i permessi UI dell'organizzatore: 176 test client (14 nella suite gruppo persistente) e 28 test servizio gruppo superati, inclusi i due test calendario segnalati intermittenti nell'audit. Lint, typecheck, build client isolata `.next-group-permissions-build` e controllo architettura superati. I tre scenari browser gruppo passano dopo aver aggiornato il passaggio di aggiunta prodotto del test alla conferma nel dettaglio già prevista dal menu corrente. Nessuna nuova verifica online eseguita.

- L'organizzatore vede un articolo personalizzato di un invitato, a raccolta aperta o chiusa: dettagli e note restano leggibili, ma la riga non offre l'editor di personalizzazione né campi note. Restano disponibili rimozione dell'articolo e del partecipante, con i blocchi esistenti durante un tentativo di checkout o dopo l'invio. L'organizzatore conserva l'editor per il proprio contributo. I [test client](../../../apps/client/src/test/persistent-group.test.tsx) verificano l'assenza dell'editor altrui, le rimozioni e il salvataggio di personalizzazioni e note proprie per host e invitato. Nessun ampliamento dei permessi del servizio.
- Un invitato tenta di cambiare le scelte altrui: il servizio nega l'azione; i contributi restano personali.
- Scade la raccolta o l'organizzatore la chiude prima: si chiudono le scelte, senza inviare un ordine, pagare o riservare stock/slot.
- Prezzi, prodotti o capacità cambiano durante la raccolta: l'organizzatore risolve i conflitti e riconferma prima del checkout.
- Retry o errore pagamento: valgono le regole di recupero e idempotenza dell'[ordine individuale](customer-ordering-and-payment.md).

Requisiti completi: [servizio gruppo](../../design/2026-11-05-group-ordering/group-service/REQUIREMENTS.md) e [superfici](../../design/2026-11-05-group-ordering/group-surfaces/REQUIREMENTS.md). Verifiche: [test servizio](../../../services/checkout-api/src/group/group-service.test.ts), [browser multi-identità](../../../tests/e2e/persistent-group.spec.ts). Evidenze locali: [riesame](../../design/2026-11-05-group-ordering/REVIEW.md); non attestano una prova online completa del gruppo.
