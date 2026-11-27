# Cart

Owns the individual customer's persisted cart lines and cart review screen. `cart-model` exposes load, save, add, quantity, remove, and clear operations; the screen also consumes the client API port.

Group orders keep separate state. Checkout owns slot selection, payment, and order confirmation. This cart's storage key and line shape are part of the current demo-state contract, so changes need persistence and reorder coverage.

The screen resolves product names from the catalog port when hydrating or updating API cart lines. Reordered products retain their readable names instead of displaying transport identifiers.

Run `pnpm --filter @pizzaos/client test` for cart model, screen, and local API coverage.

Il public entry `index.ts` espone `IndividualCartScreen`, presentazione del carrello operativo su `/ordina/carrello`. Riceve composizione, catalogo e callback dal flusso individuale, senza usare il repository POC. Riusa gli stili del POC, con quantità a passi, rimozione, svuotamento, note e modifica delle scelte. La stima dei prodotti usa i resolver pubblici del dominio, comprese Pizza e Menu; consegna, benefici e totale definitivo restano nel preventivo server. Il pulsante checkout rimane sopra la navigazione mobile. Test dedicati: `src/test/individual-cart.test.tsx` e `pnpm exec playwright test --config playwright.individual-cart.config.ts` dalla root.

Il carrello operativo usa un fondo uniforme a tutta larghezza, senza sfumature, aloni del riepilogo o pannelli decorativi vuoti a fondo pagina. Il contenuto mantiene una larghezza di lettura limitata su desktop. Il blocco fisso del checkout è esterno al riepilogo e resta ancorato al viewport anche nei carrelli lunghi. Lo spazio a fondo pagina permette di leggere il riepilogo e raggiungere lo svuotamento sopra il blocco checkout. La suite browser verifica posizione e scorrimento su mobile e desktop.
