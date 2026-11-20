# Definizione di prodotto PizzaOS

Questa cartella sostituisce progressivamente la pianificazione POC con una specifica verificabile del prodotto da costruire. Le decisioni non ancora confermate restano aperte: non vanno inferite dai mock, dalla landing o da contratti non implementati.

## Stato

- [`flow-inventory.md`](flow-inventory.md) — indice corrente dei 24 flussi, delle fonti proprietarie e delle lacune residue.
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

## Fonti e responsabilità

| Informazione | Fonte proprietaria | Quando aggiornarla |
|---|---|---|
| Scelte di prodotto e vincoli approvati | [Decisioni](decisions.md) | Quando il proprietario del prodotto conferma o cambia una scelta; conservare il contesto delle decisioni precedenti |
| Comportamento corrente, attori e casi limite | Specifica del flusso indicata nell'[inventario](flow-inventory.md) | Nella stessa modifica che cambia il comportamento; collegare le decisioni applicabili |
| Navigazione delle fonti e lacune di copertura | [Inventario](flow-inventory.md) | Quando nasce un flusso, cambia la fonte proprietaria o viene colmata/individuata una lacuna |
| Stato degli incrementi e lavoro residuo | [Roadmap](roadmap.md) | Quando cambia implementazione, verifica o perimetro residuo, con collegamento alle evidenze |
| Architettura attuale e comandi | README del modulo proprietario | Quando cambiano responsabilità, contratti, configurazione o comandi |
| Requisiti tecnici ed evidenze di un incremento datato | SDD e riesami in `../design/` | Durante quell'incremento; gli sviluppi successivi si collegano dalle fonti correnti |
| Risultati di prove e pubblicazioni online | [Verbale online](../../services/checkout-api/online-client-verification.md) e [registro deploy](../../services/checkout-api/online-deployment.md) | Dopo la prova o il rilascio effettivo, indicando data, versione, ambiente e limiti |

Le regole economiche e operative si definiscono nella fonte proprietaria e si richiamano tramite link dagli indici. Non copiarle in ogni README. I requisiti SDD ancora usati come specifica proprietaria sono indicati esplicitamente nell'inventario: la documentazione di prodotto non è ancora uniforme per tutti i flussi.

In caso di disaccordo, distinguere intenzione e realtà: le decisioni approvate vincolano il prodotto; codice e test descrivono l'implementazione osservabile. Una differenza è una lacuna da segnalare e risolvere, senza trasformare automaticamente il comportamento del codice in una decisione approvata. Un vecchio riesame non attesta il funzionamento della revisione corrente.

## Manutenzione nella stessa modifica

Responsabile dell'allineamento è chi modifica il flusso, anche quando è un agente. Chi riesamina la modifica verifica questa checklist prima di considerarla completa:

1. Individuare ID Fxx, fonte proprietaria e decisioni Dxx; leggere solo il contesto coinvolto.
2. Aggiornare la specifica quando cambia il comportamento. Descrivere attore, precondizioni, percorso principale, alternative/errori e risultato atteso; indicare chi possiede dati e transizioni. Per un caso limite, precisare cosa lo provoca e cosa deve osservare l'utente.
3. Aggiungere o aggiornare i test pertinenti al comportamento e ai casi limite modificati. Collegare dalla specifica la suite che li verifica; segnalare esplicitamente gli scenari ancora senza copertura. Non serve un test che controlli solo la presenza di una frase nel documento.
4. Aggiornare dal basso i README coinvolti. Toccare inventario e roadmap solo se cambiano copertura, stato o lacune; non propagare dettagli interni a tutti gli indici.
5. Registrare i controlli realmente eseguiti e gli eventuali skip. Separare **approvato**, **implementato**, **verificato localmente** e **verificato online**, indicando versione/ambiente per le prove online. Modificare un documento non rinnova la data delle prove precedenti.
6. Rileggere il diff per contraddizioni tra le fonti coinvolte e controllare che i link locali risolvano. Prima di un rilascio, riesaminare anche le lacune della roadmap e l'applicabilità delle evidenze al rilascio.

I controlli automatici di test, contratti e collegamenti aiutano a rilevare regressioni e riferimenti rotti; la coerenza semantica tra decisione, specifica e codice resta parte del riesame. Il test esistente `tests/repository-documentation.test.ts` controlla la presenza dei README e degli entry point, non la correttezza dei flussi né tutti i loro link.
