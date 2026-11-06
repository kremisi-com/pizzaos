# Coupon e fedeltà

Fonte D11/D64-D67, dopo il gruppo verificato. Il ristoratore configura programma e coupon nell'admin reale. Default modificabili: 1 punto/euro netto prodotti, premio 100 punti=5 euro prodotti, nessuna scadenza. Il cliente usa codici coupon e al massimo un premio nel checkout individuale o come host del gruppo; gli invitati non ricevono saldo o benefici propri sull'ordine comune.

Percentuali in sequenza, poi fissi e premio; prodotti ammessi e minimo prima degli sconti, delivery esclusa, netto mai negativo. I server calcolano e verificano prezzi, saldo e limiti al pagamento. Quote senza riserve; pending carta impegna benefici atomicamente con scorte/slot, invio consuma coupon, esito incerto mantiene impegni. Annullamento/fallimento definitivo restituisce punti e utilizzi una sola volta.

I punti maturano soltanto a completamento: floor della spesa netta prodotti finale moltiplicata per il rapporto configurato, senza consegna/mance o spesa coperta dal premio. L'host pagante riceve i punti del gruppo. Retry e riavvio non duplicano movimenti. Gli aumenti canonici conservano benefici originali e usano delta pieno, senza applicare nuovamente coupon/premio.

Specifica corrente: `../../design/2026-11-05-promotions-loyalty/`. Email operative e abbonamenti restano fuori da questo incremento.
