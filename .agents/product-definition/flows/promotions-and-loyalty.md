# Coupon e fedeltà

Fonte D11/D64-D67, dopo il gruppo verificato. Il ristoratore configura programma e coupon nell'admin reale. Default modificabili: 1 punto/euro netto prodotti, premio 100 punti=5 euro prodotti, nessuna scadenza. Il cliente usa codici coupon e al massimo un premio nel checkout individuale o come host del gruppo; gli invitati non ricevono saldo o benefici propri sull'ordine comune.

Percentuali in sequenza, poi fissi e premio; prodotti ammessi e minimo prima degli sconti, delivery esclusa, netto mai negativo. I server calcolano e verificano prezzi, saldo e limiti al pagamento. Quote senza riserve; pending carta impegna benefici atomicamente con scorte/slot, invio consuma coupon, esito incerto mantiene impegni. Annullamento/fallimento definitivo restituisce punti e utilizzi una sola volta.

I punti maturano soltanto a completamento: floor della spesa netta prodotti finale moltiplicata per il rapporto configurato, senza consegna/mance o spesa coperta dal premio. L'host pagante riceve i punti del gruppo. Retry e riavvio non duplicano movimenti. Gli aumenti canonici conservano benefici originali e usano delta pieno, senza applicare nuovamente coupon/premio.

Il servizio promozioni possiede programma, coupon e movimenti, integrati con le transizioni canoniche dell'ordine. Client e admin usano i contratti pubblici. Le [email operative](operational-emails.md) sono state integrate nell'incremento successivo; gli abbonamenti restano esclusi.

## Casi limite e verifiche

- Due checkout competono per punti o ultimo utilizzo coupon: il controllo server concorrente impedisce il superamento dei limiti.
- Pagamento incerto: gli impegni restano attivi; un retry non duplica utilizzi o movimenti.
- Annullamento o fallimento definitivo: punti e utilizzi sono restituiti una sola volta. Un ordine annullato non matura punti.
- Il totale arriva a zero: la conferma server non richiede un addebito Stripe, anche se è selezionata la carta.
- Il gruppo completa l'ordine: punti e benefici appartengono al solo organizzatore; le aggiunte successive non riapplicano i benefici originali.

Requisiti completi: [economia](../../design/2026-11-05-promotions-loyalty/promotion-economics/REQUIREMENTS.md) e [superfici](../../design/2026-11-05-promotions-loyalty/promotion-surfaces/REQUIREMENTS.md). Verifiche: [concorrenza PostgreSQL](../../../services/checkout-api/src/promotions/promotions-postgres.test.ts), [totale zero client](../../../apps/client/src/test/promotions-zero-total.test.tsx), [browser](../../../tests/e2e/promotions-loyalty.spec.ts). Evidenze locali: [riesame](../../design/2026-11-05-promotions-loyalty/REVIEW.md); la prova online dell'individuale non attesta tutti questi scenari.
