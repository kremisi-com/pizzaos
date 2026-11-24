"use client";

import { useEffect } from "react";
import { useAdminToast } from "./admin-toast";
import styles from "./pilot-extensions.module.css";

export function OperationalServiceError() {
  const showToast = useAdminToast();
  useEffect(() => { showToast("Non è possibile verificare l’accesso. Riprova tra poco.", "error"); }, [showToast]);
  return <main className={styles.panels}><h1>Servizio non disponibile</h1><a href="/">Riprova</a><a href="/accesso">Accedi</a></main>;
}
