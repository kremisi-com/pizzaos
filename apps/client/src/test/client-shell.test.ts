import { describe, expect, it } from "vitest";
import { createClientSeed } from "@pizzaos/mock-data";

describe("client seed", () =>
{
  it("uses client surface", () =>
  {
    expect(createClientSeed().surface).toBe("client");
  });
});
