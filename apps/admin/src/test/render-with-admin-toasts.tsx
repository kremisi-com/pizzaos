import type { ReactNode } from "react";
import { render as renderDom } from "@testing-library/react";
import { AdminToastProvider } from "../composition/admin-toast";

export function render(ui: ReactNode) {
  const view = renderDom(<AdminToastProvider>{ui}</AdminToastProvider>);
  return {
    ...view,
    rerender(next: ReactNode) { view.rerender(<AdminToastProvider>{next}</AdminToastProvider>); },
  };
}
