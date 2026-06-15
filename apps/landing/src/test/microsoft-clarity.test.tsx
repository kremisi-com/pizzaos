import { describe, expect, it } from "vitest";
import {
  clarityProjectIdEnvName,
  createMicrosoftClarityBootstrapScript,
} from "../../app/microsoft-clarity";

describe("landing microsoft clarity", () => {
  it("uses the public Clarity project id environment variable", () => {
    expect(clarityProjectIdEnvName).toBe("NEXT_PUBLIC_CLARITY_PROJECT_ID");
  });

  it("creates the Clarity bootstrap script for the configured id", () => {
    const script = createMicrosoftClarityBootstrapScript("landing123");

    expect(script).toContain("window, document, \"clarity\", \"script\"");
    expect(script).toContain("https://www.clarity.ms/tag/");
    expect(script).toContain("\"landing123\"");
  });
});
