const STORAGE_KEY = "pizzaos:admin:active-store:v1";

export function readActiveStore(): string {
  try { return window.localStorage.getItem(STORAGE_KEY) ?? ""; }
  catch { return ""; }
}

export function rememberActiveStore(storeId: string): void {
  try {
    if (storeId) window.localStorage.setItem(STORAGE_KEY, storeId);
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch { /* Store selection remains usable when browser storage is unavailable. */ }
}

export function resolveActiveStore(available: readonly { id: string }[], previous: string): string {
  const preferred = previous || readActiveStore();
  return available.some(store => store.id === preferred) ? preferred : available[0]?.id ?? "";
}
