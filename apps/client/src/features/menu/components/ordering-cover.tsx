import { BRAND_ASSETS } from "@pizzaos/brand";
import { BrandLogo } from "@pizzaos/ui";
import styles from "./ordering-cover.module.css";

export function OrderingCover({ profileHref }: { profileHref?: string }) {
  return <div className={styles.cover}>
    <div className={styles.brand}>
      <BrandLogo src={BRAND_ASSETS.logo} width={148} height={37} />
    </div>
    {profileHref && <a className={styles.profileLink} href={profileHref} aria-label="Apri profilo" title="Apri profilo">
      <svg aria-hidden="true" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21v-2a8 8 0 0 1 16 0v2" />
      </svg>
    </a>}
  </div>;
}
