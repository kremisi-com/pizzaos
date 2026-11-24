import { BRAND_ASSETS } from "@pizzaos/brand";
import { BrandLogo } from "@pizzaos/ui";
import styles from "./ordering-cover.module.css";

export function OrderingCover() {
  return <div className={styles.cover}>
    <div className={styles.brand}>
      <BrandLogo src={BRAND_ASSETS.logo} width={148} height={37} />
    </div>
  </div>;
}
