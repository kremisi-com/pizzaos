# Contratti pubblici

Non cambiano i port di dominio. Il test consuma il componente esistente:

```ts
import { IndividualOrderingScreen } from "apps/client/src/features/individual-ordering/components/individual-ordering-screen";
import type { IndividualApi, IndividualCart, IndividualStore, IndividualQuote, PromotionsApi } from "@pizzaos/domain";

interface OrderingProps {
  view?: "all" | "menu" | "cart" | "checkout";
  api: IndividualApi;
  promotionsApi?: PromotionsApi;
  refreshVersion?: number;
  connection?: string;
  storefront?: boolean;
}
```

`IndividualApi.session/stores/catalog/orders` inizializzano il flusso. `quote(cart)` restituisce il riepilogo autorevole. `checkout(input)` riceve carrello corrente, telefono, metodo, fingerprint e idempotency key. `reconcile(id)` recupera il pagamento. I tipi completi appartengono all'entry pubblico `@pizzaos/domain`.

Precondizioni: catalogo con sede e prodotti; il draft esistente `pizzaos.individual-cart.v1` è `{version:1, updatedAt: ISODate, cart: IndividualCart}` e dura sette giorni. Un test può inizializzarlo prima del render. Contatti e dati carta non appartengono al draft.

Postcondizioni: una verifica non chiama checkout; la conferma usa la quote valida più recente; modifiche al carrello disabilitano l'invio fino a nuova verifica; un tentativo pendente non cambia identità. Stima e totale verificato sono distinguibili. L'assenza di dati blocca il passo dipendente con spiegazione leggibile. I radio espongono nome accessibile e checked state.

Il test può usare `renderDom`, `domScreen`, `domFireEvent`, `domWaitFor`, `cleanupDom` da `@pizzaos/testing`, Vitest e i tipi pubblici del dominio. Le prove browser usano gli endpoint e fixture già previste, con ambiente locale isolato. Nessun nuovo contratto backend o prezzo client autorevole.
