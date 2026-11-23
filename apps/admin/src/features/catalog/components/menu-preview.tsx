import { menuImagePath, resolveMenuComposition } from "@pizzaos/domain";
import type { IndividualIngredient, MenuDraft } from "@pizzaos/domain";
import Image from "next/image";
import styles from "./operational-catalog.module.css";

const money = new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" });

export function MenuPreview({ menu, storeId, ingredients }: {
  menu: MenuDraft;
  storeId: string;
  ingredients: readonly IndividualIngredient[];
}) {
  const products = new Map(menu.products.map(product => [product.id, product]));
  const ingredientsById = new Map(ingredients.map(ingredient => [ingredient.id, ingredient]));
  return <section className={styles.preview} aria-label="Anteprima menu">
    <h3>{menu.name}</h3>
    {menu.kitchenNotice && <p>{menu.kitchenNotice}</p>}
    {menu.sections.length === 0 && <p>Il menu non ha ancora sezioni.</p>}
    {menu.sections.map(section => <section key={section.id} className={styles.stack} aria-label={section.name}>
      <h4>{section.name}</h4>
      {section.description && <p>{section.description}</p>}
      {section.productIds.length === 0 && <p className={styles.small}>Nessun prodotto nella sezione.</p>}
      {section.productIds.map(id => {
        const product = products.get(id);
        if (!product) return null;
        const options = new Map(product.options.map(option => [option.id, option]));
        const foodIngredients = Object.keys(product.ingredients).flatMap(id => {
          const ingredient = ingredientsById.get(id);
          return ingredient ? [{ id, name: ingredient.name, food: ingredient.food }] : [];
        });
        const { composition } = resolveMenuComposition({ ...product, foodIngredients }, []);
        return <article key={id} className={styles.productPreview}>
          {product.imageId && <Image src={menuImagePath(storeId, product.imageId)} alt="" width={96} height={96} unoptimized />}
          <div className={styles.productPreviewBody}>
            <strong>{product.name || "Prodotto senza nome"}</strong>
            {product.description && <p>{product.description}</p>}
            {!product.available && <p>Esaurito</p>}
            {composition.contains.length > 0 && <p className={styles.small}>Contiene {composition.contains.join(", ")}</p>}
            {composition.mayContain.length > 0 && <p className={styles.small}>Può contenere {composition.mayContain.join(", ")}</p>}
            {product.extraOffer && <p className={styles.small}>Fino a {product.extraOffer.quota} extra al −{product.extraOffer.percent}%</p>}
            {product.options.length > 0 && <details>
              <summary>Mostra scelte</summary>
              {product.groups ? product.groups.map(group => <div key={group.id}>
                <p><strong>{group.name}</strong><span className={styles.small}> · {group.min === group.max ? `${group.min} richieste` : `${group.min}–${group.max} scelte`}</span></p>
                <ul>{group.optionIds.map(optionId => {
                  const option = options.get(optionId);
                  return option && <li key={optionId}>{option.name} · {money.format(option.priceCents / 100)}</li>;
                })}</ul>
              </div>) : <ul>{product.options.map(option => <li key={option.id}>{option.name} · {money.format(option.priceCents / 100)}</li>)}</ul>}
            </details>}
          </div>
          <strong>{product.groups?.some(group => group.min > 0) && "Base "}{money.format(product.priceCents / 100)}</strong>
        </article>;
      })}
    </section>)}
  </section>;
}
