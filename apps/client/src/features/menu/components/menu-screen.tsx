"use client";

import { getThemeClass } from "@pizzaos/brand";
import type { ClientSeed } from "@pizzaos/mock-data";
import { Badge, Button } from "@pizzaos/ui";
import { useEffect, useState, type ReactElement } from "react";
import { loadClientDemoState } from "../../home/client-demo-state";
import {
  deriveMenuSections,
  deriveProductAvailability
} from "../menu-view-model";
import {
  DOUGH_OPTIONS,
  getPizzaPreviewImage,
  getProductToppingImage,
  PIZZA_BASE_OPTIONS
} from "../../customization/customization-model";
import styles from "./menu-screen.module.css";

const MONEY_FORMATTER = new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR"
});

interface MenuScreenProps
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

export function MenuScreen(props: MenuScreenProps): ReactElement
{
  const [seed, setSeed] = useState<ClientSeed>(() => loadClientDemoState());
  const [selectedSectionId, setSelectedSectionId] = useState(props.initialSectionId ?? "");
  const [selectedDoughId, setSelectedDoughId] = useState(DOUGH_OPTIONS[0].id);
  const [selectedBaseId, setSelectedBaseId] = useState(PIZZA_BASE_OPTIONS[0].id);

  useEffect(() =>
  {
    if (typeof window === "undefined")
    {
      return;
    }

    const savedDough = window.localStorage.getItem("pizzaos-selected-dough");
    const savedBase = window.localStorage.getItem("pizzaos-selected-base");

    if (savedDough)
    {
      setSelectedDoughId(savedDough);
    }

    if (savedBase)
    {
      setSelectedBaseId(savedBase);
    }
  }, []);
  useEffect(() =>
  {
    setSeed(loadClientDemoState(resolveStorage()));
  }, []);

  const sections = deriveMenuSections(seed.menu, seed.products);
  const selectedSection = sections.find((section) => section.id === selectedSectionId) ?? sections[0];

  useEffect(() =>
  {
    if (!selectedSection)
    {
      return;
    }

    setSelectedSectionId((currentSectionId) =>
    {
      if (sections.some((section) => section.id === currentSectionId))
      {
        return currentSectionId;
      }

      return props.initialSectionId && sections.some((section) => section.id === props.initialSectionId)
        ? props.initialSectionId
        : selectedSection.id;
    });
  }, [props.initialSectionId, sections, selectedSection]);

  return (
    <div className={`${getThemeClass(seed.surface)} ${styles.screen}`}>
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <a href="/" className={styles.backButton}>
            <span className={styles.backIcon}>←</span>
            <span>Home</span>
          </a>
          <div className={styles.headerActions}>
            <button className={styles.iconButton} aria-label="Condividi">
              <span className={styles.actionIcon}>🔗</span>
            </button>
            <button className={styles.iconButton} aria-label="Cerca">
              <span className={styles.actionIcon}>🔍</span>
            </button>
          </div>
        </div>

        <h1 id="menu-title" className={styles.heroTitle}>La pizza a modo tuo</h1>
        <p className={styles.heroSubtitle}>Ingredienti freschi, impasti a lenta lievitazione.</p>

        <div className={styles.heroImageWrap}>
          <img
            src={getPizzaPreviewImage({
              doughId: selectedDoughId,
              baseId: selectedBaseId
            })}
            alt="Anteprima pizza"
            className={styles.heroImage}
          />
        </div>
      </header>


      <section className={styles.doughSection}>
        <span className={styles.doughLabel}>Scegli l&apos;impasto:</span>
        <div className={styles.doughList} role="radiogroup" aria-label="Scelta impasto">
          {DOUGH_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              className={`${styles.doughOption} ${selectedDoughId === option.id ? styles.doughOptionActive : ""}`}
              onClick={() => {
                setSelectedDoughId(option.id);
                if (typeof window !== "undefined") {
                  window.localStorage.setItem("pizzaos-selected-dough", option.id);
                }
              }}
              aria-checked={selectedDoughId === option.id}
              role="radio"
            >
              <span className={styles.doughOptionIcon}>🫓</span>
              <span className={styles.doughOptionName}>{option.label}</span>
            </button>
          ))}
        </div>
      </section>

      <section className={styles.doughSection}>
        <span className={styles.doughLabel}>Scegli la base:</span>
        <div className={styles.doughList} role="radiogroup" aria-label="Scelta base">
          {PIZZA_BASE_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              className={`${styles.doughOption} ${selectedBaseId === option.id ? styles.doughOptionActive : ""}`}
              onClick={() => {
                setSelectedBaseId(option.id);
                if (typeof window !== "undefined") {
                  window.localStorage.setItem("pizzaos-selected-base", option.id);
                }
              }}
              aria-checked={selectedBaseId === option.id}
              role="radio"
            >
              <span className={styles.doughOptionIcon}>{option.id === "base-rossa" ? "🍅" : "🧄"}</span>
              <span className={styles.doughOptionName}>{option.label}</span>
            </button>
          ))}
        </div>
      </section>

      <section className={styles.tabSection}>
        <div className={styles.categoryContainer}>
          <h2 className={styles.categoryTitle}>Da dove vuoi iniziare?</h2>
          <div className={styles.categoryList} role="tablist" aria-label="Sezioni menu">
            {sections.map((section) => {
              const icon = section.id.includes("classiche") ? "🍕" :
                           section.id.includes("speciali") ? "✨" :
                           section.id.includes("bevande") ? "🥤" : "🍽️";
              return (
                <button
                  key={section.id}
                  type="button"
                  role="tab"
                  aria-selected={selectedSection?.id === section.id}
                  className={`${styles.categoryTab} ${selectedSection?.id === section.id ? styles.categoryTabActive : ""}`}
                  onClick={() => {
                    setSelectedSectionId(section.id);
                    const element = document.getElementById(section.id);
                    if (element) {
                      const offset = 120; // sticky header offset
                      const elementPosition = element.getBoundingClientRect().top;
                      const offsetPosition = elementPosition + window.pageYOffset - offset;

                      window.scrollTo({
                        top: offsetPosition,
                        behavior: "smooth"
                      });
                    }
                  }}
                >
                  <span className={styles.categoryIcon}>{icon}</span>
                  <span className={styles.categoryName}>{section.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section aria-labelledby="menu-sections-title" className={styles.productsSection}>
        {sections.length > 0 ? (
          <div className={styles.allSectionsContainer}>
            {sections.map((section) => (
              <div key={section.id} id={section.id} className={styles.sectionGroup}>
                <h2 className={styles.sectionTitle}>{section.name}</h2>
                <div className={styles.productGrid} aria-live="polite">
                  {section.products.map((product) =>
                  {
                    const availability = deriveProductAvailability(product);
                    const imageSrc = getProductToppingImage(product.id);
                    const isOrderable = availability.isOrderable;
                    const CardTag = isOrderable ? "a" : "article";
                    const cardProps = isOrderable ? { href: `/product/${product.id}` } : {};

                    return (
                      <CardTag
                        key={product.id}
                        {...cardProps}
                        className={`${styles.productCard} ${!isOrderable ? styles.productCardMuted : ""}`}
                      >
                        <div className={styles.productInside}>
                          <div className={styles.productMainInfo}>
                            <h3 className={styles.productName}>{product.name}</h3>
                            <p className={styles.productDescription}>{product.description}</p>

                            <div className={styles.productPriceRow}>
                              <span className={styles.productPrice}>
                                {MONEY_FORMATTER.format(product.basePrice.amountCents / 100)}
                              </span>
                              {(product.tags.includes("popular") || product.id.includes("margherita") || product.id.includes("crudo")) && (
                                <span className={styles.popularTag}>Popolare</span>
                              )}
                            </div>
                          </div>

                          <div className={styles.productVisualArea}>
                            {imageSrc ? (
                              <div className={styles.productImageFrame}>
                                <img
                                  src={imageSrc}
                                  alt=""
                                  aria-hidden="true"
                                  className={styles.productImage}
                                />
                              </div>
                            ) : isOrderable ? (
                              <div className={styles.productImagePlaceholder} />
                            ) : null}

                            {isOrderable && (
                              <div className={styles.productAddButton} aria-hidden="true">+</div>
                            )}
                          </div>
                        </div>
                      </CardTag>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon}>🍽️</span>
            <p className={styles.emptyText}>Nessuna categoria disponibile</p>
          </div>
        )}
      </section>
    </div>
  );
}
