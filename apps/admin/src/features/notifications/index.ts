"use client";

import { createContext, useContext } from "react";

export type ToastTone = "error" | "success" | "info";
export interface AdminToastContextValue { showToast: (message: string, tone?: ToastTone) => void }

/** Shared UI notification boundary. The application composition supplies the provider. */
export const AdminToastContext = createContext<AdminToastContextValue>({ showToast: () => {} });

export function useAdminToast() {
  return useContext(AdminToastContext).showToast;
}
