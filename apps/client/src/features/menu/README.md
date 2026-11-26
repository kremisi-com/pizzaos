# Menu

Il catalogo operativo applica la policy della sede per scorte zero: prodotti ordinabili, prodotti disabilitati con **Esaurito**, oppure prodotti assenti. `IndividualProduct.soldOut` distingue esaurimento e indisponibilità manuale (**Non disponibile**). Opzioni e abbinamenti arrivano già filtrati dal servizio. Scorte null non limitano gli acquisti; non vengono mostrati gli avvisi riservati all’admin. Test: `src/test/stock-policy.test.tsx` e `pnpm exec playwright test --config playwright.stock-policy.config.ts` dalla root.


Owns customer menu browsing: sections, visible product availability, and slot presentation. `MenuScreen` accepts an optional initial section and group-order mode; the menu view model derives display states from shared domain data.

The client demo state supplies the menu and products. Product customization owns selection rules and prices; this module only uses those choices for the browsing preview. It does not own cart persistence or checkout.

Run `pnpm --filter @pizzaos/client test` for menu screen and view-model coverage.

## Menu operativo

Quando è visibile una sola sezione, il suo titolo è nascosto per evitare un'intestazione ridondante sotto «Il menu». Con più sezioni visibili restano i titoli delle categorie e la relativa navigazione; le descrizioni delle sezioni restano visibili anche con una sola sezione.

L'ordine individuale e di gruppo ricevono lo stesso catalogo pubblico della sede. Il menu mostra sezioni, disponibilità e foto statiche, apre il dettaglio dei prodotti semplici e il configuratore per le scelte richieste. Il configuratore e il carrello presentano importo e informazioni alimentari della composizione. Il preventivo del servizio rimane autorevole.

Il menu non mostra il nome del menu pubblicato, l’introduzione generica né il pannello allergeni/preferenze con filtro. Le preferenze dell'account sono gestibili da `/ordina/profilo`; la composizione fornisce `FoodPreferencesApi`. Il client non le inserisce nelle righe o nelle richieste di ordine e distingue ingredienti, possibili tracce e dati da verificare.

Le voci con identità pizza aprono `LivePizzaEditor` attraverso l'interfaccia pubblica della feature customization, condivisa tra aggiunta individuale, gruppo e modifica della riga. Il dettaglio mantiene presentazione e sezioni del PoC; gli altri prodotti continuano a usare il configuratore generico.

Il menu operativo presenta categorie e prodotti subito dopo «Il menu», senza introduzione, anteprima grande o scelte preventive di impasto/base. Le card usano la composizione standard del singolo prodotto. L'impasto si sceglie solo nel dettaglio di un prodotto con identità pizza; i prodotti ordinari aprono il dettaglio generico con conferma dell’aggiunta. Le scelte valgono per la singola riga e non vengono condivise con le successive pizze. Modificare una riga conserva selezioni, quantità e note; un'opzione esaurita richiede correzione prima dell'aggiunta. Catalogo, prezzi e immagini provengono dai dati pubblicati; il preventivo del servizio resta autorevole.

Le schede del menu mostrano solo i nomi degli ingredienti della composizione standard sotto la descrizione, separati da virgole e senza etichette o avvisi alimentari. Se non ci sono ingredienti, la riga non viene mostrata. Dettaglio e carrello mantengono le informazioni alimentari.

Le card del menu operativo mostrano il prezzo in alto a destra, allineato al titolo, senza pulsante +. L'intera card apre il dettaglio o il configuratore previsto dal prodotto, anche da tastiera; prodotti non disponibili e ordinazione disabilitata non attivano azioni. Personalizzazione e abbinamenti mantengono comandi indipendenti.

## Tipi di prodotto e Menu a fasi

Pizza mantiene il configuratore dedicato. Panino usa ingredienti rimovibili, extra comuni e note, senza impasti/formati. Box usa gruppi con cardinalità e ripetizioni. Menu apre un percorso con una scelta obbligatoria per fase; avanti e indietro conservano le altre scelte, cambiare prodotto ripristina rimozioni e note della sola fase. Personalizza offre soltanto ingredienti inclusi deselezionabili e note cucina. Impasto consigliato (standard se assente) e formato standard della pizza sono automatici; gli extra non sono ammessi nel Menu. Il prezzo è quello fisso più le variazioni configurate, senza sommare i listini delle singole portate. Il carrello e la modifica condividono queste regole anche in gruppo e nelle aggiunte. `mealSelections` distingue composizioni e note diverse nello storage e nell'accorpamento delle righe. Gli snapshot ordine mostrano fasi e note senza dipendere dal catalogo corrente. Verifiche: `src/test/meal-editor.test.tsx`.
