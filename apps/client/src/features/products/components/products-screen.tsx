"use client";

import { getThemeClass } from "@pizzaos/brand";
import type { ClientSeed } from "@pizzaos/mock-data";
import { PRODUCTS_MENU } from "@pizzaos/mock-data";
import { useEffect, useState, type ReactElement } from "react";
import { addCartItem } from "../../cart/cart-model";
import { loadClientDemoState } from "../../home/client-demo-state";
import {
  deriveMenuSections,
  deriveProductAvailability
} from "../../menu/menu-view-model";
import styles from "./products-screen.module.css";

const MONEY_FORMATTER = new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR"
});

const SECTION_ICONS: Record<string, string> = {
  "section-stuzzicherie": "🥨",
  "section-dolci": "🧁",
  "section-bevande": "🥤"
};

const PRODUCT_EMOJIS: Record<string, string> = {
  "product-suppli-cacio-e-pepe": "🍚",
  "product-bruschetta-pomodorini": "🍅",
  "product-polpettine-napoletane": "🍖",
  "product-crocche-patate": "🥔",
  "product-frittura-mista-mare": "🦐",
  "product-montanarine-classiche": "🍕",
  "product-mozzarella-carrozza": "🧀",
  "product-alici-marinate-limone": "🐟",
  "product-verdure-grigliate-orto": "🥗",
  "product-tiramisù": "☕",
  "product-panna-cotta-frutti-bosco": "🫐",
  "product-cannoli-siciliani": "🍮",
  "product-tortino-cioccolato": "🍫",
  "product-delizia-limone": "🍋",
  "product-baba-rum": "🍰",
  "product-semifreddo-pistacchio": "🌰",
  "product-pastiera-monoporzione": "🥮",
  "product-acqua-frizzante": "💧",
  "product-acqua-naturale": "💧",
  "product-coca-cola": "🥤",
  "product-limonata-sarda": "🍋",
  "product-birra-artigianale-rossa": "🍺",
  "product-birra-bionda": "🍺",
  "product-succo-arancia-rossa": "🍊",
  "product-chinotto-bio": "🥤",
  "product-gassosa-cedro": "🍋",
  "product-te-freddo-pesca": "🍑",
  "product-spritz-analcolico-agrumato": "🍹"
};

interface ProductsScreenProps
{
  readonly initialSectionId?: string;
}

function resolveStorage(): Storage | undefined
{
  if (typeof window === "undefined")
  {
    return undefined;
  }

  return window.localStorage;
}

interface ToastState
{
  readonly productName: string;
}

