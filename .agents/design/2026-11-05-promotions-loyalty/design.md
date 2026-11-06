# Coupon e fedeltà persistenti

Incremento D11/D64-D67 dopo il gate gruppo verificato. Configurazione commerciale nell'admin reale; prezzi, quote, punti, limiti e movimenti nel servizio checkout. Non si avviano email, abbonamenti o pricing AI.

Il carrello individuale e il fulfillment del gruppo ricevono soltanto la selezione `{couponCodes, redeemReward}`. L'organizzatore è l'unico beneficiario del gruppo. Il motore canonico calcola prodotti/opzioni, disponibilità, delivery e slot; un'estensione economica sotto lo stesso lock applica percentuali in sequenza, fissi e un premio, solo ai prodotti. Nessun totale o saldo numerico proviene dal browser. Quote senza benefici selezionati restano esattamente compatibili con payload e fingerprint precedenti.

La configurazione iniziale modificabile è programma attivo, 1 punto/euro netto prodotti, premio 100 punti/500 centesimi. Il tasso e le condizioni del premio vengono congelati per l'ordine; configurazioni successive non ricalcolano quanto confermato. Nessuna scadenza punti. I coupon sono identificati per sede, hanno codice, validità, soglie, prodotti ammessi, limiti e revisione; disattivazione e modifica sono operazioni admin autorizzate.

Le quote non prenotano. Checkout e riserve coupon/punti sono atomici con la creazione dell'ordine, prima di Stripe: il repository condiviso impedisce overspend e ultimo utilizzo concorrente. Gli ordini pending carta impegnano gli usi; la submission li consuma. Annullamento, fallimento definitivo o scadenza autorevole rilasciano benefici; un esito incerto li conserva. Il journal fedeltà persistente registra riscatto e accredito completamento una sola volta, anche per azioni rider e worker, retry e riavvio. Non viene retroaccreditata la storia già completata.

Gli aumenti prima accettazione usano il delta canonico a prezzo pieno; conservano sconto e premio originali, non riapplicano coupon. I punti finali sono `floor(subtotale prodotti netto complessivo × tasso congelato / 100)`, includendo gli aumenti applicati ed escludendo delivery e valore coperto dal premio.

La UI cliente mostra saldo, punti impegnati e regole, permette codici coupon e un riscatto nel checkout individuale e host gruppo; riepilogo server esplicito. L'admin crea, edita, disattiva coupon e modifica programma. I port pubblici sono `PromotionsApi` e le estensioni compatibili dei contratti individuale/gruppo. Il POC resta separato. Verifica SDD indipendente RED→GREEN, PostgreSQL su pool distinti e browser admin→cliente→ordine→completamento/annullamento, includendo gruppo e baseline canoniche.
