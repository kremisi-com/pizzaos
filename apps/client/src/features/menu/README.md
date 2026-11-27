# Menu

Il catalogo operativo applica la policy della sede per scorte zero: prodotti ordinabili, prodotti disabilitati con **Esaurito**, oppure prodotti assenti. `IndividualProduct.soldOut` distingue esaurimento e indisponibilità manuale (**Non disponibile**). Opzioni e abbinamenti arrivano già filtrati dal servizio. Scorte null non limitano gli acquisti; non vengono mostrati gli avvisi riservati all’admin. Test: `src/test/stock-policy.test.tsx` e `pnpm exec playwright test --config playwright.stock-policy.config.ts` dalla root.


Owns customer menu browsing: sections, visible product availability, and slot presentation. `MenuScreen` accepts an optional initial section and group-order mode; the menu view model derives display states from shared domain data.

The client demo state supplies the menu and products. Product customization owns selection rules and prices; this module only uses those choices for the browsing preview. It does not own cart persistence or checkout.

Run `pnpm --filter @pizzaos/client test` for menu screen and view-model coverage.

## Menu operativo

Verifica locale della rimozione: lint, typecheck e 207 test client superati. Build e percorso browser completo restano bloccati dalle modifiche concorrenti al flusso gruppo (contratto `GroupCreate` e sintassi del servizio); menu, dettaglio e carrello sono stati verificati nel browser con contesto individuale fissato nel test. Il checkout è coperto dal test di componente. Nessuna nuova evidenza online.

Le avvertenze generali del menu (`kitchenNotice`) non sono visualizzate nel client, anche se presenti nel catalogo pubblicato: menu, dettagli e configuratori, carrello e checkout le omettono. I dati salvati restano conservati dal servizio; ingredienti, allergeni, tracce e avvisi legati alle preferenze continuano a seguire la composizione. Copertura: `src/test/menu-kitchen-notice.test.tsx`, `src/test/individual-cart.test.tsx` e `tests/menu-ordering/menu-kitchen-notice.spec.ts`.

Quando è visibile una sola sezione, il suo titolo è nascosto per evitare un'intestazione ridondante sotto «Il menu». Con più sezioni visibili restano i titoli delle categorie e la relativa navigazione; le descrizioni delle sezioni restano visibili anche con una sola sezione.

L'ordine individuale e di gruppo ricevono lo stesso catalogo pubblico della sede. Il menu mostra sezioni, disponibilità e foto statiche, apre il dettaglio dei prodotti semplici e il configuratore per le scelte richieste. Il configuratore e il carrello presentano importo e informazioni alimentari della composizione. Il preventivo del servizio rimane autorevole.

Il menu non mostra il nome del menu pubblicato, l’introduzione generica né il pannello allergeni/preferenze con filtro. Le preferenze dell'account sono gestibili da `/ordina/profilo`; la composizione fornisce `FoodPreferencesApi`. Il client non le inserisce nelle righe o nelle richieste di ordine e distingue ingredienti, possibili tracce e dati da verificare.

Le voci con identità pizza aprono `LivePizzaEditor` attraverso l'interfaccia pubblica della feature customization, condivisa tra aggiunta individuale, gruppo e modifica della riga. Il dettaglio mantiene presentazione e sezioni del PoC; i panini condividono struttura e controlli, mentre gli altri prodotti usano il configuratore generico.

Il menu operativo presenta categorie e prodotti subito dopo «Il menu», senza introduzione, anteprima grande o scelte preventive di impasto/base. Le card usano la composizione standard del singolo prodotto. L'impasto si sceglie solo nel dettaglio di un prodotto con identità pizza; i prodotti ordinari aprono il dettaglio generico con conferma dell’aggiunta. Le scelte valgono per la singola riga e non vengono condivise con le successive pizze. Modificare una riga conserva selezioni, quantità e note; un'opzione esaurita richiede correzione prima dell'aggiunta. Catalogo, prezzi e immagini provengono dai dati pubblicati; il preventivo del servizio resta autorevole.

