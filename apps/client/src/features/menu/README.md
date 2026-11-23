# Menu

Owns customer menu browsing: sections, visible product availability, and slot presentation. `MenuScreen` accepts an optional initial section and group-order mode; the menu view model derives display states from shared domain data.

The client demo state supplies the menu and products. Product customization owns selection rules and prices; this module only uses those choices for the browsing preview. It does not own cart persistence or checkout.

Run `pnpm --filter @pizzaos/client test` for menu screen and view-model coverage.

## Menu operativo

L'ordine individuale e di gruppo ricevono lo stesso catalogo pubblico della sede. Il menu mostra sezioni, disponibilità e foto statiche, permette l'aggiunta diretta dei prodotti semplici e apre il configuratore per le scelte richieste. Il configuratore e il carrello presentano importo e informazioni alimentari della composizione. Il preventivo del servizio rimane autorevole.

Il filtro ospite vive nella pagina. Le preferenze dell'account sono gestibili nel menu e da `/ordina/profilo`; la composizione fornisce `FoodPreferencesApi`. Il client non le inserisce nelle righe o nelle richieste di ordine e distingue ingredienti, possibili tracce e dati da verificare.
