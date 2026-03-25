import { createElement } from "react";
import { describe, expect, it } from "vitest";
import {
  createDeterministicClock,
  createInMemoryStorage,
  renderForTest,
  resetStorage,
  resetStorageKeys,
  withFrozenDateNow
} from "./index";

describe("@pizzaos/testing", () =>
{
  it("creates an in-memory storage adapter with snapshot support", () =>
  {
    const storage = createInMemoryStorage({ initial: "1" });

    storage.setItem("another", "2");

    expect(storage.getItem("initial")).toBe("1");
    expect(storage.snapshot()).toEqual({ another: "2", initial: "1" });
  });

  it("resets full storage and selected storage keys", () =>
  {
    const storage = createInMemoryStorage({ a: "1", b: "2", c: "3" });

    resetStorageKeys(storage, ["a", "c"]);

    expect(storage.snapshot()).toEqual({ b: "2" });

    resetStorage(storage);

    expect(storage.snapshot()).toEqual({});
  });

  it("renders react elements as static markup", () =>
  {
    const markup = renderForTest(createElement("section", { "aria-label": "box" }, "Contenuto"));

    expect(markup).toContain("<section");
    expect(markup).toContain("Contenuto");
  });

  it("freezes Date.now for a callback and restores the original value", () =>
  {
    const originalNowValue = Date.now();

    const frozenNowValue = withFrozenDateNow("2026-03-25T12:00:00.000Z", () => Date.now());

    expect(new Date(frozenNowValue).toISOString()).toBe("2026-03-25T12:00:00.000Z");
    expect(Math.abs(Date.now() - originalNowValue)).toBeLessThan(2000);
  });

  it("creates deterministic clocks with reset capability", () =>
  {
    const clock = createDeterministicClock("2026-03-25T08:00:00.000Z", 300000);

    expect(clock.peekIso()).toBe("2026-03-25T08:00:00.000Z");
    expect(clock.nextIso()).toBe("2026-03-25T08:00:00.000Z");
    expect(clock.nextIso()).toBe("2026-03-25T08:05:00.000Z");

    clock.reset();

    expect(clock.peekIso()).toBe("2026-03-25T08:00:00.000Z");
  });
});
