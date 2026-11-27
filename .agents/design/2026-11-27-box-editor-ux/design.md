# Piano UX per la configurazione Box

Stato: proposta da approvare. La richiesta autorizza la pianificazione, non l'implementazione né l'adozione dei testi proposti. Nessun comportamento corrente viene ridefinito come approvato da questo documento.

## Obiettivo e perimetro

Permettere all'operatore di capire cosa contiene una Box, cosa sceglie il cliente e come cambia il prezzo, senza interpretare i concetti interni del catalogo. Owner: `apps/admin/src/features/catalog`, flussi F04/F05.

Fonti: [catalogo admin](../../../apps/admin/src/features/catalog/README.md), [flusso corrente](../../product-definition/flows/menu-ordering.md#tipi-di-prodotto-panino-box-e-menu), [decisioni](../../product-definition/decisions.md), in particolare D84/D86 e la conferma «Cinque tipi di prodotto e Menu sequenziale» del 26 novembre.

## Riscontri nell'implementazione

- `menu-product-form.tsx` usa Ricetta base anche per Box; il contenuto fisso è una selezione dal Magazzino, con una unità per voce. Non è una selezione di prodotti del catalogo.
- `MenuGroupForm` espone tutti i kind, quantità minima/massima, ripetizioni e l'editor completo di ogni opzione. Ogni opzione contiene nome, supplemento, descrizione, ingredienti aggiunti e possibili rimozioni: il carico non dipende soltanto dalle etichette.
- Il gruppo chiuso mostra soltanto il nome; non permette di verificare quantità, ripetizioni o alternative.
- Nome prodotto include l'indice della riga. Abbinamenti e foto seguono la composizione nello stesso editor.
- Esistono autosalvataggio, validazione server, anteprima e pubblicazione manuale. L'editor va integrato in questi flussi.

La Box mantiene scelte dal Magazzino. Il Menu collega prodotti del catalogo: l'esempio precedente in chat «scegli una pizza» appartiene al Menu e non viene trasferito alla Box.

## Proposta da approvare

1. Conservare l'editor nella scheda attuale, con sezioni leggibili: informazioni, composizione, riepilogo, impostazioni secondarie. Evitare un wizard per la modifica quotidiana.
2. Per Box sostituire Ricetta base con **Sempre incluso nella box**. Aiuto proposto: «Seleziona dal Magazzino ciò che è incluso in ogni box: una unità per voce». Se vuoto, esplicitare che tutto il contenuto può dipendere dalle scelte.
3. Presentare i gruppi come **Scelte del cliente**. Ogni gruppo chiuso riassume quantità, ripetizioni, numero di alternative e presenza di supplementi. I nomi salvati dei gruppi restano invariati.
4. Per i nuovi gruppi Box proporre soltanto il tipo selection, senza selettore tecnico. Rendere sempre riconoscibili e modificabili i gruppi preesistenti di altro tipo attraverso il percorso compatibile attuale, senza conversioni automatiche.
5. Proporre un selettore di voci del Magazzino per aggiungere alternative senza compilare subito una scheda completa. Dopo la selezione, l'operatore conferma nome, composizione e supplemento; nessun prezzo del Magazzino viene interpretato automaticamente come supplemento. Le opzioni complesse esistenti restano modificabili con il loro editor completo.
6. Mostrare per ogni alternativa una riga compatta con nome e supplemento; descrizione, composizione e rimozioni si aprono su richiesta. Valutare controlli «quantità esatta» e «intervallo» che rappresentino min/max senza cambiare le regole salvate.
7. Mostrare un riepilogo della configurazione aggiornato dalla bozza locale: contenuto fisso, regole di ciascun gruppo, prezzo base e supplementi per alternativa. Non chiamarlo preventivo o totale cliente: mancano le scelte effettive e il servizio resta autorevole.
8. Rendere secondari abbinamenti e foto, mantenendo accessibili disponibilità e stato di salvataggio. Spiegare che gli abbinamenti sono acquisti separati.
9. Proporre di rimuovere il numero dall'etichetta Nome prodotto nella sola Box. Nome prodotto, descrizione e titoli salvati non vengono riscritti.

### Decisioni da confermare prima del codice

- Approvazione della struttura nella scheda esistente, senza wizard.
- Etichette e testi di aiuto, inclusa la rimozione dell'indice da Nome prodotto.
- Aggiunta guidata dal Magazzino con conferma esplicita dei dati, mantenendo l'editor completo per casi complessi.
- Controlli quantità esatta/intervallo e posizione delle impostazioni secondarie.

Queste scelte sono proposte, non decisioni aggiunte al registro. Dopo la conferma registrare solo le scelte approvate e riallineare i requisiti prima dell'implementazione. I dati commerciali continuano a essere configurati dal pannello; nessuna modifica diretta a box, nomi o prezzi delle sedi.

## Sequenza

Due incrementi verificabili: [editor](box-composition/REQUIREMENTS.md), poi [riepilogo e flusso completo](box-verification/REQUIREMENTS.md). Task dettagliati in [TASKS.md](TASKS.md). Entrambi dipendono dalla conferma della proposta.

Nell'implementazione applicare TDD della skill SDD: l'agente dei test riceve soltanto REQUIREMENTS e CONTRACT_DESIGN; l'agente di implementazione può leggere INTERNAL_DESIGN. Nessun agente di implementazione è avviato durante la pianificazione.

## Rischi e limiti

- Le opzioni possono rappresentare più ingredienti e rimozioni: non ridurle implicitamente a un singolo articolo.
- Quantità null e riferimenti non risolti devono restare riconoscibili, senza consumi inventati o perdita di dati. Dosi numeriche del contenuto fisso seguono D86 quando si modifica la selezione.
- Il kind non è solo un'etichetta: conservare i dati dei gruppi precedenti e non trasformarli silenziosamente.
- Il riepilogo descrive la bozza locale anche durante salvataggio o errore; non deve suggerire che il cliente la veda già.
- Il checkout contiene modifiche preesistenti: isolare i commit dell'incremento e verificare le dipendenze prima di implementare.

## Verifica e consegna previste

Test di interazione per contenuto fisso, gruppi, alternative, conservazione dei dati e riepilogo; regressioni di autosalvataggio, classificazione, foto e abbinamenti. Test browser dell'admin su desktop e viewport stretto, tastiera/focus/scroll, seguito da salvataggio, ricaricamento, pubblicazione e configurazione cliente.

Comandi: `pnpm --filter @pizzaos/admin lint`, `typecheck`, `test`, `build`; Playwright mirato con `pnpm exec playwright test --config playwright.menu-ordering.config.ts` sui test nuovi e sulle regressioni pertinenti. `pnpm architecture:check` se cambiano confini. Riesame React richiesto dalla skill pertinente dopo modifiche a più componenti TSX.

Nella stessa implementazione aggiornare il README catalogo e il flusso proprietario con casi limite e test. Inventario/roadmap solo se cambia copertura o lavoro residuo. Verificare diff e stato, commit e push dei soli file della richiesta, conferma del commit sul remoto. Un push non attesta un collaudo online.

Questa pianificazione non modifica applicazione, contratti o dati; non richiede l'esecuzione delle suite applicative. Restano da eseguire tutte le verifiche dell'implementazione.
