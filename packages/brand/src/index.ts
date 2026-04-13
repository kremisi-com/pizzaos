import type { AppSurface } from "@pizzaos/domain";

export const SURFACE_THEME_CLASS: Record<AppSurface, string> = {
  landing: "pizzaos-theme-landing",
  client: "pizzaos-theme-client",
  admin: "pizzaos-theme-admin"
};

export interface ColorTokens
{
  readonly background: string;
  readonly backgroundAccent: string;
  readonly foreground: string;
  readonly foregroundMuted: string;
  readonly border: string;
  readonly primary: string;
  readonly primaryForeground: string;
}

export interface TypographyTokens
{
  readonly family: string;
  readonly headingWeight: string;
  readonly bodyWeight: string;
}

export interface SpacingTokens
{
  readonly pageX: string;
  readonly pageY: string;
  readonly sectionGap: string;
}

export interface RadiusTokens
{
  readonly card: string;
  readonly control: string;
}

export interface MotionTokens
{
  readonly durationFast: string;
  readonly durationSlow: string;
  readonly easeStandard: string;
}

export interface ElevationTokens
{
  readonly card: string;
  readonly overlay: string;
}

export interface SurfaceThemeTokens
{
  readonly color: ColorTokens;
  readonly type: TypographyTokens;
  readonly spacing: SpacingTokens;
  readonly radius: RadiusTokens;
  readonly motion: MotionTokens;
  readonly elevation: ElevationTokens;
}

const BASE_THEME_TOKENS: Omit<SurfaceThemeTokens, "color" | "type"> = {
  spacing: {
    pageX: "24px",
    pageY: "40px",
    sectionGap: "24px"
  },
  radius: {
    card: "16px",
    control: "10px"
  },
  motion: {
    durationFast: "140ms",
    durationSlow: "320ms",
    easeStandard: "cubic-bezier(0.2, 0, 0, 1)"
  },
  elevation: {
    card: "0 12px 28px -16px rgba(15, 23, 36, 0.32)",
    overlay: "0 20px 60px -24px rgba(15, 23, 36, 0.42)"
  }
};

export const SURFACE_THEME_TOKENS: Record<AppSurface, SurfaceThemeTokens> = {
  landing: {
    ...BASE_THEME_TOKENS,
    color: {
      background: "#fff6ea",
      backgroundAccent: "#f7f8ff",
      foreground: "#1f1f1f",
      foregroundMuted: "#454f5b",
      border: "rgba(31, 31, 31, 0.18)",
      primary: "#b5431f",
      primaryForeground: "#fff7ef"
    },
    type: {
      family: "\"Avenir Next\", \"Segoe UI\", sans-serif",
      headingWeight: "650",
      bodyWeight: "450"
    }
  },
  client: {
    ...BASE_THEME_TOKENS,
    color: {
      background: "#ffffff",
      backgroundAccent: "#ffffff",
      foreground: "#1f2530",
      foregroundMuted: "#4f5a6a",
      border: "rgba(31, 37, 48, 0.18)",
      primary: "#d1492e",
      primaryForeground: "#fff8f3"
    },
    type: {
      family: "\"Nunito Sans\", \"Segoe UI\", sans-serif",
      headingWeight: "700",
      bodyWeight: "500"
    }
  },
  admin: {
    ...BASE_THEME_TOKENS,
    color: {
      background: "#f5f8ff",
      backgroundAccent: "#eef1f4",
      foreground: "#0f1724",
      foregroundMuted: "#415062",
      border: "rgba(15, 23, 36, 0.2)",
      primary: "#1a5fff",
      primaryForeground: "#eef4ff"
    },
    type: {
      family: "\"IBM Plex Sans\", \"Segoe UI\", sans-serif",
      headingWeight: "650",
      bodyWeight: "450"
    }
  }
};

export type SurfaceThemeStyleVariables = Record<`--pizzaos-${string}`, string>;

export function getSurfaceThemeTokens(surface: AppSurface): SurfaceThemeTokens
{
  return SURFACE_THEME_TOKENS[surface];
}

export function getThemeClass(surface: AppSurface): string
{
  return SURFACE_THEME_CLASS[surface];
}

export function getThemeStyleVariables(surface: AppSurface): SurfaceThemeStyleVariables
{
  const surfaceThemeTokens = getSurfaceThemeTokens(surface);

  return {
    "--pizzaos-color-background": surfaceThemeTokens.color.background,
    "--pizzaos-color-background-accent": surfaceThemeTokens.color.backgroundAccent,
    "--pizzaos-color-foreground": surfaceThemeTokens.color.foreground,
    "--pizzaos-color-foreground-muted": surfaceThemeTokens.color.foregroundMuted,
    "--pizzaos-color-border": surfaceThemeTokens.color.border,
    "--pizzaos-color-primary": surfaceThemeTokens.color.primary,
    "--pizzaos-color-primary-foreground": surfaceThemeTokens.color.primaryForeground,
    "--pizzaos-font-family": surfaceThemeTokens.type.family,
    "--pizzaos-font-weight-heading": surfaceThemeTokens.type.headingWeight,
    "--pizzaos-font-weight-body": surfaceThemeTokens.type.bodyWeight,
    "--pizzaos-spacing-page-x": surfaceThemeTokens.spacing.pageX,
    "--pizzaos-spacing-page-y": surfaceThemeTokens.spacing.pageY,
    "--pizzaos-spacing-section-gap": surfaceThemeTokens.spacing.sectionGap,
    "--pizzaos-radius-card": surfaceThemeTokens.radius.card,
    "--pizzaos-radius-control": surfaceThemeTokens.radius.control,
    "--pizzaos-motion-duration-fast": surfaceThemeTokens.motion.durationFast,
    "--pizzaos-motion-duration-slow": surfaceThemeTokens.motion.durationSlow,
    "--pizzaos-motion-ease-standard": surfaceThemeTokens.motion.easeStandard,
    "--pizzaos-elevation-card": surfaceThemeTokens.elevation.card,
    "--pizzaos-elevation-overlay": surfaceThemeTokens.elevation.overlay
  };
}
