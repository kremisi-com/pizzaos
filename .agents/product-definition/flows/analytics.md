# Analytics operative

Owner: modulo analytics del checkout-api per journal e aggregazioni; admin per filtri e presentazione. Copre la parte persistente di F19, D59/D60. AI, BI avanzata, prezzi automatici ed esportazioni non sono inclusi.

L'operatore autorizzato sceglie sede e periodo: oggi, ultimi 7/30 giorni inclusi oggi, oppure date personalizzate inclusive. Il servizio usa il fuso IANA della sede (Europe/Rome per vecchie sedi senza fuso), non quello del browser. Restituisce date locali ed estremi UTC con fine esclusa; i cambi d'ora rispettano anche giornate di 23/25 ore.

Il rapporto mostra ordini completati, vendite in centesimi EUR, media ordine arrotondata al centesimo, annullati e prodotti più ordinati. Due completati da 1.200 e 1.801 centesimi producono 2 ordini, 3.001 vendite e media 1.501; annullati e stati intermedi non aumentano le vendite. Carta e contanti completati contano allo stesso modo. Il totale comprende la consegna; non rappresenta utile o saldo contabile.

La data è quella della transizione terminale, non di creazione. Retry, letture e aggiornamenti del rimborso non duplicano conteggi. Il journal è salvato nella stessa transazione dell'ordine e sopravvive al riavvio. Gli ordini storici terminali senza journal non vengono retrodatati usando createdAt.

Per il [carrello condiviso](group-ordering.md), i rimborsi monetari riusciti dopo l'invio riducono vendite e media ordine, conservando conteggio, data di completamento e prodotti della comanda. Esempio: ordine completato da 1.700 centesimi, quota rimborsata da 800 -> 900 centesimi di vendite; rimborso pending/fallito resta a 1.700 fino a esito positivo. Quote annullate prima dell'invio sono già escluse dal totale finale, senza seconda sottrazione. Verifica indipendente: [notifiche, analytics e fedeltà](../../../services/checkout-api/src/group/shared-cart-notifications.contract.test.ts).

I prodotti usano ID, quantità e nome degli snapshot acquistati, indipendentemente dal catalogo corrente. Ordinamento per quantità decrescente, poi ID crescente; nome dallo snapshot più recente nel periodo, a parità istante orderId crescente. Un periodo vuoto produce zeri ed elenco vuoto. Date inesistenti, mancanti/invertite o fuso invalido sono rifiutati.

Sessione assente: 401; cliente/rider senza ruolo operatore: 403. Rapporti non espongono contatti cliente o dati provider. I filtri restano selezionati durante gli aggiornamenti operativi.

[Test aggregazioni e fuso](../../../services/checkout-api/src/analytics/analytics.test.ts), [integrazione HTTP/journal](../../../services/checkout-api/src/pilot-extensions.test.ts), [UI](../../../apps/admin/src/test/pilot-analytics.test.tsx), [browser](../../../tests/e2e/pilot-extensions.spec.ts), [README proprietario](../../../services/checkout-api/src/analytics/README.md). Le prove online di un ordine non certificano tutti i filtri e i casi DST.
