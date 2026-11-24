"use client";

import { useMemo } from "react";
import { BRAND_ASSETS } from "@pizzaos/brand";
import { BrandLogo } from "@pizzaos/ui";
import { RiderDeliveriesScreen } from "../features/rider-deliveries";
import { SignOutButton } from "../features/identity/components/sign-in-screen";
import { createRiderDeliveryApi } from "./api/rider-delivery-api";
import styles from "./pilot-extensions.module.css";

export function RiderShell() {
  const api = useMemo(() => createRiderDeliveryApi(), []);
  return <><div className={styles.riderAccount}><div className={styles.riderBrand}><BrandLogo src={BRAND_ASSETS.mark} width={30} /><span>Area rider</span></div><SignOutButton allowDemo={false} /></div>
    <RiderDeliveriesScreen api={api} loginUrl="/accesso?area=rider" />
  </>;
}
