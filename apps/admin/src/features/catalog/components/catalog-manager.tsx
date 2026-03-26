import type { Menu, Product, EntityIdentifier, MenuStatus } from "@pizzaos/domain";
import { MENU_STATUS } from "@pizzaos/domain";
import { Button, Card, StatusIndicator } from "@pizzaos/ui";
import { useState, type ReactElement } from "react";
import styles from "./catalog-manager.module.css";

interface CatalogManagerProps {
  readonly menus: readonly Menu[];
  readonly products: readonly Product[];
  readonly onUpdateMenu: (menu: Menu) => void;
  readonly onUpdateProduct: (product: Product) => void;
}

export function CatalogManager({
  menus,
  products,
  onUpdateMenu,
  onUpdateProduct
}: CatalogManagerProps): ReactElement {
  const [activeMenuId, setActiveMenuId] = useState<EntityIdentifier>(menus[0]?.id);
  const [editingProductId, setEditingProductId] = useState<EntityIdentifier | null>(null);
  const [editingMenuId, setEditingMenuId] = useState<EntityIdentifier | null>(null);

  const activeMenu = menus.find((m) => m.id === activeMenuId) || menus[0];
  const editingMenu = menus.find((m) => m.id === editingMenuId);

  function handleImageGeneration(productId: string) {
    // Mock AI image generation
    const product = products.find(p => p.id === productId);
    if (product) {
       // In a real app we would call an AI service.
       // Here we just simulate success.
       alert(`Generazione immagine AI per ${product.name} in corso...`);
    }
  }

  const editingProduct = products.find(p => p.id === editingProductId);

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
          {activeMenu && (
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
                      const product = products.find((p) => p.id === ref.productId);
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
                               {product.tags.map(tag => <span key={tag} className={styles.tag}>{tag}</span>)}
                             </div>
                          </div>
                          <div className={styles.productActions}>
                             <Button variant="ghost" onClick={() => setEditingProductId(product.id)}>Modifica</Button>
                             <Button variant="secondary" onClick={() => handleImageGeneration(product.id)}>AI Image</Button>
                          </div>
                          </Card>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </section>
          )}
        </main>
      </div>

      {editingProduct && (
        <div className={styles.modalOverlay} onClick={() => setEditingProductId(null)}>
           <div className={styles.modal} onClick={e => e.stopPropagation()}>
              <header className={styles.modalHeader}>
                 <h3>Modifica Prodotto</h3>
                 <button className={styles.closeButton} onClick={() => setEditingProductId(null)}>&times;</button>
              </header>
              <form className={styles.form} onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const updatedProduct: Product = {
                  ...editingProduct,
                  name: formData.get("name") as string,
                  description: formData.get("description") as string,
                };
                onUpdateProduct(updatedProduct);
                setEditingProductId(null);
              }}>
                <div className={styles.formGroup}>
                  <label htmlFor="product-name">Nome</label>
                  <input id="product-name" name="name" defaultValue={editingProduct.name} className={styles.input} required />
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="product-desc">Descrizione</label>
                  <textarea id="product-desc" name="description" defaultValue={editingProduct.description} className={styles.textarea} required />
                </div>
                <div className={styles.formGroup}>
                  <label>Immagine (Mock Upload)</label>
                  <div className={styles.imageUploadPlaceholder}>
                     <span>Trascina immagine o clicca per caricare</span>
                  </div>
                </div>
                <div className={styles.formActions}>
                   <Button variant="secondary" type="button" onClick={() => setEditingProductId(null)}>Annulla</Button>
                   <Button variant="primary" type="submit">Salva Modifiche</Button>
                </div>
              </form>
           </div>
        </div>
      )}

      {editingMenu && (
        <div className={styles.modalOverlay} onClick={() => setEditingMenuId(null)}>
           <div className={styles.modal} onClick={e => e.stopPropagation()}>
              <header className={styles.modalHeader}>
                 <h3>Impostazioni Menu</h3>
                 <button className={styles.closeButton} onClick={() => setEditingMenuId(null)}>&times;</button>
              </header>
              <form className={styles.form} onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const updatedMenu: Menu = {
                  ...editingMenu,
                  name: formData.get("name") as string,
                  status: formData.get("status") as MenuStatus,
                };
                onUpdateMenu(updatedMenu);
                setEditingMenuId(null);
              }}>
                <div className={styles.formGroup}>
                  <label htmlFor="menu-name">Nome Menu</label>
                  <input id="menu-name" name="name" defaultValue={editingMenu.name} className={styles.input} required />
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="menu-status">Stato</label>
                  <select id="menu-status" name="status" defaultValue={editingMenu.status} className={styles.input}>
                    {MENU_STATUS.map(status => (
                      <option key={status} value={status}>{status.charAt(0).toUpperCase() + status.slice(1)}</option>
                    ))}
                  </select>
                </div>
                <div className={styles.formActions}>
                   <Button variant="secondary" type="button" onClick={() => setEditingMenuId(null)}>Annulla</Button>
                   <Button variant="primary" type="submit">Salva Impostazioni</Button>
                </div>
              </form>
           </div>
        </div>
      )}
    </div>
  );
}
