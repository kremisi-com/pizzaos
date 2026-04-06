"use client";

import type { Product } from "@pizzaos/domain";
import type { ClientSeed } from "@pizzaos/mock-data";
import { Badge } from "@pizzaos/ui";
import { useCallback, useEffect, useReducer, useRef, useState, type Dispatch, type ReactElement } from "react";
import { addCartItem } from "../../cart/cart-model";
import { loadClientDemoState } from "../../home/client-demo-state";
import { deriveProductAvailability } from "../../menu/menu-view-model";
import {
  createInitialCustomizationState,
  customizationReducer,
  deriveCustomizationPrice,
  deriveVisibleAllergens,
  DOUGH_OPTIONS,
  EXTRA_OPTIONS,
  getPairingSuggestions,
  INGREDIENT_OPTIONS,
  VARIANT_OPTIONS,
  type CustomizationState,
  type IngredientMode
} from "../customization-model";
import styles from "./product-detail-screen.module.css";

const MONEY_FORMATTER = new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR"
});

const INGREDIENT_MODE_LABEL: Readonly<Record<IngredientMode, string>> = {
  normale: "Normale",
  extra: "Extra",
  senza: "Senza"
};

type OpenSection = "dough" | "variant" | "ingredients" | "extras" | null;

interface ProductDetailScreenProps
{
  readonly productId: string;
}

function resolveStorage(): Storage | undefined
{
  if (typeof window === "undefined")
  {
    return undefined;
  }

  return window.localStorage;
}

