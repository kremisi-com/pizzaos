import { describe, expect, it } from "vitest";
import {
  IUBENDA_EMBED_CLASS,
  IUBENDA_SCRIPT_SRC,
  IUBENDA_WIDGET_SCRIPT_SRC,
  POLICY_LINKS,
} from "../features/home/policy-links";

describe("landing policy links", () => {
  it("keeps the configured Iubenda scripts and policy links", () => {
    expect(IUBENDA_WIDGET_SCRIPT_SRC).toBe(
      "https://embeds.iubenda.com/widgets/213f979d-e1dc-40f3-91d3-c6cbe6d5b2f3.js",
    );
    expect(IUBENDA_SCRIPT_SRC).toBe("https://cdn.iubenda.com/iubenda.js");
    expect(IUBENDA_EMBED_CLASS).toBe(
      "iubenda-white iubenda-noiframe iubenda-embed",
    );
    expect(POLICY_LINKS.privacy.href).toBe(
      "https://www.iubenda.com/privacy-policy/45209498",
    );
    expect(POLICY_LINKS.cookie.href).toBe(
      "https://www.iubenda.com/privacy-policy/45209498/cookie-policy",
    );
  });
});