export function ProductsScreen(props: ProductsScreenProps): ReactElement
{
  const [seed, setSeed] = useState<ClientSeed>(() => loadClientDemoState());
  const [selectedSectionIds, setSelectedSectionIds] = useState<ReadonlySet<string>>(
    () => props.initialSectionId ? new Set([props.initialSectionId]) : new Set()
  );
  const [toast, setToast] = useState<ToastState | null>(null);

  useEffect(() =>
  {
    setSeed(loadClientDemoState(resolveStorage()));
  }, []);

  const sections = deriveMenuSections(PRODUCTS_MENU, seed.products);

  function handleAddToCart(productId: string, productName: string, priceCents: number): void
  {
    addCartItem(
      {
        productId,
        productName,
        unitPriceCents: priceCents,
        quantity: 1
      },
      resolveStorage()
    );
    setToast({ productName });
  }

  function toggleSection(sectionId: string): void
  {
    setSelectedSectionIds((current) =>
    {
      const next = new Set(current);

      if (next.has(sectionId))
      {
        next.delete(sectionId);
      }
      else
      {
        next.add(sectionId);
      }

      return next;
    });
  }

  const visibleSections =
    selectedSectionIds.size === 0
      ? sections
      : sections.filter((section) => selectedSectionIds.has(section.id));

  return (
    <div className={`${getThemeClass(seed.surface)} ${styles.screen}`}>
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <a href="/" className={styles.backButton}>
            <span className={styles.backIcon}>←</span>
            <span>Home</span>
          </a>
          <div className={styles.headerActions}>
            <a href="/cart" className={styles.cartButton} aria-label="Vai al carrello">
              <span className={styles.actionIcon} aria-hidden="true">🛒</span>
            </a>
          </div>
        </div>

        <h1 id="products-title" className={styles.heroTitle}>
          Stuzzicherie, Dolci &amp; Bevande
        </h1>
        <p className={styles.heroSubtitle}>
          Antipasti freschi, dolci irresistibili e bevande per ogni gusto.
        </p>

        <div className={styles.heroBadgeRow}>
          {sections.map((section) =>
          {
            const icon = SECTION_ICONS[section.id] ?? "🍽️";
            const isActive = selectedSectionIds.has(section.id);

            return (
              <button
                key={section.id}
                type="button"
                aria-pressed={isActive}
                className={`${styles.heroBadge} ${isActive ? styles.heroBadgeActive : ""}`}
                onClick={() => toggleSection(section.id)}
              >
                {icon} {section.name}
              </button>
            );
          })}
        </div>
      </header>

      <section
        aria-labelledby="products-title"
        className={styles.productsSection}
      >
        {sections.length > 0 ? (
          <div className={styles.allSectionsContainer}>
            {visibleSections.map((section) => (
              <div key={section.id} id={section.id} className={styles.sectionGroup}>
                <h2 className={styles.sectionTitle}>
                  {SECTION_ICONS[section.id] ?? "🍽️"} {section.name}
                </h2>
                <div className={styles.productGrid} aria-live="polite">
                  {section.products.map((product) =>
                  {
                    const availability = deriveProductAvailability(product);
                    const isOrderable = availability.isOrderable;
                    const emoji = PRODUCT_EMOJIS[product.id] ?? "🍽️";

                    if (!isOrderable)
                    {
                      return (
                        <article
                          key={product.id}
                          className={`${styles.productCard} ${styles.productCardMuted}`}
                        >
                          <div className={styles.productInside}>
                            <div className={styles.productMainInfo}>
                              <h3 className={styles.productName}>{product.name}</h3>
                              <p className={styles.productDescription}>
                                {product.description}
                              </p>
                              <div className={styles.productPriceRow}>
                                <span className={styles.productPrice}>
                                  {MONEY_FORMATTER.format(
                                    product.basePrice.amountCents / 100
                                  )}
                                </span>
                                <span className={styles.soldOutTag}>Esaurito</span>
                              </div>
                            </div>
                            <div className={styles.productVisualArea}>
                              <div className={styles.productEmojiFrame}>
                                <span className={styles.productEmoji} aria-hidden="true">
                                  {emoji}
                                </span>
                              </div>
                            </div>
                          </div>
                        </article>
                      );
                    }

                    return (
                      <button
                        key={product.id}
                        type="button"
                        className={styles.productCard}
                        onClick={() =>
                          handleAddToCart(
                            product.id,
                            product.name,
                            product.basePrice.amountCents
                          )}
                        aria-label={`Aggiungi ${product.name} al carrello`}
                      >
                        <div className={styles.productInside}>
                          <div className={styles.productMainInfo}>
                            <h3 className={styles.productName}>{product.name}</h3>
                            <p className={styles.productDescription}>
                              {product.description}
                            </p>

                            <div className={styles.productPriceRow}>
                              <span className={styles.productPrice}>
                                {MONEY_FORMATTER.format(
                                  product.basePrice.amountCents / 100
                                )}
                              </span>
                              {product.tags.includes("popular") && (
                                <span className={styles.popularTag}>Popolare</span>
                              )}
                            </div>
                          </div>

                          <div className={styles.productVisualArea}>
                            <div className={styles.productEmojiFrame}>
                              <span
                                className={styles.productEmoji}
                                aria-hidden="true"
                              >
                                {emoji}
                              </span>
                            </div>
                            <div
                              className={styles.productAddButton}
                              aria-hidden="true"
                            >
                              +
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon}>🍽️</span>
            <p className={styles.emptyText}>Nessun prodotto disponibile</p>
          </div>
        )}
      </section>

      {/* ── Cart toast ── */}
      {toast !== null ? (
        <div className={styles.toastOverlay}>
          <div className={styles.toastCard}>
            <p className={styles.toastTitle}>
              <span className={styles.toastIcon}>✅</span>
              Aggiunto al carrello
            </p>
            <p className={styles.toastMessage}>
              {toast.productName} è stato aggiunto al carrello.
            </p>
            <div className={styles.toastActions}>
              <a href="/cart" className={styles.toastLink}>Vai al carrello</a>
              <button
                type="button"
                className={styles.toastLinkSecondary}
                onClick={() => setToast(null)}
              >
                Continua
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
