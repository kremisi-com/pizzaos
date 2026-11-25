# Product customization

Owns the guided pizza choices, price breakdown, allergen presentation, pairing suggestions, and product detail screen. The customization model exposes the selection state, reducer, and derived prices used by the client journey.

The menu supplies product availability. Cart and group order own persisted lines after a choice is added; the client API adapter coordinates those writes. Ingredient and product contracts come from `@pizzaos/domain`.

The add-to-cart action becomes enabled after browser hydration and demo state recovery, so a direct product navigation cannot accept a click before its handler is ready.

Run `pnpm --filter @pizzaos/client test` for customization model and product detail coverage.

## Composizione persistente

`LivePizzaEditor`, esportato dall'entry point della feature, riceve catalogo pubblico, riga eventuale e callback dalla composizione del menu. Usa le sezioni espandibili Impasto, Formato, Ingredienti, Extra, note, abbinamenti e CTA fissa. La base è un ingrediente ordinario; la sezione Base rimane soltanto per menu precedentemente pubblicati che la prevedono ancora. Il formato determina il consumo della voce di Magazzino dell'impasto scelto, ricalcolato esclusivamente dal servizio; il catalogo pubblico non espone dosi. `CollapsibleSection` è condivisa con il PoC; le sezioni chiuse sono escluse dall'interazione da tastiera.

Le scelte e le impostazioni standard provengono dalla proiezione del servizio. Il client non ricava regole dai nomi commerciali e non legge dati demo nel flusso persistente. Gusti e formule mantengono identità distinte nella riga; le formule custom iniziano senza gusto, indipendentemente dal loro nome. Il dettaglio operativo mostra soltanto il ritorno al menu prima del nome della pizza, senza anteprima, placeholder o frase introduttiva. Omette anche la dicitura «Informazione da verificare»; gli allergeni della composizione restano visibili. Il prezzo locale anticipa il preventivo autorevole del servizio.

La modifica mantiene quantità e note. Se una scelta non esiste più o è esaurita, il cliente può ripartire dalle scelte standard; quelle obsolete non vengono eliminate silenziosamente. Gli abbinamenti semplici si aggiungono come righe separate durante la nuova composizione. La suite `src/test/live-pizza-editor.test.tsx` verifica scelte standard, supplementi, rimozioni, extra ripetuti e recupero delle righe obsolete.

`initialSelections` consente di inizializzare esplicitamente nuove composizioni; il menu operativo usa gli standard della pizza scelta senza selettori preventivi. Si applica soltanto alle nuove composizioni: `line` ha sempre precedenza. Le funzioni pubbliche `pizzaInitialSelections` e `pizzaPreview` traducono riferimenti espliciti in selezioni e anteprime, senza dedurre asset o ricette dai nomi. Il prezzo mostrato nel dettaglio segue la composizione corrente; il preventivo del servizio rimane autorevole. Le formule leggono quota e percentuale da `extraOffer`, indipendentemente dal nome commerciale.

Le pizze riclassificate possono conservare gruppi specifici oltre alle sezioni automatiche. `LivePizzaEditor` li mostra separatamente con min/max, singola o multipla scelta, contatori ripetibili, prezzi, disponibilità e rimozioni originali; le scelte obbligatorie bloccano la CTA finché completate. [Test](../../test/pizza-specific-choices.test.tsx). Gli extra comuni sono già presenti nel catalogo pubblicato: nessuna lettura diretta del Magazzino nel client.

Impasto e Formato compaiono solo se il gruppo offre più di una opzione disponibile; le selezioni standard restano nella composizione anche quando il controllo è nascosto. Il badge della scelta attiva mantiene il testo nel colore di contrasto del tema anche con focus da tastiera.
