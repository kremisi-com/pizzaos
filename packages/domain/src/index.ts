export const APP_SURFACES = [
  "landing",
  "client",
  "admin"
] as const;

export type AppSurface = (typeof APP_SURFACES)[number];

export interface AppShellSeed
{
  readonly surface: AppSurface;
  readonly title: string;
  readonly subtitle: string;
}
