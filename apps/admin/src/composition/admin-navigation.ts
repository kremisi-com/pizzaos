export const ADMIN_PATHS = {
  dashboard: "dashboard", orders: "ordini", catalog: "menu", inventory: "magazzino",
  marketing: "marketing", analytics: "analytics", delivery: "consegne",
  integrations: "integrazioni", profile: "profilo"
} as const;

export type AdminTab = keyof typeof ADMIN_PATHS;

export function getAdminTab(section: string): AdminTab | undefined {
  return (Object.keys(ADMIN_PATHS) as AdminTab[]).find(tab => ADMIN_PATHS[tab] === section);
}

export function adminHref(tab: AdminTab, demo = false): string {
  return `${demo ? "/poc" : "/operazioni"}/${ADMIN_PATHS[tab]}`;
}
