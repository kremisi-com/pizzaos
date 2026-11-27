import type { IndividualStore } from "@pizzaos/domain";
import styles from "./ordering-navigation.module.css";

/** Common menu entry presentation; the composition supplies the active group's destination. */
export function OrderingMenuHeader({ store, signedIn, hasStores = true, groupHref = "/ordina/gruppo", signInHref = "/accesso" }: {
  store: IndividualStore | null; signedIn: boolean; hasStores?: boolean; groupHref?: string; signInHref?: string;
}) {
  return <><header className={styles.header}>
    <div><h1>La tua prossima pizza.</h1>{store && <p>{store.name} · {store.acceptingOrders ? "Ordini aperti" : "Ordini sospesi"}</p>}</div>
    {!signedIn && <a href={signInHref}>Accedi</a>}
  </header>
    <nav className={styles.heroActions} aria-label="Inizia a ordinare">
      {hasStores && <a className={styles.menuLink} href="#il-menu">Sfoglia il menu</a>}
      <a className={styles.groupLink} href={groupHref}>Ordine di gruppo</a>
    </nav>
  </>;
}

/** Cart entry stays above bottom navigation and counts the caller's own products. */
export function MenuCartEntry({ count }: { count: number }) {
  return count > 0 ? <div className={styles.cartEntry}><a href="/ordina/carrello">Carrello · {count} {count === 1 ? "articolo" : "articoli"}</a></div> : null;
}
