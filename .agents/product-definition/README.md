# Definizione di prodotto PizzaOS

Questa cartella sostituisce progressivamente la pianificazione POC con una specifica verificabile del prodotto da costruire. Le decisioni non ancora confermate restano aperte: non vanno inferite dai mock, dalla landing o da contratti non implementati.

## Stato

- `flow-inventory.md` — ricognizione iniziale dei flussi, delle basi già presenti e delle decisioni mancanti.
- `decisions.md` — registro canonico delle decisioni, stato, dipendenze e blocchi.
- `flows/` — specifiche per flussi utente e operativi; l'ordinazione pilota è in `flows/customer-ordering-and-payment.md`.
- `architecture/` — contratti e ownership target; da aggiornare dopo le decisioni funzionali.
- `roadmap.md` — incrementi del pilota, verifiche e capacità secondarie; la sequenza successiva autorizzata è in `sequential-increments.md`.

## Incrementi verificati localmente

Il flusso individuale D49-D55 e gli incrementi gruppo, coupon/fedeltà ed email operative D61-D70 sono completati e verificati localmente. La [sequenza e i riesami](sequential-increments.md) distinguono implementazione, prove locali e verifiche esterne ancora necessarie. Le capacità rinviate restano nel perimetro del prodotto. Le configurazioni commerciali modificabili restano di competenza dell’admin.

Il 5 novembre 2026 il client è stato pubblicato sul pilota test e il percorso individuale cliente → admin → rider è riuscito online con Google, Stripe Elements/challenge 3DS e tre email operative Delivered. Il [verbale persistente](../../services/checkout-api/online-client-verification.md) registra versioni, risultati e limiti: prova su dispositivi fisici distinti e protezione da bozze di configurazione obsolete ancora aperte. Consultarlo prima di riproporre le stesse verifiche come lavoro mai eseguito.

## Regole di migrazione dei documenti

Le estensioni D57-D60 sono specificate negli SDD [analytics](../design/2026-11-05-pilot-analytics/design.md), [consegne rider](../design/2026-11-05-rider-deliveries/design.md) e [integrazione](../design/2026-11-05-pilot-integration/design.md). Il servizio conserva un unico ordine autorevole per cliente, operatore e rider; il [deploy pilota](architecture/pilot-deployment.md) distingue gli ambienti e i domini D71.

1. I documenti `.agents/planning/PizzaOS_POC/` sono la fonte storica delle scelte POC; non si cancellano finché le nuove specifiche non li sostituiscono esplicitamente.
2. I design in `.agents/design/` documentano interventi completati o refactor specifici e restano nella loro posizione.
3. Le specifiche di prodotto definitive devono indicare comportamento osservabile, casi limite, attori, dati posseduti e responsabilità tra app e servizi.
4. Un contratto esistente non equivale a un flusso definito né a una capacità implementata.
5. Tenere un indice e collegamenti alle fonti; evitare copie divergenti della stessa regola.

## Gate delle decisioni

Prima di un'attività, caricare l'indice e solo la specifica del flusso interessato. Verificare in `decisions.md` le decisioni indispensabili: se una è aperta, rinviata o da validare, fermare la parte dipendente e chiedere quella scelta; segnalare ID e alternative. Non bloccare parti indipendenti e non ripetere domande già risolte. Il registro centrale va aggiornato ogni volta che l'utente conferma o cambia una scelta.
