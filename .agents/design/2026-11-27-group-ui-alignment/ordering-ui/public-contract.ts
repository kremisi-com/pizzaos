import type { ReactNode } from "react";

/** Present a product without owning persistence or deciding the caller's permissions. */
export declare function CartProductRow(props: {
  name: string;
  title?: ReactNode;
  quantity: number;
  amount: number | null;
  disabled?: boolean;
  ariaSuffix?: string;
  details?: ReactNode;
  children?: ReactNode;
  onQuantity?: (quantity: number) => void;
  onRemove?: () => void;
}): ReactNode;

/** Keep the supplied action visible above navigation and reserve space for final content. */
export declare function OrderActionDock(props: {
  label: string;
  amount: number | null;
  message?: ReactNode;
  children: ReactNode;
  testId?: string;
  breakdown?: ReactNode;
}): ReactNode;

/** Present exclusive visible choices; changing one emits exactly its public value. */
export declare function CheckoutChoices<Value extends string>(props: {
  label: string;
  value: Value;
  options: readonly { value: Value; label: string; disabled?: boolean }[];
  disabled: boolean;
  onChange: (value: Value) => void;
}): ReactNode;
