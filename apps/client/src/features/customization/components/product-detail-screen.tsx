"use client";

import type { Product } from "@pizzaos/domain";
import type { ClientSeed } from "@pizzaos/mock-data";
import { Badge, Button, ShellCard, Toast } from "@pizzaos/ui";
import { useEffect, useReducer, useState, type Dispatch, type ReactElement } from "react";
import { addCartItem } from "../../cart/cart-model";
import { loadClientDemoState } from "../../home/client-demo-state";
import { deriveProductAvailability } from "../../menu/menu-view-model";
import {
  createInitialCustomizationState,
  CUSTOMIZATION_STEPS,
  customizationReducer,
  deriveCustomizationPrice,
  deriveVisibleAllergens,
  DOUGH_OPTIONS,
  EXTRA_OPTIONS,
  getPairingSuggestions,
  INGREDIENT_OPTIONS,
  LAST_CUSTOMIZATION_STEP_INDEX,
  VARIANT_OPTIONS,
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

  useEffect(() =>
  {
    setSeed(loadClientDemoState(resolveStorage()));
  }, []);

  const product = seed.products.find((candidateProduct) => candidateProduct.id === props.productId);

  if (!product)
  {
    return (
      <main className={styles.screen}>
        <section className={styles.hero}>
          <a href="/menu" className={styles.backLink}>Torna al menu</a>
          <h1 className={styles.heroTitle}>Prodotto non trovato</h1>
          <p className={styles.heroCopy}>
            Questo dettaglio non è disponibile nello stato demo corrente. Apri il menu e seleziona un prodotto valido.
          </p>
        </section>
      </main>
    );
  }

  const availability = deriveProductAvailability(product);
  const priceBreakdown = deriveCustomizationPrice(product.basePrice.amountCents, state);
  const visibleAllergens = deriveVisibleAllergens(product.allergens, state);
  const pairings = getPairingSuggestions(product.id);
  const currentStep = CUSTOMIZATION_STEPS[state.currentStepIndex];
  const isLastStep = state.currentStepIndex === LAST_CUSTOMIZATION_STEP_INDEX;

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

    setIsCartToastVisible(true);
  }

  return (
    <main className={styles.screen}>
      <section className={styles.hero} aria-labelledby="product-detail-title">
        <div className={styles.heroTopRow}>
          <a href="/menu" className={styles.backLink}>Torna al menu</a>
          <Badge tone={availability.tone}>{availability.label}</Badge>
        </div>

        <h1 id="product-detail-title" className={styles.heroTitle}>{product.name}</h1>
        <p className={styles.heroCopy}>{product.description}</p>

        <div className={styles.heroMetaRow}>
          <span className={styles.heroMetaLabel}>Prezzo base</span>
          <span className={styles.heroMetaValue}>{formatMoney(product.basePrice.amountCents)}</span>
        </div>
      </section>

      <section className={styles.priceSection} aria-label="Prezzo configurazione">
        <ShellCard title="Prezzo in tempo reale">
          <div className={styles.priceBox}>
            <p className={styles.priceTotal}>{formatMoney(priceBreakdown.totalCents)}</p>
            <div className={styles.breakdownGrid}>
              <p>Base prodotto</p>
              <p>{formatMoney(priceBreakdown.basePriceCents)}</p>
              <p>Impasto</p>
              <p>{formatDelta(priceBreakdown.doughDeltaCents)}</p>
              <p>Variante</p>
              <p>{formatDelta(priceBreakdown.variantDeltaCents)}</p>
              <p>Ingredienti</p>
              <p>{formatDelta(priceBreakdown.ingredientDeltaCents)}</p>
              <p>Extra</p>
              <p>{formatDelta(priceBreakdown.extrasDeltaCents)}</p>
            </div>
          </div>
        </ShellCard>
      </section>

      <section className={styles.flowSection} aria-labelledby="customization-flow-title">
        <div className={styles.flowHeader}>
          <p className={styles.flowEyebrow}>Step {state.currentStepIndex + 1} di {CUSTOMIZATION_STEPS.length}</p>
          <h2 id="customization-flow-title" className={styles.flowTitle}>{currentStep.title}</h2>
        </div>

        <ol className={styles.stepProgress} aria-label="Progressione personalizzazione">
          {CUSTOMIZATION_STEPS.map((step, stepIndex) => (
            <li key={step.id}>
              <button
                type="button"
                className={`${styles.stepButton} ${stepIndex === state.currentStepIndex ? styles.stepButtonActive : ""}`}
                onClick={() => dispatch({ type: "go_to_step", stepIndex })}
                aria-current={stepIndex === state.currentStepIndex ? "step" : undefined}
              >
                <span>{stepIndex + 1}</span>
                <small>{step.title}</small>
              </button>
            </li>
          ))}
        </ol>

        {renderStepContent(product, state, dispatch)}

        <div className={styles.flowActions}>
          <Button
            variant="secondary"
            onClick={() => dispatch({ type: "previous_step" })}
            disabled={state.currentStepIndex === 0}
          >
            Indietro
          </Button>

          {isLastStep ? (
            <Button
              onClick={handleAddToCartClick}
              disabled={!availability.isOrderable}
            >
              Aggiungi al carrello
            </Button>
          ) : (
            <Button onClick={() => dispatch({ type: "next_step" })}>
              Continua
            </Button>
          )}
        </div>
      </section>

      <section className={styles.supportSection}>
        <ShellCard title="Allergeni visibili">
          <p className={styles.supportLead}>Sempre aggiornati durante la configurazione.</p>
          <ul className={styles.supportList}>
            {visibleAllergens.map((allergen) => (
              <li key={allergen.code}>{allergen.label}</li>
            ))}
          </ul>
        </ShellCard>

        <ShellCard title="Abbinamenti consigliati">
          <ul className={styles.pairingList}>
            {pairings.map((pairing) => (
              <li key={pairing.id} className={styles.pairingItem}>
                <div>
                  <p className={styles.pairingTitle}>{pairing.title}</p>
                  <p className={styles.pairingDescription}>{pairing.description}</p>
                </div>
                <p className={styles.pairingPrice}>{formatMoney(pairing.priceCents)}</p>
              </li>
            ))}
          </ul>
        </ShellCard>
      </section>

      <div className={styles.totalBar} aria-live="polite">
        <span>Totale configurazione</span>
        <strong data-testid="customization-total-value">{formatMoney(priceBreakdown.totalCents)}</strong>
      </div>

      {isCartToastVisible ? (
        <div className={styles.toastWrap}>
          <Toast
            title="Configurazione pronta"
            message="Prodotto aggiunto al carrello. Puoi passare al checkout o continuare con altre pizze."
          />
          <div className={styles.toastActions}>
            <a href="/cart" className={styles.toastLink}>Vai al carrello</a>
            <a href="/menu" className={styles.toastLinkSecondary}>Continua ordine</a>
          </div>
        </div>
      ) : null}
    </main>
  );
}

