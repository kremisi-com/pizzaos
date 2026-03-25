import type { AppSurface } from "@pizzaos/domain";

const SURFACE_THEME_CLASS: Record<AppSurface, string> = {
  landing: "pizzaos-theme-landing",
  client: "pizzaos-theme-client",
  admin: "pizzaos-theme-admin"
};

export function getThemeClass(surface: AppSurface): string
{
  return SURFACE_THEME_CLASS[surface];
}
