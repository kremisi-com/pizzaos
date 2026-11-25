# Menu

Owns customer menu browsing: sections, visible product availability, and slot presentation. `MenuScreen` accepts an optional initial section and group-order mode; the menu view model derives display states from shared domain data.

The client demo state supplies the menu and products. Product customization owns selection rules and prices; this module only uses those choices for the browsing preview. It does not own cart persistence or checkout.

Run `pnpm --filter @pizzaos/client test` for menu screen and view-model coverage.

## Menu operativo

L'ordine individuale e di gruppo ricevono lo stesso catalogo pubblico della sede. Il menu mostra sezioni, disponibilità e foto statiche, permette l'aggiunta diretta dei prodotti semplici e apre il configuratore per le scelte richieste. Il configuratore e il carrello presentano importo e informazioni alimentari della composizione. Il preventivo del servizio rimane autorevole.

Il menu non mostra il nome del menu pubblicato, l’introduzione generica né il pannello allergeni/preferenze con filtro. Le preferenze dell'account sono gestibili da `/ordina/profilo`; la composizione fornisce `FoodPreferencesApi`. Il client non le inserisce nelle righe o nelle richieste di ordine e distingue ingredienti, possibili tracce e dati da verificare.

Le voci con identità pizza aprono `LivePizzaEditor` attraverso l'interfaccia pubblica della feature customization, condivisa tra aggiunta individuale, gruppo e modifica della riga. Il dettaglio mantiene presentazione e sezioni del PoC; gli altri prodotti continuano a usare il configuratore generico.

Il menu operativo presenta categorie e prodotti subito dopo «Il menu», senza introduzione, anteprima grande o scelte preventive di impasto/base. Le card usano la composizione standard del singolo prodotto. L'impasto si sceglie solo nel dettaglio di un prodotto con identità pizza; i prodotti ordinari mantengono aggiunta diretta o configuratore generico. Le scelte valgono per la singola riga e non vengono condivise con le successive pizze. Modificare una riga conserva selezioni, quantità e note; un'opzione esaurita richiede correzione prima dell'aggiunta. Catalogo, prezzi e immagini provengono dai dati pubblicati; il preventivo del servizio resta autorevole.
