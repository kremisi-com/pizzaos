import type { AppSurface } from "@pizzaos/domain";
import { BRAND_ASSETS } from "./assets";
export { BRAND_ASSETS } from "./assets";

export const BRAND_PALETTE = { sand: "#DDB785", orange: "#CF5430", navy: "#0A384F", action: "#B74424" } as const;

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
    card: "24px",
    control: "16px"
  },
  motion: {
    durationFast: "220ms",
    durationSlow: "320ms",
    easeStandard: "cubic-bezier(0.22, 1, 0.36, 1)"
  },
  elevation: {
    card: "0 10px 30px rgba(0, 0, 0, 0.06)",
    overlay: "0 25px 60px rgba(0, 0, 0, 0.12)"
  }
};

export const SURFACE_THEME_TOKENS: Record<AppSurface, SurfaceThemeTokens> = {
  landing: {
    ...BASE_THEME_TOKENS,
    elevation: {
      card: "0 18px 42px rgba(10, 56, 79, 0.08)",
      overlay: "0 28px 70px rgba(10, 56, 79, 0.14)"
    },
    color: {
      background: "#FAF7F1",
      backgroundAccent: "#FFFFFF",
      foreground: "#0A384F",
      foregroundMuted: "#5B6D73",
      border: "#E9DED0",
      primary: "#0A384F",
      primaryForeground: "#FFFFFF"
    },
    type: {
      family: "\"Google Sans\", \"Segoe UI\", sans-serif",
      headingWeight: "800",
      bodyWeight: "400"
    }
  },
  client: {
    ...BASE_THEME_TOKENS,
    color: {
      background: "#FAF7F1",
      backgroundAccent: "#FFFFFF",
      foreground: "#0A384F",
      foregroundMuted: "#526975",
      border: "#E9DED0",
      primary: "#B74424",
      primaryForeground: "#FFFFFF"
    },
    type: {
      family: "\"Poppins\", \"Segoe UI\", sans-serif",
      headingWeight: "700",
      bodyWeight: "500"
    }
  },
  admin: {
    ...BASE_THEME_TOKENS,
    radius: {
      card: "14px",
      control: "10px"
    },
    elevation: {
      card: "0 18px 46px rgba(32, 25, 20, 0.08)",
      overlay: "0 25px 60px rgba(32, 25, 20, 0.12)"
    },
    color: {
      background: "#FAF7F1",
      backgroundAccent: "#FFFFFF",
      foreground: "#0A384F",
      foregroundMuted: "#526975",
      border: "#E9DED0",
      primary: "#B74424",
      primaryForeground: "#FFFFFF"
    },
    type: {
      family: "\"Poppins\", \"Segoe UI\", sans-serif",
      headingWeight: "800",
      bodyWeight: "400"
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

function getHexColorRgb(hexColor: string): string
{
  const normalizedHexColor = hexColor.replace("#", "");
  const red = Number.parseInt(normalizedHexColor.slice(0, 2), 16);
  const green = Number.parseInt(normalizedHexColor.slice(2, 4), 16);
  const blue = Number.parseInt(normalizedHexColor.slice(4, 6), 16);

  return `${red}, ${green}, ${blue}`;
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
    "--pizzaos-color-primary-rgb": getHexColorRgb(surfaceThemeTokens.color.primary),
    "--pizzaos-color-primary-foreground": surfaceThemeTokens.color.primaryForeground,
    "--pizzaos-brand-sand": BRAND_PALETTE.sand,
    "--pizzaos-brand-orange": BRAND_PALETTE.orange,
    "--pizzaos-brand-navy": BRAND_PALETTE.navy,
    "--pizzaos-brand-pattern": `url("${BRAND_ASSETS.pattern}")`,
    "--pizzaos-color-primary-hover": surface === "landing" ? "#072B3D" : "#983719",
    "--pizzaos-color-primary-soft": "#F8E8DF",
    "--pizzaos-color-surface-muted": "#F3E9DA",
    "--pizzaos-color-focus": "#0A384F",
    "--pizzaos-color-success": "#15803D",
    "--pizzaos-color-success-soft": "#EDF7EF",
    "--pizzaos-color-success-foreground": "#166534",
    "--pizzaos-color-warning": surface === "landing" ? "#f59e0b" : "#A16207",
    "--pizzaos-color-warning-soft": "#FFF5D6",
    "--pizzaos-color-warning-foreground": "#713F12",
    "--pizzaos-color-critical": surface === "landing" ? "#dc2626" : "#B91C1C",
    "--pizzaos-color-critical-soft": "#FFF0ED",
    "--pizzaos-color-critical-foreground": "#991B1B",
    "--pizzaos-color-info": "#0A384F",
    "--pizzaos-color-info-soft": "#EAF1F4",
    "--pizzaos-color-info-foreground": "#0A384F",
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
