import { describe, expect, it } from "vitest";
import {
  createGoogleTagInitScript,
  googleTagId,
} from "../../app/google-tag";

describe("admin google tag", () => {
  it("uses the configured Google measurement id", () => {
    expect(googleTagId).toBe("G-CSKKSEV8MG");
  });

  it("creates the gtag bootstrap script for the configured id", () => {
    const script = createGoogleTagInitScript(googleTagId);

    expect(script).toContain("window.dataLayer = window.dataLayer || [];");
    expect(script).toContain("function gtag(){window.dataLayer.push(arguments);}");
    expect(script).toContain("gtag('js', new Date());");
    expect(script).toContain("gtag('config', 'G-CSKKSEV8MG');");
  });
});
