import type { AppShellSeed } from "@pizzaos/domain";

function createSeed(surface: AppShellSeed["surface"], title: string, subtitle: string): AppShellSeed
{
  return {
    surface,
    title,
    subtitle
  };
}

export function createLandingSeed(): AppShellSeed
{
  return createSeed("landing", "PizzaOS Landing", "Esperienza editoriale premium in italiano.");
}

export function createClientSeed(): AppShellSeed
{
  return createSeed("client", "PizzaOS Client", "Ordinazione mobile-first, rapida e chiara.");
}

export function createAdminSeed(): AppShellSeed
{
  return createSeed("admin", "PizzaOS Admin", "Dashboard operativa desktop-first.");
}