function renderStepContent(
  product: Product,
  state: ReturnType<typeof createInitialCustomizationState>,
  dispatch: Dispatch<Parameters<typeof customizationReducer>[1]>
): ReactElement
{
  const currentStep = CUSTOMIZATION_STEPS[state.currentStepIndex].id;

  if (currentStep === "dough")
  {
    return (
      <div className={styles.optionGrid} role="radiogroup" aria-label="Scelta impasto">
        {DOUGH_OPTIONS.map((option) => (
          <label key={option.id} className={styles.optionCard}>
            <input
              type="radio"
              name="dough-option"
              checked={state.selectedDoughId === option.id}
              onChange={() => dispatch({ type: "set_dough", doughId: option.id })}
            />
            <span className={styles.optionTitle}>{option.label}</span>
            <span className={styles.optionDescription}>{option.description}</span>
            <span className={styles.optionDelta}>{formatDelta(option.priceDeltaCents)}</span>
          </label>
        ))}
      </div>
    );
  }

  if (currentStep === "variant")
  {
    return (
      <div className={styles.optionGrid} role="radiogroup" aria-label="Scelta variante">
        {VARIANT_OPTIONS.map((option) => (
          <label key={option.id} className={styles.optionCard}>
            <input
              type="radio"
              name="variant-option"
              checked={state.selectedVariantId === option.id}
              onChange={() => dispatch({ type: "set_variant", variantId: option.id })}
            />
            <span className={styles.optionTitle}>{option.label}</span>
            <span className={styles.optionDescription}>{option.description}</span>
            <span className={styles.optionDelta}>{formatDelta(option.priceDeltaCents)}</span>
          </label>
        ))}
      </div>
    );
  }

  if (currentStep === "ingredients")
  {
    return (
      <div className={styles.ingredientStack}>
        {INGREDIENT_OPTIONS.map((ingredient) => (
          <article key={ingredient.id} className={styles.ingredientCard}>
            <div className={styles.ingredientTopRow}>
              <div>
                <h3 className={styles.ingredientTitle}>{ingredient.label}</h3>
                <p className={styles.ingredientDescription}>{ingredient.description}</p>
              </div>
              <span className={styles.ingredientMeta}>Extra {formatMoney(ingredient.extraPriceCents)}</span>
            </div>

            <div className={styles.ingredientModes} role="radiogroup" aria-label={ingredient.label}>
              {Object.entries(INGREDIENT_MODE_LABEL).map(([mode, modeLabel]) => {
                const resolvedMode = mode as IngredientMode;

                return (
                  <label key={mode} className={styles.modeOption}>
                    <input
                      type="radio"
                      name={`ingredient-${ingredient.id}`}
                      checked={(state.ingredientModes[ingredient.id] ?? ingredient.defaultMode) === resolvedMode}
                      onChange={() =>
                        dispatch({
                          type: "set_ingredient_mode",
                          ingredientId: ingredient.id,
                          mode: resolvedMode
                        })}
                    />
                    <span>{modeLabel}</span>
                  </label>
                );
              })}
            </div>
          </article>
        ))}
      </div>
    );
  }

  if (currentStep === "extras")
  {
    return (
      <div className={styles.extraStack}>
        {EXTRA_OPTIONS.map((extra) => (
          <label key={extra.id} className={styles.extraOption}>
            <input
              type="checkbox"
              checked={state.selectedExtraIds.includes(extra.id)}
              onChange={() => dispatch({ type: "toggle_extra", extraId: extra.id })}
            />
            <div>
              <span className={styles.optionTitle}>{extra.label}</span>
              <span className={styles.optionDescription}>{extra.description}</span>
            </div>
            <span className={styles.optionDelta}>{formatDelta(extra.priceCents)}</span>
          </label>
        ))}
      </div>
    );
  }

  return (
    <div className={styles.summaryCard}>
      <h3 className={styles.summaryTitle}>Configurazione pronta</h3>
      <p className={styles.summaryCopy}>
        {product.name} con impasto, varianti e extra selezionati. Procedi all&apos;aggiunta al carrello per continuare al checkout.
      </p>
      <ul className={styles.summaryList}>
        <li>Impasto selezionato: {DOUGH_OPTIONS.find((option) => option.id === state.selectedDoughId)?.label}</li>
        <li>Variante selezionata: {VARIANT_OPTIONS.find((option) => option.id === state.selectedVariantId)?.label}</li>
        <li>Extra selezionati: {state.selectedExtraIds.length}</li>
      </ul>
    </div>
  );
}

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