Le schede del menu mostrano solo i nomi degli ingredienti della composizione standard sotto la descrizione, separati da virgole e senza etichette o avvisi alimentari. Se non ci sono ingredienti, la riga non viene mostrata. Dettaglio e carrello mantengono le informazioni alimentari.

Le card del menu operativo mostrano il prezzo in alto a destra, allineato al titolo, senza pulsante +. L'intera card apre il dettaglio o il configuratore previsto dal prodotto, anche da tastiera; prodotti non disponibili e ordinazione disabilitata non attivano azioni. Gli abbinamenti non compaiono nelle card: sono disponibili soltanto dentro le schede prodotto.

## Tipi di prodotto e Menu a fasi

Le righe con opzioni rimosse o esaurite usano il [recupero con conferma unica](../../../../../.agents/product-definition/flows/menu-ordering.md#recupero-delle-personalizzazioni-obsolete): proposta locale, avviso, prezzo corrente e **Conferma modifica**, senza reset globale. Chiudere non salva. Gruppi obbligatori e fasi invalide richiedono una scelta esplicita; righe con tutte le opzioni eliminate restano correggibili. Test: `src/test/customization-recovery.test.tsx` e browser `tests/e2e/individual-cart.spec.ts`.

Pizza e Panino condividono il configuratore. Panino usa ingredienti rimovibili, extra comuni e note, senza impasti/formati. Box usa gruppi con cardinalità e ripetizioni. Menu apre una scheda a pagina intera con una sezione espandibile per fase. Ogni fase richiede una scelta: la selezione apre la successiva e il riepilogo chiuso mostra il prodotto scelto e la variazione di prezzo. Riaprire conserva le scelte; cambiare prodotto ripristina rimozioni e note della sola fase. La personalizzazione compare dentro la fase scelta: controlli incluso/escluso per Pizza e Panino, sole note cucina per i prodotti ordinari. Non ci sono pulsanti Indietro o Scelta Successiva. Il riepilogo fisso con Aggiungi al carrello si abilita quando tutte le fasi sono valide. Le note finali sono separate dalle note delle singole scelte. Impasto consigliato (standard se assente) e formato standard della pizza sono automatici; gli extra non sono ammessi nel Menu. Il prezzo è quello fisso più le variazioni configurate, senza sommare i listini delle singole portate. Il carrello e la modifica condividono queste regole anche in gruppo e nelle aggiunte. `mealSelections` distingue composizioni e note diverse nello storage e nell'accorpamento delle righe. Gli snapshot ordine mostrano fasi e note senza dipendere dal catalogo corrente. Verifiche: `src/test/meal-editor.test.tsx`.

Gli abbinamenti disponibili sono mostrati solo nel dettaglio; su Pizza e Panino seguono Extra, prima delle note. Aggiungerli conserva la composizione aperta; quelli con scelte richiedono configurazione nella propria scheda. Copertura browser: `tests/menu-ordering/product-detail-consistency.spec.ts`.

`MealConfigurationDialog` appartiene a customization ed è consumato tramite il suo entry point pubblico. Gli abbinamenti del Menu completo seguono tutte le fasi e precedono le note finali; non eredita quelli dei prodotti scelti. Un abbinamento aggiunge una riga separata senza azzerare le fasi. Test: `meal-editor.test.tsx`, `customization-recovery*.test.tsx`, `tests/menu-ordering/product-detail-consistency.spec.ts` e `product-types.spec.ts`.

L'entry pubblico espone `OrderingCover`, `OrderingMenuHeader` e `MenuCartEntry`: individuale e gruppo condividono copertina, intestazione e accesso al carrello durante lo scorrimento. La composizione passa la destinazione del gruppo e il conteggio dei soli prodotti personali; dati e permessi del gruppo restano nel loro proprietario.
