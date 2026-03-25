import { describe, expect, it } from "vitest";
import { APP_SURFACES } from "@pizzaos/domain";
import { getThemeClass } from "@pizzaos/brand";
import {
  createAdminSeed,
  createClientSeed,
  createLandingSeed
} from "@pizzaos/mock-data";

describe("workspace package resolution", () =>
{
  it("resolves shared package exports", () =>
  {
    expect(APP_SURFACES).toEqual(["landing", "client", "admin"]);
    expect(getThemeClass("landing")).toBe("pizzaos-theme-landing");
    expect(createLandingSeed().surface).toBe("landing");
    expect(createClientSeed().surface).toBe("client");
    expect(createAdminSeed().surface).toBe("admin");
  });
});
