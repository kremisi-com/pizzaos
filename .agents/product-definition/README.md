# Definizione di prodotto PizzaOS

Questa cartella sostituisce progressivamente la pianificazione POC con una specifica verificabile del prodotto da costruire. Le decisioni non ancora confermate restano aperte: non vanno inferite dai mock, dalla landing o da contratti non implementati.

## Stato

- `flow-inventory.md` — ricognizione iniziale dei flussi, delle basi già presenti e delle decisioni mancanti.
- `decisions.md` — registro canonico delle decisioni, stato, dipendenze e blocchi.
- `flows/` — specifiche per flussi utente e operativi; l'ordinazione pilota è in `flows/customer-ordering-and-payment.md`.
- `architecture/` — contratti e ownership target; da aggiornare dopo le decisioni funzionali.
- `roadmap.md` — sequenza di rilascio e criteri di completamento, da elaborare quando i flussi sono definiti.

## Regole di migrazione dei documenti

1. I documenti `.agents/planning/PizzaOS_POC/` sono la fonte storica delle scelte POC; non si cancellano finché le nuove specifiche non li sostituiscono esplicitamente.
2. I design in `.agents/design/` documentano interventi completati o refactor specifici e restano nella loro posizione.
3. Le specifiche di prodotto definitive devono indicare comportamento osservabile, casi limite, attori, dati posseduti e responsabilità tra app e servizi.
4. Un contratto esistente non equivale a un flusso definito né a una capacità implementata.
5. Tenere un indice e collegamenti alle fonti; evitare copie divergenti della stessa regola.

## Gate delle decisioni

Prima di un'attività, caricare l'indice e solo la specifica del flusso interessato. Verificare in `decisions.md` le decisioni indispensabili: se una è aperta, rinviata o da validare, fermare la parte dipendente e chiedere quella scelta; segnalare ID e alternative. Non bloccare parti indipendenti e non ripetere domande già risolte. Il registro centrale va aggiornato ogni volta che l'utente conferma o cambia una scelta.

