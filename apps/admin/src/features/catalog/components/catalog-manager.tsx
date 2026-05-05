import type { EntityIdentifier, Menu, Product } from "@pizzaos/domain";
import { Button, Card, StatusIndicator } from "@pizzaos/ui";
import { useState, type ReactElement } from "react";
import { MenuSettingsModal } from "./menu-settings-modal";
import { ProductEditModal } from "./product-edit-modal";
import styles from "./catalog-manager.module.css";

interface CatalogManagerProps {
  readonly menus: readonly Menu[];
  readonly products: readonly Product[];
  readonly onUpdateMenu: (menu: Menu) => void;
  readonly onUpdateProduct: (product: Product) => void;
}

export function CatalogManager({ menus, products, onUpdateMenu, onUpdateProduct }: CatalogManagerProps): ReactElement
{
  const [activeMenuId, setActiveMenuId] = useState<EntityIdentifier>(menus[0]?.id);
  const [editingProductId, setEditingProductId] = useState<EntityIdentifier | null>(null);
  const [editingMenuId, setEditingMenuId] = useState<EntityIdentifier | null>(null);

  const activeMenu = menus.find((menu) => menu.id === activeMenuId) || menus[0];
  const editingMenu = menus.find((menu) => menu.id === editingMenuId);
  const editingProduct = products.find((product) => product.id === editingProductId);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.titleGroup}>
          <h2 className={styles.title}>Gestione Catalogo</h2>
          <p className={styles.subtitle}>Gestisci i menu e i prodotti del tuo ristorante</p>
        </div>
      </header>

      <div className={styles.layout}>
        <aside className={styles.sidebar}>
          <h3 className={styles.sectionTitle}>Menu Disponibili</h3>
          <div className={styles.menuList}>
            {menus.map((menu) => (
              <button
                key={menu.id}
                className={`${styles.menuItem} ${activeMenuId === menu.id ? styles.menuItemActive : ""}`}
                onClick={() => setActiveMenuId(menu.id)}
              >
                <div className={styles.menuItemContent}>
                  <span className={styles.menuName}>{menu.name}</span>
                  <StatusIndicator tone={menu.status === "active" ? "active" : menu.status === "draft" ? "idle" : "warning"} label={menu.name} />
                </div>
              </button>
            ))}
          </div>
          <Button variant="secondary" className={styles.addMenuButton} onClick={() => alert("Funzionalità non disponibile in questa demo")}>
            + Nuovo Menu
          </Button>
        </aside>

        <main className={styles.mainContent}>
          {activeMenu ? (
            <section className={styles.menuDetail}>
              <div className={styles.menuHeader}>
                <h3 className={styles.activeMenuTitle}>{activeMenu.name}</h3>
                <div className={styles.menuActions}>
                  <Button variant="ghost" onClick={() => setEditingMenuId(activeMenu.id)}>Impostazioni</Button>
                </div>
              </div>
              {activeMenu.sections.map((section) => (
                <div key={section.id} className={styles.menuSection}>
                  <h4 className={styles.sectionHeading}>{section.name}</h4>
                  <div className={styles.productList}>
                    {section.productRefs.map((ref) => {
                      const product = products.find((item) => item.id === ref.productId);
                      if (!product) return null;
                      return (
                        <div key={product.id} className={styles.productCard}>
                          <Card>
                            <div className={styles.productInfo}>
                              <div className={styles.productHeader}>
                                <span className={styles.productName}>{product.name}</span>
                                <span className={styles.productPrice}>€{(product.basePrice.amountCents / 100).toFixed(2)}</span>
                              </div>
                              <p className={styles.productDesc}>{product.description}</p>
                              <div className={styles.productTags}>
                                {product.tags.map((tag) => <span key={tag} className={styles.tag}>{tag}</span>)}
                              </div>
                            </div>
                            <div className={styles.productActions}>
                              <Button variant="ghost" onClick={() => setEditingProductId(product.id)}>Modifica</Button>
                              <Button variant="secondary" onClick={() => alert(`Generazione immagine AI per ${product.name} in corso...`)}>AI Image</Button>
                            </div>
                          </Card>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </section>
          ) : null}
        </main>
      </div>

      {editingProduct ? (
        <ProductEditModal
          product={editingProduct}
          onClose={() => setEditingProductId(null)}
          onSave={onUpdateProduct}
        />
      ) : null}

      {editingMenu ? (
        <MenuSettingsModal
          menu={editingMenu}
          onClose={() => setEditingMenuId(null)}
          onSave={onUpdateMenu}
        />
      ) : null}
    </div>
  );
}
