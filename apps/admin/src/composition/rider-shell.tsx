"use client";

import { useMemo } from "react";
import { RiderDeliveriesScreen } from "../features/rider-deliveries";
import { SignOutButton } from "../features/identity/components/sign-in-screen";
import { createRiderDeliveryApi } from "./api/rider-delivery-api";
import styles from "./pilot-extensions.module.css";

export function RiderShell() {
  const api = useMemo(() => createRiderDeliveryApi(), []);
  return <><div className={styles.riderAccount}><span>PizzaOS · Area rider</span><SignOutButton allowDemo={false} /></div>
    <RiderDeliveriesScreen api={api} loginUrl="/accesso?area=rider" />
  </>;
}
