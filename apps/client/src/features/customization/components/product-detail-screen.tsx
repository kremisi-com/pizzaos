"use client";

import type { Product, ProductAllergen } from "@pizzaos/domain";
import type { ClientSeed } from "@pizzaos/mock-data";
import { Dialog } from "@pizzaos/ui";
import { useCallback, useEffect, useReducer, useRef, useState, type Dispatch, type ReactElement } from "react";
import { addCartItem } from "../../cart/cart-model";
import { loadClientDemoState } from "../../home/client-demo-state";
import { deriveProductAvailability } from "../../menu/menu-view-model";
import {
  ALLERGEN_EMOJI_MAP,
  createInitialCustomizationState,
  customizationReducer,
  deriveCustomizationPrice,
  deriveRemovedIngredientLabels,
  deriveVisibleAllergens,
  DOUGH_OPTIONS,
  EXTRA_CATEGORIES,
  EXTRA_OPTIONS,
  getPizzaPreviewImage,
  getIngredientOptionsForProduct,
  getPairingSuggestions,
  getProductToppingImage,
  PIZZA_BASE_OPTIONS,
  VARIANT_OPTIONS,
  BUNDLE_CONFIGS,
  deriveExtraPrice,
  type CustomizationState,
  type IngredientMode
} from "../customization-model";
import styles from "./product-detail-screen.module.css";

const MONEY_FORMATTER = new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR"
});

