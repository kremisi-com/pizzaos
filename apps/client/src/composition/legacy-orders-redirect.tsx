"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function LegacyOrdersRedirect() {
  const router = useRouter();
  useEffect(() => {
    const redirectOrders = () => {
      const hash = window.location.hash;
      if (hash === "#i-tuoi-ordini" || hash.startsWith("#ordine-")) router.replace(`/ordina/ordini${hash.startsWith("#ordine-") ? hash : ""}`);
    };
    redirectOrders();
    window.addEventListener("hashchange", redirectOrders); window.addEventListener("popstate", redirectOrders);
    return () => { window.removeEventListener("hashchange", redirectOrders); window.removeEventListener("popstate", redirectOrders); };
  }, [router]);
  return null;
}
