import { describe, expect, it } from "vitest";
import {
  createGoogleTagInitScript,
  googleTagId,
} from "../../app/google-tag";

describe("client google tag", () => {
  it("uses the configured Google measurement id", () => {
    expect(googleTagId).toBe("G-VVZ3HVXHX8");
  });

  it("creates the gtag bootstrap script for the configured id", () => {
    const script = createGoogleTagInitScript(googleTagId);

    expect(script).toContain("window.dataLayer = window.dataLayer || [];");
    expect(script).toContain("function gtag(){window.dataLayer.push(arguments);}");
    expect(script).toContain("gtag('js', new Date());");
    expect(script).toContain("gtag('config', 'G-VVZ3HVXHX8');");
  });
});
