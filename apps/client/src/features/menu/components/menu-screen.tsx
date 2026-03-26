"use client";

import type { ClientSeed } from "@pizzaos/mock-data";
import { Badge, Button, ShellCard } from "@pizzaos/ui";
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
    <main className={styles.screen}>
      <section className={styles.hero} aria-labelledby="menu-title">
        <div className={styles.heroTopRow}>
          <a href="/" className={styles.backLink}>Home</a>
          <Badge tone="neutral">{seed.store.displayName}</Badge>
        </div>

        <h1 id="menu-title" className={styles.heroTitle}>Menu di oggi</h1>

        <p className={styles.heroCopy}>
          Tutto resta visibile: disponibilita, stato slot e trattamento prodotto senza passaggi nascosti.
        </p>
      </section>

      <section aria-labelledby="slot-title" className={styles.section}>
        <div className={styles.sectionHeader}>
          <div>
            <p className={styles.sectionEyebrow}>Slot</p>
            <h2 id="slot-title" className={styles.sectionTitle}>Consegna e ritiro</h2>
          </div>

          {selectedSlotState ? <Badge tone={selectedSlotState.tone}>{selectedSlotState.label}</Badge> : null}
        </div>

        <div className={styles.slotStrip} role="list" aria-label="Slot disponibili">
          {slots.map((slot) =>
          {
            const slotState = deriveSlotAvailability(slot);
            const isActive = slot.slotId === selectedSlotId;

            return (
              <button
                key={slot.slotId}
                type="button"
                role="listitem"
                disabled={!slotState.isSelectable}
                aria-pressed={isActive}
                className={`${styles.slotButton} ${isActive ? styles.slotButtonActive : ""}`}
                onClick={() => setSelectedSlotId(slot.slotId)}
              >
                <span className={styles.slotLabel}>{slot.label}</span>
                <span className={styles.slotMeta}>{slotState.meta}</span>
                <span className={styles.slotStatus}>{slotState.label}</span>
              </button>
            );
          })}
        </div>

        {selectedSlot ? (
          <ShellCard title="Slot selezionato">
            <div className={styles.slotSummary}>
              <p className={styles.slotSummaryLead}>{selectedSlot.label}</p>
              <p className={styles.slotSummaryMeta}>
                Arrivo stimato in circa {selectedSlot.etaMinutes} minuti. Gli slot segnati come esauriti restano visibili
                ma non sono selezionabili.
              </p>
            </div>
          </ShellCard>
        ) : null}
      </section>

      <section aria-labelledby="menu-sections-title" className={styles.section}>
        <div className={styles.sectionHeader}>
          <div>
            <p className={styles.sectionEyebrow}>Categorie</p>
            <h2 id="menu-sections-title" className={styles.sectionTitle}>Sfoglia per sezione</h2>
          </div>

          {selectedSection ? <Badge tone="neutral">{selectedSection.summary}</Badge> : null}
        </div>

        <div className={styles.sectionTabs} role="tablist" aria-label="Sezioni menu">
          {sections.map((section) => (
            <button
              key={section.id}
              type="button"
              role="tab"
              aria-selected={selectedSection?.id === section.id}
              className={`${styles.sectionTab} ${selectedSection?.id === section.id ? styles.sectionTabActive : ""}`}
              onClick={() => setSelectedSectionId(section.id)}
            >
              <span>{section.name}</span>
              <small>{section.summary}</small>
            </button>
          ))}
        </div>

        {selectedSection ? (
          <div className={styles.productGrid} aria-live="polite">
            {selectedSection.products.map((product) =>
            {
              const availability = deriveProductAvailability(product);

              return (
                <article
                  key={product.id}
                  className={`${styles.productCard} ${!availability.isOrderable ? styles.productCardMuted : ""}`}
                >
                  <div className={styles.productHeader}>
                    <div>
                      <h3 className={styles.productName}>{product.name}</h3>
                      <p className={styles.productDescription}>{product.description}</p>
                    </div>
                    <div className={styles.productPrice}>{MONEY_FORMATTER.format(product.basePrice.amountCents / 100)}</div>
                  </div>

                  <div className={styles.badgeRow}>
                    <Badge tone={availability.tone}>{availability.label}</Badge>
                    {product.preparationMode ? (
                      <Badge tone={product.preparationMode === "crudo" ? "warning" : "neutral"}>
                        {product.preparationMode === "crudo" ? "Servita cruda" : "Servita cotta"}
                      </Badge>
                    ) : null}
                  </div>

                  <div className={styles.metaBlock}>
                    <p className={styles.metaTitle}>Tag</p>
                    <p className={styles.metaValue}>{product.tags.join(" · ")}</p>
                  </div>

                  <div className={styles.metaBlock}>
                    <p className={styles.metaTitle}>Allergeni</p>
                    <p className={styles.metaValue}>
                      {product.allergens.map((allergen) => allergen.label).join(", ")}
                    </p>
                  </div>

                  <div className={styles.cardFooter}>
                    <p className={styles.footerHint}>
                      {availability.isOrderable
                        ? "Apri il dettaglio per configurare impasto, varianti, ingredienti ed extra."
                        : "Prodotto visibile per chiarezza, ma non ordinabile in questo momento."}
                    </p>

                    {availability.isOrderable ? (
                      <a href={`/product/${product.id}`} className={styles.detailLink}>
                        Personalizza pizza
                      </a>
                    ) : (
                      <Button variant="secondary" disabled>
                        Non disponibile
                      </Button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        ) : null}
      </section>
    </main>
  );
}
