"use client";

import { BottomNavigation, BottomNavigationItem } from "@pizzaos/ui";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactElement } from "react";

const ReceiptIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1z" />
    <path d="M16 13H8v-2h8v2z" />
    <path d="M16 9H8V7h8v2z" />
  </svg>
);

const PlusIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const CartIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="9" cy="20" r="1.5" />
    <circle cx="17" cy="20" r="1.5" />
    <path d="M3 4h2l2.4 10.4a1 1 0 0 0 1 .8h8.9a1 1 0 0 0 1-.8L20 8H7" />
  </svg>
);

export function BottomNav({ live = false }: { live?: boolean }): ReactElement {
  const pathname = usePathname();
  const router = useRouter();
  const [hash, setHash] = useState("");
  const durable = live || pathname.startsWith("/ordina") || pathname === "/accesso";

  useEffect(() => {
    const syncHash = () => setHash(window.location.hash);
    syncHash();
    window.addEventListener("hashchange", syncHash);
    window.addEventListener("popstate", syncHash);
    return () => {
      window.removeEventListener("hashchange", syncHash);
      window.removeEventListener("popstate", syncHash);
    };
  }, [pathname]);

  const items: BottomNavigationItem[] = [
    {
      id: "orders",
      label: "Ordini",
      icon: <ReceiptIcon />,
      href: durable ? "/ordina#i-tuoi-ordini" : "/orders"
    },
    {
      id: "order",
      label: "Ordina",
      icon: <PlusIcon />,
      href: durable ? "/ordina" : "/",
      isProminent: true
    },
    {
      id: "cart",
      label: "Carrello",
      icon: <CartIcon />,
      href: durable ? "/ordina/carrello" : "/cart"
    }
  ];

  // Operational order history and order details share the menu pathname.
  let activeItemId = "order"; // Default to central
  if (pathname === "/orders" || pathname.startsWith("/orders/")
    || pathname === "/ordina" && (hash === "#i-tuoi-ordini" || hash.startsWith("#ordine-"))) {
    activeItemId = "orders";
  } else if (
    pathname === "/ordina/carrello" ||
    pathname === "/ordina/checkout" ||
    pathname === "/cart" ||
    pathname.startsWith("/cart/") ||
    pathname === "/checkout" ||
    pathname.startsWith("/checkout/")
  ) {
    activeItemId = "cart";
  } else if (pathname === "/") {
    activeItemId = "order";
  }

  const handleNavigate = (href: string) => {
    // Next can update same-page anchors through pushState, without hashchange.
    setHash(new URL(href, window.location.href).hash);
    router.push(href);
  };

  return (
    <BottomNavigation
      items={items}
      activeItemId={activeItemId}
      onNavigate={handleNavigate}
    />
  );
}
