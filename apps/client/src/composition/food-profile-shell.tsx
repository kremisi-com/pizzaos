"use client";

import type { IndividualSession } from "@pizzaos/domain";
import { useEffect, useMemo, useState } from "react";
import { FoodPreferenceEditor, useMenuPreferences } from "../features/menu";
import { Card } from "@pizzaos/ui";
import { createFoodPreferencesApi } from "./api/food-preferences-api";
import { createIndividualApi } from "./api/individual-api";
import styles from "./food-profile.module.css";
import { SignOutButton } from "../features/identity/components/sign-in-screen";

export function FoodProfileShell() {
  const api = useMemo(() => createIndividualApi(), []);
  const foodApi = useMemo(() => createFoodPreferencesApi(), []);
  const [session, setSession] = useState<IndividualSession | null>(null);
  const [error, setError] = useState(false);
  const preferences = useMenuPreferences(foodApi, session?.actor?.id);
  useEffect(() => {
    let alive = true;
    void api.session().then(value => { if (alive) setSession(value); })
      .catch(() => { if (alive) setError(true); });
    return () => { alive = false; };
  }, [api]);
  return <main className={styles.page}>
    <a href="/ordina#il-menu">Torna al menu</a>
    <h1>Profilo alimentare</h1>
    {error ? <p role="alert">Non è stato possibile caricare il profilo. Ricarica la pagina.</p>
      : !session ? <p role="status">Caricamento del profilo…</p>
      : !session.actor ? <a href="/accesso">Accedi per salvare le preferenze</a>
      : <Card title="Allergeni e preferenze"><FoodPreferenceEditor preferences={preferences} /></Card>}
    {session?.actor && <div className={styles.logout}><SignOutButton label="Effettua il log out" className={styles.logoutButton} /></div>}
  </main>;
}
