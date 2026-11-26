"use client";

import type { IndividualProduct, MenuSelection } from "@pizzaos/domain";
import { useState } from "react";

/** Keeps catalog corrections local to the editor until its owner confirms the line. */
export function useSelectionRecovery(product: IndividualProduct, initial: () => MenuSelection[]) {
  const [draft, setDraft] = useState(() => ({ selections: initial().map(choice => ({ ...choice })), removed: [] as string[] }));
  const options = new Map(product.options.map(option => [option.id, option]));
  const offered = product.groups ? new Set(product.groups.flatMap(group => group.optionIds)) : null;
  const obsolete = draft.selections.filter(choice => !options.has(choice.optionId)
    || options.get(choice.optionId)?.available === false || offered !== null && !offered.has(choice.optionId));
  const obsoleteIds = new Set(obsolete.map(choice => choice.optionId));
  const selections = draft.selections.filter(choice => !obsoleteIds.has(choice.optionId));
  const removed = [...new Set([...draft.removed, ...obsolete.map(choice => options.get(choice.optionId)?.name ?? "Scelta non più disponibile")])];

  // Adjust only this hook's draft when catalog props invalidate selections. No owner callback runs here.
  if (obsolete.length > 0) setDraft({ selections, removed });

  function setSelections(update: (current: MenuSelection[]) => MenuSelection[]) {
    setDraft(current => ({ ...current, selections: update(current.selections) }));
  }
  return { selections, setSelections, recovered: removed.length > 0,
    recoveryMessage: removed.length > 0
      ? `Alcune opzioni non sono più disponibili e sono state rimosse: ${removed.join(", ")}. Controlla il prezzo e conferma la modifica.` : "" };
}