export function ProductDetailScreen(props: ProductDetailScreenProps): ReactElement
{
  const [seed, setSeed] = useState<ClientSeed>(() => loadClientDemoState());
  const [state, dispatch] = useReducer(customizationReducer, undefined, createInitialCustomizationState);
  const [isCartToastVisible, setIsCartToastVisible] = useState(false);
  const [openSection, setOpenSection] = useState<OpenSection>(null);
  const [isPricePulsing, setIsPricePulsing] = useState(false);
  const [isAddSuccess, setIsAddSuccess] = useState(false);
  const previousTotalRef = useRef<number | null>(null);

  useEffect(() =>
  {
    setSeed(loadClientDemoState(resolveStorage()));
  }, []);

  const toggleSection = useCallback((section: OpenSection) =>
  {
    setOpenSection((current) => current === section ? null : section);
  }, []);

  const product = seed.products.find((candidateProduct) => candidateProduct.id === props.productId);

  if (!product)
  {
    return (
      <main className={styles.screen}>
        <div className={styles.notFound}>
          <span className={styles.notFoundIcon}>🍕</span>
          <h1 className={styles.notFoundTitle}>Prodotto non trovato</h1>
          <p className={styles.notFoundText}>
            Questo prodotto non è disponibile nello stato demo corrente.
          </p>
          <a href="/menu" className={styles.notFoundLink}>
            <span>←</span>
            Torna al menu
          </a>
        </div>
      </main>
    );
  }

  const availability = deriveProductAvailability(product);
  const priceBreakdown = deriveCustomizationPrice(product.basePrice.amountCents, state);

  // Price pulse micro-animation: trigger when total changes after initial render
  useEffect(() =>
  {
    if (previousTotalRef.current !== null && previousTotalRef.current !== priceBreakdown.totalCents)
    {
      setIsPricePulsing(true);
      const timer = setTimeout(() => setIsPricePulsing(false), 300);

      return () => clearTimeout(timer);
    }

    previousTotalRef.current = priceBreakdown.totalCents;

    return undefined;
  }, [priceBreakdown.totalCents]);

  // Update ref after effect runs for subsequent changes
  useEffect(() =>
  {
    previousTotalRef.current = priceBreakdown.totalCents;
  });

  const visibleAllergens = deriveVisibleAllergens(product.allergens, state);
  const pairings = getPairingSuggestions(product.id);

  function handleAddToCartClick(): void
  {
    if (!product)
    {
      return;
    }

    const doughLabel = DOUGH_OPTIONS.find((option) => option.id === state.selectedDoughId)?.label ?? "Classico";
    const variantLabel = VARIANT_OPTIONS.find((option) => option.id === state.selectedVariantId)?.label ?? "Classica";
    const selectedExtras = EXTRA_OPTIONS
      .filter((extra) => state.selectedExtraIds.includes(extra.id))
      .map((extra) => extra.label);
    const notes = createCustomizationNotes({
      doughLabel,
      variantLabel,
      selectedExtras
    });

    addCartItem(
      {
        productId: product.id,
        productName: product.name,
        unitPriceCents: priceBreakdown.totalCents,
        quantity: 1,
        notes
      },
      resolveStorage()
    );

    // Success flash animation
    setIsAddSuccess(true);
    setTimeout(() =>
    {
      setIsAddSuccess(false);
      setIsCartToastVisible(true);
    }, 600);
  }

  const selectedDoughLabel = DOUGH_OPTIONS.find((option) => option.id === state.selectedDoughId)?.label ?? "Classico";
  const selectedVariantLabel = VARIANT_OPTIONS.find((option) => option.id === state.selectedVariantId)?.label ?? "Classica";
  const doughDelta = DOUGH_OPTIONS.find((option) => option.id === state.selectedDoughId)?.priceDeltaCents ?? 0;
  const variantDelta = VARIANT_OPTIONS.find((option) => option.id === state.selectedVariantId)?.priceDeltaCents ?? 0;
  const activeExtrasCount = state.selectedExtraIds.length;
  const ingredientChanges = deriveIngredientChangesSummary(state);

  return (
    <main className={styles.screen}>
      {/* ── Hero ── */}
      <section className={styles.hero} aria-labelledby="product-detail-title">
        <div className={styles.heroTopRow}>
          <a href="/menu" className={styles.backButton}>
            <span className={styles.backIcon}>←</span>
            Menu
          </a>
          <div className={styles.heroBadge}>
            <Badge tone={availability.tone}>{availability.label}</Badge>
          </div>
        </div>

        <h1 id="product-detail-title" className={styles.heroTitle}>{product.name}</h1>
        <p className={styles.heroDescription}>{product.description}</p>

        <div className={styles.heroMeta}>
          <span className={styles.heroPrice}>{formatMoney(product.basePrice.amountCents)}</span>
        </div>

        {visibleAllergens.length > 0 ? (
          <div className={styles.allergenRow}>
            {visibleAllergens.map((allergen) => (
              <span key={allergen.code} className={styles.allergenPill}>
                <span className={styles.allergenDot} />
                {allergen.label}
              </span>
            ))}
          </div>
        ) : null}
      </section>

      {/* ── Customization sections ── */}
      <div className={styles.customizationArea}>

        {/* Impasto */}
        <CollapsibleSection
          icon="🫓"
          title="Impasto"
          currentValue={selectedDoughLabel}
          delta={doughDelta}
          isOpen={openSection === "dough"}
          onToggle={() => toggleSection("dough")}
        >
          <DoughSelector state={state} dispatch={dispatch} />
        </CollapsibleSection>

        {/* Formato */}
        <CollapsibleSection
          icon="📐"
          title="Formato"
          currentValue={selectedVariantLabel}
          delta={variantDelta}
          isOpen={openSection === "variant"}
          onToggle={() => toggleSection("variant")}
        >
          <VariantSelector state={state} dispatch={dispatch} />
        </CollapsibleSection>

        {/* Ingredienti */}
        <CollapsibleSection
          icon="🧀"
          title="Ingredienti"
          currentValue={ingredientChanges}
          delta={priceBreakdown.ingredientDeltaCents}
          isOpen={openSection === "ingredients"}
          onToggle={() => toggleSection("ingredients")}
        >
          <IngredientSelector state={state} dispatch={dispatch} />
        </CollapsibleSection>

        {/* Extra */}
        <CollapsibleSection
          icon="✨"
          title="Extra"
          currentValue={activeExtrasCount > 0 ? `${activeExtrasCount} selezionati` : "Nessun extra"}
          delta={priceBreakdown.extrasDeltaCents}
          isOpen={openSection === "extras"}
          onToggle={() => toggleSection("extras")}
        >
          <ExtraSelector state={state} dispatch={dispatch} />
        </CollapsibleSection>
      </div>

      {/* ── Pairings ── */}
      {pairings.length > 0 ? (
        <section className={styles.pairingsSection}>
          <h2 className={styles.pairingsTitle}>Abbinamenti consigliati</h2>
          <div className={styles.pairingsList}>
            {pairings.map((pairing) => (
              <div key={pairing.id} className={styles.pairingCard}>
                <div className={styles.pairingInfo}>
                  <p className={styles.pairingName}>{pairing.title}</p>
                  <p className={styles.pairingDescription}>{pairing.description}</p>
                </div>
                <span className={styles.pairingPrice}>{formatMoney(pairing.priceCents)}</span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* ── Sticky CTA ── */}
      <div className={styles.stickyCtaWrapper} aria-live="polite">
        <button
          type="button"
          className={
            `${styles.stickyCtaButton}${isAddSuccess ? ` ${styles.stickyCtaSuccess}` : ""}`
          }
          onClick={handleAddToCartClick}
          disabled={!availability.isOrderable}
          aria-label={`${formatMoney(priceBreakdown.totalCents)} – Aggiungi al carrello`}
        >
          {isAddSuccess ? (
            <span className={styles.ctaLabel}>✓ Aggiunto</span>
          ) : (
            <>
              <span
                className={
                  `${styles.ctaPrice}${isPricePulsing ? ` ${styles.ctaPricePulse}` : ""}`
                }
                data-testid="customization-total-value"
              >
                {formatMoney(priceBreakdown.totalCents)}
              </span>
              <span className={styles.ctaDot}>·</span>
              <span className={styles.ctaLabel}>Aggiungi al carrello</span>
            </>
          )}
        </button>
      </div>

      {/* ── Cart toast ── */}
      {isCartToastVisible ? (
        <div className={styles.toastOverlay}>
          <div className={styles.toastCard}>
            <p className={styles.toastTitle}>
              <span className={styles.toastIcon}>✅</span>
              Aggiunto al carrello
            </p>
            <p className={styles.toastMessage}>
              {product.name} con le tue personalizzazioni è stato aggiunto. Continua o vai al carrello.
            </p>
            <div className={styles.toastActions}>
              <a href="/cart" className={styles.toastLink}>Vai al carrello</a>
              <a href="/menu" className={styles.toastLinkSecondary}>Continua</a>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

/* ── Collapsible section wrapper ── */

interface CollapsibleSectionProps
{
  readonly icon: string;
  readonly title: string;
  readonly currentValue: string;
  readonly delta: number;
  readonly isOpen: boolean;
  readonly onToggle: () => void;
  readonly children: ReactElement;
}

function CollapsibleSection(props: CollapsibleSectionProps): ReactElement
{
  return (
    <div className={styles.sectionCard}>
      <button
        type="button"
        className={styles.sectionHeader}
        onClick={props.onToggle}
        aria-expanded={props.isOpen}
      >
        <div className={styles.sectionHeaderLeft}>
          <span className={styles.sectionIcon}>{props.icon}</span>
          <div className={styles.sectionTitleGroup}>
            <h2 className={styles.sectionTitle}>{props.title}</h2>
            <p className={styles.sectionCurrentValue}>{props.currentValue}</p>
          </div>
        </div>
        <div className={styles.sectionHeaderRight}>
          {props.delta !== 0 ? (
            <span className={styles.sectionDelta}>{formatDelta(props.delta)}</span>
          ) : null}
          <span className={`${styles.chevron} ${props.isOpen ? styles.chevronOpen : ""}`}>▾</span>
        </div>
      </button>

      <div className={`${styles.sectionBody} ${props.isOpen ? styles.sectionBodyOpen : ""}`}>
        <div className={styles.sectionContent}>
          {props.children}
        </div>
      </div>
    </div>
  );
}

/* ── Dough selector ── */

interface DoughSelectorProps
{
  readonly state: CustomizationState;
  readonly dispatch: Dispatch<Parameters<typeof customizationReducer>[1]>;
}

function DoughSelector(props: DoughSelectorProps): ReactElement
{
  return (
    <div className={styles.optionPillGroup} role="radiogroup" aria-label="Scelta impasto">
      {DOUGH_OPTIONS.map((option) =>
      {
        const isActive = props.state.selectedDoughId === option.id;

        return (
          <label
            key={option.id}
            className={`${styles.optionPill} ${isActive ? styles.optionPillActive : ""}`}
          >
            <input
              type="radio"
              name="dough-option"
              checked={isActive}
              onChange={() => props.dispatch({ type: "set_dough", doughId: option.id })}
            />
            <span className={styles.optionPillTitle}>{option.label}</span>
            <span className={styles.optionPillDescription}>{option.description}</span>
            <span className={styles.optionPillDelta}>{formatDelta(option.priceDeltaCents)}</span>
          </label>
        );
      })}
    </div>
  );
}

/* ── Variant selector ── */

interface VariantSelectorProps
{
  readonly state: CustomizationState;
  readonly dispatch: Dispatch<Parameters<typeof customizationReducer>[1]>;
}

function VariantSelector(props: VariantSelectorProps): ReactElement
{
  return (
    <div className={styles.optionPillGroup} role="radiogroup" aria-label="Scelta formato">
      {VARIANT_OPTIONS.map((option) =>
      {
        const isActive = props.state.selectedVariantId === option.id;

        return (
          <label
            key={option.id}
            className={`${styles.optionPill} ${isActive ? styles.optionPillActive : ""}`}
          >
            <input
              type="radio"
              name="variant-option"
              checked={isActive}
              onChange={() => props.dispatch({ type: "set_variant", variantId: option.id })}
            />
            <span className={styles.optionPillTitle}>{option.label}</span>
            <span className={styles.optionPillDescription}>{option.description}</span>
            <span className={styles.optionPillDelta}>{formatDelta(option.priceDeltaCents)}</span>
          </label>
        );
      })}
    </div>
  );
}

/* ── Ingredient selector ── */

interface IngredientSelectorProps
{
  readonly state: CustomizationState;
  readonly dispatch: Dispatch<Parameters<typeof customizationReducer>[1]>;
}

function IngredientSelector(props: IngredientSelectorProps): ReactElement
{
  return (
    <div className={styles.ingredientList}>
      {INGREDIENT_OPTIONS.map((ingredient) =>
      {
        const currentMode = (props.state.ingredientModes[ingredient.id] ?? ingredient.defaultMode) as IngredientMode;

        return (
          <div key={ingredient.id} className={styles.ingredientRow}>
            <div className={styles.ingredientInfo}>
              <h3 className={styles.ingredientName}>{ingredient.label}</h3>
              <p className={styles.ingredientDesc}>{ingredient.description}</p>
              {currentMode === "extra" ? (
                <span className={styles.ingredientExtraPrice}>+{formatMoney(ingredient.extraPriceCents)}</span>
              ) : null}
            </div>
            <div className={styles.ingredientControls} role="radiogroup" aria-label={ingredient.label}>
              {(Object.entries(INGREDIENT_MODE_LABEL) as [IngredientMode, string][]).map(([mode, modeLabel]) =>
              {
                const isActive = currentMode === mode;
                let activeClass = "";

                if (isActive && mode === "extra")
                {
                  activeClass = styles.modeButtonExtra;
                }
                else if (isActive && mode === "senza")
                {
                  activeClass = styles.modeButtonSenza;
                }
                else if (isActive)
                {
                  activeClass = styles.modeButtonActive;
                }

                return (
                  <button
                    key={mode}
                    type="button"
                    className={`${styles.modeButton} ${activeClass}`}
                    onClick={() =>
                      props.dispatch({
                        type: "set_ingredient_mode",
                        ingredientId: ingredient.id,
                        mode
                      })}
                    aria-pressed={isActive}
                  >
                    {modeLabel}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Extra selector ── */

interface ExtraSelectorProps
{
  readonly state: CustomizationState;
  readonly dispatch: Dispatch<Parameters<typeof customizationReducer>[1]>;
}

function ExtraSelector(props: ExtraSelectorProps): ReactElement
{
  return (
    <div className={styles.extraList}>
      {EXTRA_OPTIONS.map((extra) =>
      {
        const isActive = props.state.selectedExtraIds.includes(extra.id);

        return (
          <button
            key={extra.id}
            type="button"
            className={`${styles.extraRow} ${isActive ? styles.extraRowActive : ""}`}
            onClick={() => props.dispatch({ type: "toggle_extra", extraId: extra.id })}
            aria-pressed={isActive}
          >
            <span className={`${styles.extraCheckbox} ${isActive ? styles.extraCheckboxActive : ""}`}>
              {isActive ? "✓" : ""}
            </span>
            <div className={styles.extraInfo}>
              <p className={styles.extraName}>{extra.label}</p>
              <p className={styles.extraDesc}>{extra.description}</p>
            </div>
            <span className={styles.extraPrice}>{formatDelta(extra.priceCents)}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ── Helpers ── */

function formatMoney(amountCents: number): string
{
  return MONEY_FORMATTER.format(amountCents / 100);
}

function formatDelta(amountCents: number): string
{
  if (amountCents === 0)
  {
    return "Incluso";
  }

  if (amountCents > 0)
  {
    return `+${formatMoney(amountCents)}`;
  }

  return `-${formatMoney(Math.abs(amountCents))}`;
}

function deriveIngredientChangesSummary(state: CustomizationState): string
{
  const changes: string[] = [];

  for (const ingredient of INGREDIENT_OPTIONS)
  {
    const currentMode = state.ingredientModes[ingredient.id] ?? ingredient.defaultMode;

    if (currentMode !== ingredient.defaultMode)
    {
      const modeLabel = INGREDIENT_MODE_LABEL[currentMode as IngredientMode];

      changes.push(`${ingredient.label}: ${modeLabel}`);
    }
  }

  if (changes.length === 0)
  {
    return "Ricetta originale";
  }

  return changes.join(", ");
}

function createCustomizationNotes(input: {
  readonly doughLabel: string;
  readonly variantLabel: string;
  readonly selectedExtras: readonly string[];
}): string
{
  const segments = [
    `Impasto: ${input.doughLabel}`,
    `Formato: ${input.variantLabel}`
  ];

  if (input.selectedExtras.length > 0)
  {
    segments.push(`Extra: ${input.selectedExtras.join(", ")}`);
  }

  return segments.join(" · ");
}
