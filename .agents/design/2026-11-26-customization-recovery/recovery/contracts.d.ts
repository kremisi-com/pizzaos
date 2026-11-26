import type { IndividualCart, IndividualLine, IndividualProduct, IndividualStore, MenuSelection } from "@pizzaos/domain";
import type { ReactElement } from "react";

/** Proposta locale, senza opzioni obsolete, con avviso persistente fino a chiusura. Non salva. */
export declare function useSelectionRecovery(product: IndividualProduct, initial: () => MenuSelection[]): {
  selections: MenuSelection[];
  setSelections: (update: (current: MenuSelection[]) => MenuSelection[]) => void;
  recovered: boolean;
  recoveryMessage: string;
};

/** Proposta locale; onSave soltanto dopo conferma valida, nessuna mutazione dell'input. */
export declare function MenuLineEditor(props: {
  store: IndividualStore; product: IndividualProduct; line?: IndividualLine;
  disabled?: boolean; quantity?: number; avoid: string[]; onSave: (next: IndividualLine) => void;
}): ReactElement;

/** Recupera scelte obsolete con avviso e conferma, richiede alternative obbligatorie esplicite. */
export declare function LivePizzaEditor(props: {
  store: IndividualStore; product: IndividualProduct; line?: IndividualLine; quantity?: number;
  disabled: boolean; avoid: string[]; onClose: () => void; onSave: (line: IndividualLine) => void;
  onPairing?: (line: IndividualLine) => void;
  initialSelections?: MenuSelection[];
}): ReactElement | null;

/** Consente di correggere anche righe con tutte le opzioni eliminate. */
export declare function IndividualCartScreen(props: {
  cart: IndividualCart; store: IndividualStore | null; avoid: string[]; disabled: boolean;
  onChange: (cart: IndividualCart) => void;
}): ReactElement;
