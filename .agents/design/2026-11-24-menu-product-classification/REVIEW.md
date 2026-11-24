# Riesame del 24 novembre 2026

## Approvazione e implementazione

D83 approva scheda unica con spunta Pizza, riclassificazione verificabile in bozza ed extra Magazzino comuni a tutti i gusti/formule. Implementazione nei moduli proprietari domain, Admin, servizio e dettaglio Client. Nessun flag di classificazione duplicato, nuovo endpoint, DDL o accoppiamento fra applicazioni.

Il salvataggio sincronizza i soli extra abilitati, separa la dose extra dalla ricetta inclusa e conserva la firma commerciale. La pubblicazione verifica firma e completezza. La riclassificazione conserva identità, contenuti, posizione, allergeni e gruppi specifici; la nuova pizza vuota parte dagli standard. Le incompatibilità restituiscono errori prima di alterare la bozza. Il menu ordinario non richiede standard o extra pizza inutilizzati.

## Metodo SDD e revisione

L'agente di test ha ricevuto soltanto requisiti/contratti e dichiarazioni pubbliche necessarie alle fixture, senza leggere l'implementazione. RED iniziale verificato su API di classificazione assente, checkbox assente e gruppi specifici non presentati nel dettaglio. Ulteriori regressioni sono state riprodotte e coperte prima dei fix: creazione con standard, menu ordinario dopo conversione inversa, allergeni, associazioni legacy, collisioni degli ID, ingredienti con ID lunghi e sostituzioni di ingredienti standard esauriti. Le prove HTTP aggiuntive verificano anche invalidità sorgenti, obbligatorietà, ripetizioni, scorte e pubblicazione obsoleta.

La revisione indipendente ha individuato i casi limite sopra; sono stati corretti e verificati. Gli ID degli extra mantengono riferimenti espliciti al Magazzino senza assumere che l'ID ingrediente sia concatenabile entro i limiti. La composizione pubblica permette le rimozioni specifiche degli ingredienti standard; il servizio resta autorevole sulle scorte effettive.

## Verifica locale

- `pnpm exec vitest run apps/admin/src/test apps/client/src/test packages/domain/src services/checkout-api/src --reporter=dot`: **100 file passati, 920 test passati; 6 file / 22 test saltati** perché richiedono database/integrazioni dedicati. Non costituisce una nuova verifica PostgreSQL reale.
- `pnpm exec playwright test --config playwright.menu-ordering.config.ts`: **4 scenari passati**, inclusi classificazione/annullamento, salvataggio/pubblicazione, gruppi specifici nel cliente, extra comuni, preventivo 10,20 €, acquisto semplice della birra e regressioni delle formule.
- Typecheck dei quattro moduli e build TypeScript domain/servizio: superati.
- Lint dei quattro moduli e `pnpm architecture:check`: superati, inclusi i quattro test del controllo architetturale.
- Build Next Admin e Client con directory isolata `.next-classification-build`: superate.
- `pnpm exec vitest run tests/repository-documentation.test.ts`: 3 test superati; collegamenti locali dei documenti modificati verificati separatamente.
- Screenshot desktop della scheda e del riepilogo e screenshot mobile del dettaglio ispezionati; controlli e prezzo leggibili. Artefatti locali generati da Playwright sotto `test-results/menu-ordering`.

Le fixture browser precedenti sono state allineate alla nuova regola: le formule usano un ingrediente esplicitamente abilitato nel Magazzino, e il selettore della sezione Extra distingue il titolo dalla categoria omonima.

## Limiti ed evidenze online

Verifica su servizio isolato e repository transazionale del test harness; nessuna modifica di database, menu o ordini online. Le prove precedenti del pilota non attestano questo incremento. Standard, ricette, dati alimentari ed extra del menu reale restano da verificare dall'operatore in bozza prima della pubblicazione. I prodotti esistenti non vengono classificati dal nome; le conversioni avvengono esplicitamente dal pannello.

## Aggiornamento successivo: rimozione creazione gruppi (D84)

Su richiesta esplicita successiva dell'utente sono stati rimossi i comandi per creare gruppi da pizze e prodotti ordinari, organizzare opzioni precedenti in nuovi gruppi e aggiungere personalizzazioni nella creazione sede. Gli eventuali gruppi salvati restano modificabili, senza cancellazioni dei dati; la sezione pizza vuota viene nascosta. I testi indirizzano a prodotti, abbinamenti e categorie dedicate. Questa modifica supera la possibilità di creare nuovi gruppi prevista da D83, senza modificare gli extra automatici.

Verifiche locali di questo aggiornamento: 28 file / 123 test Admin passati, incluse le asserzioni sui comandi assenti per pizza e prodotto normale; lint, typecheck e build Admin superati. Le prove browser e di servizio sopra restano evidenze dell'incremento D83 e non sono state rieseguite per questa rimozione dei comandi. Nessun rilascio o modifica ai dati online eseguito.
