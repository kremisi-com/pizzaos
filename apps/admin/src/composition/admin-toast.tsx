"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import styles from "./admin-toast.module.css";

export type ToastTone = "error" | "success" | "info";
interface ToastMessage { readonly id: number; readonly message: string; readonly tone: ToastTone }
interface ToastContextValue { showToast: (message: string, tone?: ToastTone) => void }

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} });
const duration = 6000;

export function AdminToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const nextId = useRef(0);
  const visible = useRef<ToastMessage[]>([]);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number) => {
    const timer = timers.current.get(id);
    if (timer) clearTimeout(timer);
    timers.current.delete(id);
    visible.current = visible.current.filter(toast => toast.id !== id);
    setToasts(visible.current);
  }, []);

  const showToast = useCallback((message: string, tone: ToastTone = "info") => {
    const normalized = message.trim();
    if (!normalized) return;
    if (visible.current.some(toast => toast.message === normalized && toast.tone === tone)) return;
    const id = ++nextId.current;
    const toast = { id, message: normalized, tone };
    const next = [...visible.current, toast];
    const removed = next.slice(0, Math.max(0, next.length - 4));
    for (const previous of removed) {
      const timer = timers.current.get(previous.id);
      if (timer) clearTimeout(timer);
      timers.current.delete(previous.id);
    }
    visible.current = next.slice(-4);
    setToasts(visible.current);
    timers.current.set(id, setTimeout(() => dismiss(id), duration));
  }, [dismiss]);

  useEffect(() => () => {
    for (const timer of timers.current.values()) clearTimeout(timer);
    timers.current.clear();
    visible.current = [];
  }, []);

  return <ToastContext.Provider value={{ showToast }}>
    {children}
    <aside className={styles.stack} aria-label="Notifiche">
      {toasts.map(toast => <div key={toast.id} className={`${styles.toast} ${styles[toast.tone]}`}
        role={toast.tone === "error" ? "alert" : "status"}
        aria-live={toast.tone === "error" ? "assertive" : "polite"}>
        <span>{toast.message}</span>
        <button type="button" className={styles.dismiss} aria-label="Chiudi notifica" onClick={() => dismiss(toast.id)}>×</button>
      </div>)}
    </aside>
  </ToastContext.Provider>;
}

export function useAdminToast() {
  return useContext(ToastContext).showToast;
}
