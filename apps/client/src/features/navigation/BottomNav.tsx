"use client";

import { BottomNavigation, BottomNavigationItem } from "@pizzaos/ui";
import { usePathname, useRouter } from "next/navigation";
import type { ReactElement } from "react";

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

const UserIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

export function BottomNav(): ReactElement {
  const pathname = usePathname();
  const router = useRouter();

  const items: BottomNavigationItem[] = [
    {
      id: "orders",
      label: "Ordini",
      icon: <ReceiptIcon />,
      href: "/orders"
    },
    {
      id: "order",
      label: "Ordina",
      icon: <PlusIcon />,
      href: "/",
      isProminent: true
    },
    {
      id: "profile",
      label: "Profilo",
      icon: <UserIcon />,
      href: "/profile"
    }
  ];

  // Determine active item id based on pathname
  let activeItemId = "order"; // Default to central
  if (pathname === "/orders" || pathname.startsWith("/orders/")) {
    activeItemId = "orders";
  } else if (pathname === "/profile" || pathname.startsWith("/profile/")) {
    activeItemId = "profile";
  } else if (pathname === "/") {
    activeItemId = "order";
  }

  const handleNavigate = (href: string) => {
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
