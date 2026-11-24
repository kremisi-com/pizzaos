"use client";

import { useCallback, useSyncExternalStore } from "react";
import { adminHref, getAdminTab, type AdminTab } from "./admin-navigation";

function subscribe(listener: () => void) {
  window.addEventListener("popstate", listener);
  return () => window.removeEventListener("popstate", listener);
}
function currentTab(): AdminTab {
  return getAdminTab(window.location.pathname.split("/").filter(Boolean).at(-1) ?? "") ?? "dashboard";
}
function serverTab(): AdminTab { return "dashboard"; }

export function useAdminNavigation(demo = false) {
  const tab = useSyncExternalStore(subscribe, currentTab, serverTab);
  const navigate = useCallback((next: AdminTab) => {
    const href = adminHref(next, demo);
    if (window.location.pathname === href) return;
    window.history.pushState(null, "", href);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }, [demo]);
  return [tab, navigate] as const;
}
