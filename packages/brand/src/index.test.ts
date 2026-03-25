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
});
