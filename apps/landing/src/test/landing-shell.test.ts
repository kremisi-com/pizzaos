import { describe, expect, it } from "vitest";
import { createLandingSeed } from "@pizzaos/mock-data";

describe("landing seed", () =>
{
  it("uses landing surface", () =>
  {
    expect(createLandingSeed().surface).toBe("landing");
  });
});