type OpenSection = "dough" | "base" | "variant" | "ingredients" | "extras" | null;

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
  const [state, dispatch] = useReducer(customizationReducer, undefined, () => createInitialCustomizationState());
  const [customerNote, setCustomerNote] = useState("");
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
  const isOrderable = product ? deriveProductAvailability(product).isOrderable : false;

  useEffect(() =>
  {
    if (product)
    {
      document.title = `${product.name} | PizzaOS`;
    }
  }, [product]);

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
      dispatch({ type: "set_dough", doughId: savedDough });
    }

    dispatch({
      type: "set_base",
      baseId: savedBase ?? inferDefaultBaseId(product)
    });
  }, [product]);

  const priceBreakdown = deriveCustomizationPrice(props.productId, product?.basePrice.amountCents ?? 0, state);

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

  const visibleAllergens = deriveVisibleAllergens(props.productId, product?.allergens ?? [], state);
  const pairings = product ? getPairingSuggestions(product.id) : [];
  const toppingImage = product ? getProductToppingImage(product.id) : undefined;

  function handleAddToCartClick(): void
  {
    if (!product)
    {
      return;
    }

    const doughLabel = DOUGH_OPTIONS.find((option) => option.id === state.selectedDoughId)?.label ?? "Classico";
    const baseLabel = PIZZA_BASE_OPTIONS.find((option) => option.id === state.selectedBaseId)?.label ?? "Rossa";
    const variantLabel = VARIANT_OPTIONS.find((option) => option.id === state.selectedVariantId)?.label ?? "Classica";
    const selectedExtras = EXTRA_OPTIONS
      .filter((extra) => state.selectedExtraIds.includes(extra.id))
      .map((extra) => extra.label);
    const removedIngredients = deriveRemovedIngredientLabels(product.id, state.ingredientModes);
    const notes = createCustomizationNotes({
      baseLabel,
      doughLabel,
      variantLabel,
      selectedExtras,
      customerNote
    });

    addCartItem(
      {
        productId: product.id,
        productName: product.name,
        unitPriceCents: priceBreakdown.totalCents,
        quantity: 1,
        notes,
        removedIngredients
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
  const selectedBaseLabel = PIZZA_BASE_OPTIONS.find((option) => option.id === state.selectedBaseId)?.label ?? "Rossa";
  const selectedVariantLabel = VARIANT_OPTIONS.find((option) => option.id === state.selectedVariantId)?.label ?? "Classica";
  const doughDelta = DOUGH_OPTIONS.find((option) => option.id === state.selectedDoughId)?.priceDeltaCents ?? 0;
  const variantDelta = VARIANT_OPTIONS.find((option) => option.id === state.selectedVariantId)?.priceDeltaCents ?? 0;
  const activeExtrasCount = state.selectedExtraIds.length;
  const ingredientChanges = deriveIngredientChangesSummary(props.productId, state);

  const [isIngredientsModalOpen, setIsIngredientsModalOpen] = useState(false);

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

  return (
    <main className={styles.screen}>
      <section className={styles.hero} aria-labelledby="product-detail-title">
        <div className={styles.heroTopRow}>
          <a href="/menu" className={styles.backButton}>
            <span className={styles.backIcon}>←</span>
            Menu
          </a>
        </div>

        <div className={styles.generatorPreview}>
          <div className={styles.generatorPreviewFrame}>
            <img
              src={getPizzaPreviewImage({
                doughId: state.selectedDoughId,
                baseId: state.selectedBaseId
              })}
              alt={`Anteprima pizza ${product.name}`}
              className={styles.generatorPreviewImage}
            />
            {toppingImage && (
              <img
                src={toppingImage}
                alt=""
                aria-hidden="true"
                className={styles.generatorPreviewOverlay}
              />
            )}
          </div>
        </div>

        <div className={styles.titleWrapper}>
          <h1 id="product-detail-title" className={styles.heroTitle}>{product.name}</h1>
          <button
            type="button"
            className={styles.infoButton}
            onClick={() => setIsIngredientsModalOpen(true)}
            aria-label="Informazioni ingredienti e allergeni"
          >
            🔍
          </button>
        </div>
        <p className={styles.heroDescription}>{product.description}</p>

        <div className={styles.heroMeta}>
          <span className={styles.heroPrice}>{formatMoney(product.basePrice.amountCents)}</span>
        </div>
      </section>

      <IngredientsModal
        isOpen={isIngredientsModalOpen}
        onClose={() => setIsIngredientsModalOpen(false)}
        product={product}
      />

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

        <CollapsibleSection
          icon={state.selectedBaseId === "base-rossa" ? "🍅" : "🍶"}
          title="Base"
          currentValue={selectedBaseLabel}
          delta={0}
          isOpen={openSection === "base"}
          onToggle={() => toggleSection("base")}
        >
          <BaseSelector state={state} dispatch={dispatch} />
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
          <IngredientSelector productId={props.productId} state={state} dispatch={dispatch} />
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
          <ExtraSelector state={state} dispatch={dispatch} productId={props.productId} />
        </CollapsibleSection>
      </div>

      <section className={styles.noteSection} aria-labelledby="product-note-title">
        <div className={styles.noteHeader}>
          <span className={styles.noteIcon} aria-hidden="true">📝</span>
          <div className={styles.noteCopy}>
            <h2 id="product-note-title" className={styles.noteTitle}>Note per la cucina</h2>
            <p className={styles.noteDescription}>
              Aggiungi richieste semplici come taglio, cottura o confezione separata.
            </p>
          </div>
        </div>
        <label className={styles.noteField}>
          <span className={styles.noteLabel}>Messaggio opzionale</span>
          <textarea
            className={styles.noteTextarea}
            name="customer-note"
            placeholder="Es. taglia a spicchi piccoli, consegna senza suonare"
            value={customerNote}
            onChange={(event) => setCustomerNote(event.target.value)}
            maxLength={180}
            rows={4}
          />
        </label>
      </section>

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
                <div className={styles.pairingPriceGroup}>
                  <span className={styles.pairingPrice}>{formatMoney(pairing.priceCents)}</span>
                  <button
                    type="button"
                    className={styles.pairingAddButton}
                    onClick={() =>
                    {
                      addCartItem(
                        {
                          productId: pairing.id,
                          productName: pairing.title,
                          unitPriceCents: pairing.priceCents,
                          quantity: 1,
                          notes: "Abbinamento consigliato"
                        },
                        resolveStorage()
                      );
                      setIsCartToastVisible(true);
                    }}
                    aria-label={`Aggiungi ${pairing.title} al carrello`}
                  >
                    ＋
                  </button>
                </div>
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
          disabled={!isOrderable}
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
              <a href="/" className={styles.toastLinkSecondary}>Continua</a>
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
    <div className={`${styles.sectionCard} ${props.isOpen ? styles.sectionCardOpen : ""}`}>
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
    <div className={styles.optionList} role="radiogroup" aria-label="Scelta impasto">
      {DOUGH_OPTIONS.map((option) =>
      {
        const isActive = props.state.selectedDoughId === option.id;

        return (
          <label
            key={option.id}
            className={`${styles.optionRow} ${isActive ? styles.optionRowActive : ""}`}
          >
            <input
              type="radio"
              name="dough-option"
              className={styles.hiddenInput}
              checked={isActive}
              onChange={() => {
                props.dispatch({ type: "set_dough", doughId: option.id });
                if (typeof window !== "undefined")
                {
                  window.localStorage.setItem("pizzaos-selected-dough", option.id);
                }
              }}
            />
            <div className={styles.optionInfo}>
              <span className={styles.optionTitle}>{option.icon} {option.label}</span>
              {option.description ? <span className={styles.optionDescription}>{option.description}</span> : null}
            </div>
            <div className={styles.optionRight}>
              {option.priceDeltaCents !== 0 && <span className={styles.optionDelta}>{formatDelta(option.priceDeltaCents)}</span>}
              <div className={`${styles.radioCircle} ${isActive ? styles.radioCircleActive : ""}`} />
            </div>
          </label>
        );
      })}
    </div>
  );
}

interface BaseSelectorProps
{
  readonly state: CustomizationState;
  readonly dispatch: Dispatch<Parameters<typeof customizationReducer>[1]>;
}

function BaseSelector(props: BaseSelectorProps): ReactElement
{
  return (
    <div className={styles.optionList} role="radiogroup" aria-label="Scelta base">
      {PIZZA_BASE_OPTIONS.map((option) =>
      {
        const isActive = props.state.selectedBaseId === option.id;

        return (
          <label
            key={option.id}
            className={`${styles.optionRow} ${isActive ? styles.optionRowActive : ""}`}
          >
            <input
              type="radio"
              name="base-option"
              className={styles.hiddenInput}
              checked={isActive}
              onChange={() => {
                props.dispatch({ type: "set_base", baseId: option.id });
                if (typeof window !== "undefined")
                {
                  window.localStorage.setItem("pizzaos-selected-base", option.id);
                }
              }}
            />
            <div className={styles.optionInfo}>
              <span className={styles.optionTitle}>{option.label}</span>
              <span className={styles.optionDescription}>{option.description}</span>
            </div>
            <div className={styles.optionRight}>
              <div className={`${styles.radioCircle} ${isActive ? styles.radioCircleActive : ""}`} />
            </div>
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
  readonly productId: string;
  readonly state: CustomizationState;
  readonly dispatch: Dispatch<Parameters<typeof customizationReducer>[1]>;
}

function IngredientSelector(props: IngredientSelectorProps): ReactElement
{
  const ingredientOptions = getIngredientOptionsForProduct(props.productId);

  return (
    <div className={styles.ingredientList}>
      {ingredientOptions.map((ingredient) =>
      {
        const currentMode = (props.state.ingredientModes[ingredient.id] ?? ingredient.defaultMode) as IngredientMode;
        const isSelected = currentMode !== "senza";

        return (
          <div key={ingredient.id} className={styles.ingredientRow}>
            <div className={styles.ingredientInfo}>
              <h3 className={styles.ingredientName}>{ingredient.label}</h3>
              {ingredient.description && <p className={styles.ingredientDesc}>{ingredient.description}</p>}
            </div>

            <button
              type="button"
              className={`${styles.ingredientToggle} ${isSelected ? styles.ingredientToggleActive : ""}`}
              onClick={() =>
                props.dispatch({
                  type: "set_ingredient_mode",
                  ingredientId: ingredient.id,
                  mode: isSelected ? "senza" : ingredient.defaultMode
                })}
              aria-pressed={isSelected}
              aria-label={`${ingredient.label} ${isSelected ? "incluso" : "escluso"}`}
            >
              <span className={styles.ingredientToggleIndicator} aria-hidden="true" />
              <span className={styles.ingredientToggleLabel}>{isSelected ? "Incluso" : "Escluso"}</span>
            </button>
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
  readonly productId: string;
}

function ExtraSelector(props: ExtraSelectorProps): ReactElement
{
  const [openCategoryId, setOpenCategoryId] = useState<string | null>(null);

  const toggleCategory = (categoryId: string) =>
  {
    setOpenCategoryId((current) => current === categoryId ? null : categoryId);
  };

  const bundleConfig = BUNDLE_CONFIGS[props.productId];
  const discountedCount = props.state.selectedExtraIds.length;
  const remainingDiscountSlots = bundleConfig ? Math.max(0, bundleConfig.discountQuota - discountedCount) : 0;

  return (
    <div className={styles.extraList}>
      {bundleConfig && (
        <div className={styles.bundleQuotaSummary}>
          <span className={styles.bundleQuotaIcon}>✨</span>
          <p className={styles.bundleQuotaText}>
            Hai <span className={styles.bundleQuotaCount}>{remainingDiscountSlots}</span> slot scontati al <span className={styles.bundleQuotaCount}>{bundleConfig.discountRate * 100}%</span> rimanenti.
          </p>
        </div>
      )}
      {EXTRA_CATEGORIES.map((category) =>
      {
        const options = EXTRA_OPTIONS.filter((extra) => extra.categoryId === category.id);

        if (options.length === 0)
        {
          return null;
        }

        const isOpen = openCategoryId === category.id;

        return (
          <section key={category.id} className={styles.extraCategory} aria-labelledby={`extra-category-${category.id}`}>
            <button
              type="button"
              className={`${styles.extraCategoryHeader} ${isOpen ? styles.extraCategoryHeaderOpen : ""}`}
              onClick={() => toggleCategory(category.id)}
              aria-expanded={isOpen}
            >
              <div className={styles.sectionTitleGroup}>
                <h3 id={`extra-category-${category.id}`} className={styles.extraCategoryTitle}>{category.title}</h3>
                <span className={styles.extraCategoryCount}>{options.length} opzioni disponibili</span>
              </div>
              <span className={styles.extraCategoryChevron}>
                {isOpen ? "▴" : "▾"}
              </span>
            </button>

            <div className={`${styles.extraCategoryContent} ${isOpen ? styles.extraCategoryContentOpen : ""}`}>
              {options.map((extra) =>
              {
                const isActive = props.state.selectedExtraIds.includes(extra.id);
                const discountedPrice = deriveExtraPrice(props.productId, extra.id, props.state.selectedExtraIds);
                const isDiscounted = discountedPrice < extra.priceCents;

                return (
                  <div key={extra.id} className={styles.extraRow}>
                    <div className={styles.extraInfo}>
                      <h3 className={styles.extraName}>{extra.label}</h3>
                      {extra.description && <p className={styles.extraDesc}>{extra.description}</p>}
                      <div className={styles.extraPriceGroup}>
                        {isDiscounted ? (
                          <>
                            <span className={styles.extraPriceStrikethrough}>{formatDelta(extra.priceCents)}</span>
                            <span className={styles.extraPriceDiscounted}>{formatDelta(discountedPrice)}</span>
                          </>
                        ) : (
                          <span className={styles.extraPrice}>{formatDelta(extra.priceCents)}</span>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      className={`${styles.ingredientToggle} ${isActive ? styles.ingredientToggleActive : ""}`}
                      onClick={() => props.dispatch({ type: "toggle_extra", extraId: extra.id })}
                      aria-pressed={isActive}
                      aria-label={`${extra.label} ${isActive ? "incluso" : "escluso"}`}
                    >
                      <span className={styles.ingredientToggleIndicator} aria-hidden="true" />
                      <span className={styles.ingredientToggleLabel}>{isActive ? "Incluso" : "Escluso"}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
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

function deriveIngredientChangesSummary(productId: string, state: CustomizationState): string
{
  const removedIngredients = deriveRemovedIngredientLabels(productId, state.ingredientModes);

  if (removedIngredients.length === 0)
  {
    return "Ricetta originale";
  }

  return `Senza ${removedIngredients.join(", ")}`;
}

function createCustomizationNotes(input: {
  readonly baseLabel: string;
  readonly doughLabel: string;
  readonly variantLabel: string;
  readonly selectedExtras: readonly string[];
  readonly customerNote: string;
}): string
{
  const segments = [
    `Base: ${input.baseLabel}`,
    `Impasto: ${input.doughLabel}`,
    `Formato: ${input.variantLabel}`
  ];

  if (input.selectedExtras.length > 0)
  {
    segments.push(`Extra: ${input.selectedExtras.join(", ")}`);
  }

  const sanitizedCustomerNote = input.customerNote.trim();

  if (sanitizedCustomerNote)
  {
    segments.push(`Note: ${sanitizedCustomerNote}`);
  }

  return segments.join(" · ");
}

function inferDefaultBaseId(product: Product | undefined): string
{
  if (!product)
  {
    return PIZZA_BASE_OPTIONS[0].id;
  }

  const normalizedText = `${product.name} ${product.description}`.toLocaleLowerCase("it-IT");

  if (
    normalizedText.includes("quattro formaggi") ||
    normalizedText.includes("focaccia") ||
    (!normalizedText.includes("pomodoro") && normalizedText.includes("fiordilatte"))
  )
  {
    return "base-bianca";
  }

  return "base-rossa";
}

/* ── Ingredients Modal ── */

interface IngredientsModalProps
{
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly product: Product;
}

function IngredientsModal(props: IngredientsModalProps): ReactElement
{
  const ingredients = getProductIngredients(props.product);

  // Collect all unique allergens from ingredients for the legend
  const uniqueAllergensMap = new Map<string, string>();

  for (const ing of ingredients)
  {
    for (const all of ing.allergens)
    {
      uniqueAllergensMap.set(all.code, all.label);
    }
  }
  const uniqueAllergens = Array.from(uniqueAllergensMap.entries()).map(([code, label]) => ({ code, label }));

  return (
    <Dialog
      open={props.isOpen}
      onClose={props.onClose}
      dialogId="ingredients-modal"
      title="Ingredienti e allergeni"
    >
      <div className={styles.modalIngredientList}>
        {ingredients.map((ing, idx) => (
          <div key={`${ing.label}-${idx}`} className={styles.modalIngredientRow}>
            <span className={styles.modalIngredientName}>{ing.label}</span>
            <div className={styles.modalAllergenDots}>
              {ing.allergens.map((all) => (
                <span key={all.code} className={styles.allergenEmojiDot} title={all.label}>
                  {ALLERGEN_EMOJI_MAP[all.code] ?? "❓"}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {uniqueAllergens.length > 0 && (
        <div className={styles.allergenLegend}>
          {uniqueAllergens.map((all) => (
            <div key={all.code} className={styles.legendItem}>
              <span className={styles.legendEmoji}>
                {ALLERGEN_EMOJI_MAP[all.code] ?? "❓"}
              </span>
              <span>{all.label}</span>
            </div>
          ))}
        </div>
      )}
    </Dialog>
  );
}

function getProductIngredients(product: Product): readonly {
  label: string;
  allergens: readonly ProductAllergen[];
}[]
{
  return [
    {
      label: "Impasto tradizionale PizzaOS",
      allergens: [{ code: "GLU", label: "Glutine" }]
    },
    ...getIngredientOptionsForProduct(product.id).map((ingredient) => ({
      label: ingredient.label,
      allergens: ingredient.allergens
    }))
  ];
}
