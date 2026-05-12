import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { IntegrationsManager } from "@/features/integrations/components/integrations-manager";

describe("IntegrationsManager", () => {
  it("renders only supported placeholder integrations", () => {
    const markup = renderToString(createElement(IntegrationsManager));

    expect(markup).toContain("Deliveroo");
    expect(markup).not.toContain("Glovo");
    expect(markup).not.toContain("Just Eat");
    expect(markup).not.toContain("Stripe");
    expect(markup).toContain("Integrazioni Esterne");
    expect(markup).toContain("Placeholder");
    expect(markup).toContain("Dettagli demo");
  });
});
