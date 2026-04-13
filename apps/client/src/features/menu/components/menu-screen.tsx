"use client";

import { getThemeClass } from "@pizzaos/brand";
import type { ClientSeed } from "@pizzaos/mock-data";
import { Badge, Button } from "@pizzaos/ui";
import { useEffect, useState, type ReactElement } from "react";
import { loadClientDemoState } from "../../home/client-demo-state";
import {
  deriveMenuSections,
  deriveProductAvailability,
  deriveSlotAvailability
} from "../menu-view-model";
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
  const [selectedSlotId, setSelectedSlotId] = useState("");
  const slots = seed.slots;

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

  useEffect(() =>
  {
    const firstSelectableSlot = slots.find((slot) => deriveSlotAvailability(slot).isSelectable);

    setSelectedSlotId((currentSlotId) =>
    {
      if (slots.some((slot) => slot.slotId === currentSlotId && deriveSlotAvailability(slot).isSelectable))
      {
        return currentSlotId;
      }

      return firstSelectableSlot?.slotId ?? "";
    });
  }, [slots]);

  const selectedSlot = slots.find((slot) => slot.slotId === selectedSlotId) ?? slots[0];
  const selectedSlotState = selectedSlot ? deriveSlotAvailability(selectedSlot) : null;

  return (
    <div className={`${getThemeClass(seed.surface)} ${styles.screen}`}>
      <div className={styles.heroImageWrap}>
        <img
          src="/images/pizza/pizza-rossa.png"
          alt="Anteprima pizza"
          className={styles.heroImage}
        />
      </div>

      <header className={styles.header}>
        <div className={styles.headerTop}>
          <a href="/" className={styles.backButton}>
            <span className={styles.backIcon}>←</span>
            <span>Home</span>
          </a>
          <div className={styles.storeBadge}>
            <span className={styles.statusDot} />
            {seed.store.displayName}
          </div>
        </div>

        <h1 id="menu-title" className={styles.heroTitle}>Scegli la tua pizza</h1>
        <p className={styles.heroSubtitle}>Ingredienti freschi, impasti a lenta lievitazione.</p>
      </header>

      <section className={styles.tabSection}>
        <div className={styles.categoryContainer}>
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
                  onClick={() => setSelectedSectionId(section.id)}
                >
                  <span className={styles.categoryIcon}>{icon}</span>
                  <span className={styles.categoryName}>{section.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section className={styles.slotSection}>
        <button
          className={styles.slotTrigger}
          onClick={() => {/* Toggle slot picker */}}
        >
          <div className={styles.slotTriggerContent}>
            <span className={styles.slotIcon}>🕒</span>
            <div className={styles.slotText}>
              <span className={styles.slotLabel}>Consegna prevista:</span>
              <span className={styles.slotValue}>{selectedSlot?.label ?? "Seleziona slot"}</span>
            </div>
          </div>
          {selectedSlotState ? <Badge tone={selectedSlotState.tone}>{selectedSlotState.label}</Badge> : null}
        </button>
      </section>

      <section aria-labelledby="menu-sections-title" className={styles.productsSection}>
        {selectedSection ? (
          <>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>{selectedSection.name}</h2>
              <span className={styles.sectionCount}>
                {selectedSection.products.length} {selectedSection.products.length === 1 ? "prodotto" : "prodotti"}
              </span>
            </div>

            <div className={styles.productGrid} aria-live="polite">
              {selectedSection.products.map((product) =>
              {
                const availability = deriveProductAvailability(product);

                return (
                  <article
                    key={product.id}
                    className={`${styles.productCard} ${!availability.isOrderable ? styles.productCardMuted : ""}`}
                  >
                    <div className={styles.productInfo}>
                      <div className={styles.productMain}>
                        <h3 className={styles.productName}>{product.name}</h3>
                        <p className={styles.productDescription}>{product.description}</p>
                      </div>

                      <div className={styles.productVisual}>
                        <div className={styles.productPrice}>
                          {MONEY_FORMATTER.format(product.basePrice.amountCents / 100)}
                        </div>
                        <div className={styles.productImagePlaceholder}>
                          <span>🍕</span>
                        </div>
                      </div>
                    </div>

                    <div className={styles.productMeta}>
                      <div className={styles.badgeRow}>
                        {!availability.isOrderable && <Badge tone={availability.tone}>{availability.label}</Badge>}
                        {product.preparationMode && (
                          <Badge tone={product.preparationMode === "crudo" ? "warning" : "neutral"}>
                            {product.preparationMode === "crudo" ? "Servita cruda" : "Cotta"}
                          </Badge>
                        )}
                      </div>

                      <div className={styles.allergenRow}>
                        {product.allergens.slice(0, 3).map(a => (
                          <span key={a.code} title={a.label} className={styles.allergenIndicator}>
                            {a.label.charAt(0)}
                          </span>
                        ))}
                        {product.allergens.length > 3 && <span>+</span>}
                      </div>
                    </div>

                    <div className={styles.cardActions}>
                      {availability.isOrderable ? (
                        <a href={`/product/${product.id}`} className={styles.primaryAction}>
                          <span>Personalizza</span>
                          <span className={styles.plusIcon}>+</span>
                        </a>
                      ) : (
                        <Button variant="secondary" disabled className={styles.disabledAction}>
                          Esaurito
                        </Button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </>
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
