import { APP_SURFACES, type AppSurface } from "@pizzaos/domain";
import { describe, expect, it } from "vitest";
import {
  SURFACE_THEME_CLASS,
  SURFACE_THEME_TOKENS,
  getSurfaceThemeTokens,
  getThemeClass,
  getThemeStyleVariables
} from "./index";

function assertSurfaceThemeContract(surface: AppSurface): void
{
  const tokens = getSurfaceThemeTokens(surface);

  expect(tokens.color.background).toBeTruthy();
  expect(tokens.color.backgroundAccent).toBeTruthy();
  expect(tokens.color.foreground).toBeTruthy();
  expect(tokens.color.foregroundMuted).toBeTruthy();
  expect(tokens.color.border).toBeTruthy();
  expect(tokens.color.primary).toBeTruthy();
  expect(tokens.color.primaryForeground).toBeTruthy();

  expect(tokens.type.family).toBeTruthy();
  expect(tokens.type.headingWeight).toBeTruthy();
  expect(tokens.type.bodyWeight).toBeTruthy();

  expect(tokens.spacing.pageX).toBeTruthy();
  expect(tokens.spacing.pageY).toBeTruthy();
  expect(tokens.spacing.sectionGap).toBeTruthy();

  expect(tokens.radius.card).toBeTruthy();
  expect(tokens.radius.control).toBeTruthy();

  expect(tokens.motion.durationFast).toBeTruthy();
  expect(tokens.motion.durationSlow).toBeTruthy();
  expect(tokens.motion.easeStandard).toBeTruthy();

  expect(tokens.elevation.card).toBeTruthy();
  expect(tokens.elevation.overlay).toBeTruthy();
}

describe("@pizzaos/brand", () =>
{
  it("exports a theme class for every app surface", () =>
  {
    for (const surface of APP_SURFACES)
    {
      expect(getThemeClass(surface)).toBe(SURFACE_THEME_CLASS[surface]);
      expect(SURFACE_THEME_CLASS[surface]).toMatch(/^pizzaos-theme-/);
    }
  });

  it("exposes complete token contracts for every app surface", () =>
  {
    for (const surface of APP_SURFACES)
    {
      expect(SURFACE_THEME_TOKENS[surface]).toBeDefined();
      assertSurfaceThemeContract(surface);
    }
  });

  it("maps theme tokens to css variables for every app surface", () =>
  {
    for (const surface of APP_SURFACES)
    {
      const styleVariables = getThemeStyleVariables(surface);
      expect(styleVariables["--pizzaos-color-background"]).toBe(
        SURFACE_THEME_TOKENS[surface].color.background
      );
      expect(styleVariables["--pizzaos-font-family"]).toBe(SURFACE_THEME_TOKENS[surface].type.family);
      expect(styleVariables["--pizzaos-radius-card"]).toBe(SURFACE_THEME_TOKENS[surface].radius.card);
      expect(styleVariables["--pizzaos-elevation-card"]).toBe(SURFACE_THEME_TOKENS[surface].elevation.card);
    }
  });

  it("keeps the landing theme aligned to the real PizzaOS brand palette", () =>
  {
    expect(SURFACE_THEME_TOKENS.landing.color.primary).toBe("#0A384F");
    expect(SURFACE_THEME_TOKENS.landing.color.background).toBe("#FAF7F1");
    expect(SURFACE_THEME_TOKENS.landing.color.foreground).toBe("#0A384F");
    expect(SURFACE_THEME_TOKENS.landing.color.border).toBe("#E9DED0");
    expect(getThemeStyleVariables("landing")["--pizzaos-color-primary-rgb"]).toBe("10, 56, 79");
  });

  it("keeps the admin theme aligned to the landing dashboard preview", () =>
  {
    expect(SURFACE_THEME_TOKENS.admin.color.primary).toBe("#f43a26");
    expect(SURFACE_THEME_TOKENS.admin.color.background).toBe("#faf8f7");
    expect(SURFACE_THEME_TOKENS.admin.color.backgroundAccent).toBe("#ffffff");
    expect(SURFACE_THEME_TOKENS.admin.type).toEqual(SURFACE_THEME_TOKENS.landing.type);
    expect(getThemeStyleVariables("admin")["--pizzaos-color-primary-rgb"]).toBe("244, 58, 38");
  });
});
