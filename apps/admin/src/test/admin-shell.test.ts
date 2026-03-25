import { describe, expect, it } from "vitest";
import { createAdminSeed } from "@pizzaos/mock-data";

describe("admin seed", () =>
{
  it("uses admin surface", () =>
  {
    expect(createAdminSeed().surface).toBe("admin");
  });
});
