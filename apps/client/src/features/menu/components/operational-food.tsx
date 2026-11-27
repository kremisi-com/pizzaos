"use client";

import { MENU_ALLERGENS, menuAllergenKey } from "@pizzaos/domain";
import type { FoodPreferencesApi, MenuComposition } from "@pizzaos/domain";
import { useEffect, useState } from "react";
import styles from "./operational-menu.module.css";

const noPreferences: string[] = [];

export function useMenuPreferences(api: FoodPreferencesApi | undefined, actorId: string | undefined) {
  const [guest, setGuest] = useState<string[]>([]);
  const [saved, setSaved] = useState<{ actorId: string; avoid: string[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [loadAttempt, setLoadAttempt] = useState(0);
  const authenticated = Boolean(actorId && api);
  useEffect(() => {
    let active = true;
    if (api && actorId) {
      setMessage("");
      void api.get().then(value => { if (active) setSaved({ actorId, avoid: value.avoid }); })
        .catch(() => { if (active) setMessage("Non è stato possibile caricare le preferenze alimentari."); });
    }
    return () => { active = false; };
  }, [api, actorId, loadAttempt]);

  const avoid = authenticated ? saved && saved.actorId === actorId ? saved.avoid : noPreferences : guest;
  const save = async (next: string[]) => {
    if (!actorId || !api) { setGuest(next); return true; }
    setBusy(true);
    setMessage("");
    try {
      const value = await api.save({ avoid: next });
      setSaved({ actorId, avoid: value.avoid });
      setMessage("Preferenze salvate.");
      return true;
    } catch {
      setMessage("Non è stato possibile salvare le preferenze. Riprova.");
      return false;
    } finally { setBusy(false); }
  };

  return { avoid, save, busy, message, authenticated, retry: () => setLoadAttempt(attempt => attempt + 1),
    available: !authenticated || saved?.actorId === actorId };
}

export type MenuPreferences = ReturnType<typeof useMenuPreferences>;
type FoodSummary = Pick<MenuComposition, "contains" | "mayContain" | "foodComplete">;

export function foodMatches(values: string[], avoid: string[]): string[] {
  const keys = new Set(avoid.map(menuAllergenKey));
  return values.filter(value => keys.has(menuAllergenKey(value)));
}

export function MenuFoodSummary({ food, avoid, showUnknown = true, announce = false }: {
  food: FoodSummary; avoid: string[]; showUnknown?: boolean; announce?: boolean;
}) {
  const relevant = foodMatches([...food.contains, ...food.mayContain], avoid);
  return <div className={styles.food} aria-live={announce ? "polite" : undefined}>
    {food.contains.length > 0 && <p>Contiene: {food.contains.join(", ")}</p>}
    {food.mayContain.length > 0 && <p>Può contenere: {food.mayContain.join(", ")}</p>}
    {!food.foodComplete && showUnknown && <p>Informazione da verificare</p>}
    {relevant.length > 0 && <p className={styles.warning}>Da verificare per le tue preferenze: {[...new Set(relevant)].join(", ")}.</p>}
  </div>;
}

export function FoodPreferenceEditor({ preferences }: { preferences: MenuPreferences }) {
  const [editing, setEditing] = useState<string[] | null>(null);
  const picked = editing ?? preferences.avoid;
  return <div className={styles.foodEditor}>
    <p>{preferences.authenticated ? "Salva gli allergeni che vuoi evitare per ricevere avvisi nei tuoi ordini." : "Scegli gli allergeni che vuoi evitare durante questa consultazione."}</p>
    <fieldset disabled={preferences.busy || preferences.authenticated && !preferences.available}>
      <legend>Allergeni da evitare</legend>
      <div className={styles.foodChoices}>{MENU_ALLERGENS.map(allergen => {
        const selected = foodMatches([allergen], picked).length > 0;
        return <label key={allergen}>
          <input type="checkbox" checked={selected} onChange={() => {
            const next = selected ? picked.filter(value => menuAllergenKey(value) !== menuAllergenKey(allergen)) : [...picked, allergen];
            if (preferences.authenticated) setEditing(next);
            else void preferences.save(next);
          }} />{allergen}
        </label>;
      })}</div>
      {preferences.authenticated && <div className={styles.foodActions}>
        <button type="button" disabled={editing === null} onClick={async () => { if (await preferences.save(picked)) setEditing(null); }}>Salva preferenze</button>
        <button type="button" disabled={!picked.length} onClick={async () => { if (await preferences.save([])) setEditing(null); }}>Cancella preferenze</button>
      </div>}
    </fieldset>
    {preferences.message && <p role="status">{preferences.message}</p>}
    {preferences.authenticated && !preferences.available && preferences.message &&
      <button type="button" onClick={preferences.retry}>Ricarica preferenze</button>}
  </div>;
}

export function MenuFoodControls({ preferences, filtering, onFilter }: {
  preferences: MenuPreferences; filtering: boolean; onFilter: (value: boolean) => void;
}) {
  return <details className={styles.foodControls}>
    <summary>Allergeni e preferenze alimentari{preferences.avoid.length ? ` (${preferences.avoid.length})` : ""}</summary>
    <FoodPreferenceEditor preferences={preferences} />
    {preferences.avoid.length > 0 && <label className={styles.filterToggle}>
      <input type="checkbox" checked={filtering} onChange={event => onFilter(event.target.checked)} />Filtra il menu in base alle preferenze
    </label>}
    {filtering && preferences.avoid.length > 0 && <p>Il filtro mostra ancora le voci configurabili. Verifica i dati mancanti prima di scegliere.</p>}
  </details>;
}
