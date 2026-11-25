# Definizione di prodotto PizzaOS

Questa cartella descrive il prodotto corrente. Iniziare dallo [stato del sistema e punto zero](current-state.md), poi caricare il solo flusso interessato. Le decisioni non ancora confermate restano aperte: non vanno inferite dai mock, dalla landing o da contratti non implementati.

## Stato

- [`flow-inventory.md`](flow-inventory.md) — indice corrente dei 24 flussi, delle fonti proprietarie e delle lacune residue.
- `decisions.md` — registro canonico delle decisioni, stato, dipendenze e blocchi.
- `flows/` — specifiche per flussi utente e operativi; l'ordinazione pilota è in `flows/customer-ordering-and-payment.md`.
- `architecture/` — topologia del pilota e configurazione per ambiente.
- [`roadmap.md`](roadmap.md) — lavoro residuo e criteri di rilascio; la sequenza completata è nell'[archivio](../archive/README.md).

## Stato e verifiche

Il [punto zero](current-state.md) distingue capacità operative, demo, verifiche locali e ultimo stato online registrato. I riesami datati attestano soltanto gli incrementi/versioni provati. Le configurazioni commerciali modificabili restano di competenza dell'admin.

Il [registro online](../../services/checkout-api/online-deployment.md) e il [verbale del 5 novembre](../../services/checkout-api/online-client-verification.md) documentano prove sandbox. La protezione delle configurazioni obsolete è introdotta nella stabilizzazione locale del 25 novembre; il collaudo del relativo rilascio e la prova su dispositivi fisici distinti restano separati.

## Documenti correnti e archivio

Le specifiche correnti coprono [accessi](flows/identity-and-access.md), [sede](flows/store-configuration.md), [operazioni/rider](flows/operations-and-delivery.md), [analytics](flows/analytics.md) e gli altri flussi elencati nell'inventario. Il [deploy pilota](architecture/pilot-deployment.md) distingue ambienti e domini D71.

La pianificazione POC, la ricerca iniziale, la sequenza completata e il piano di ripristino superato sono nell'[archivio](../archive/README.md); le fonti correnti li sostituiscono come ingresso al prodotto. I design in `.agents/design/` restano nella loro posizione come evidenze tecniche datate. Un contratto o una schermata demo non equivalgono a una capacità implementata. Evitare copie divergenti della stessa regola.

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

Le regole economiche e operative si definiscono nella fonte proprietaria e si richiamano tramite link dagli indici. Non copiarle in ogni README. Per il comportamento corrente valgono i flussi indicati nell'inventario. Le capacità demo/da definire non hanno ancora una specifica operativa completa; gli SDD conservano il contesto e le prove dei rispettivi incrementi.

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
