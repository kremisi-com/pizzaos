import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { IntegrationsManager } from "@/features/integrations/components/integrations-manager";

describe("IntegrationsManager", () => {
  it("renders list of integrations", () => {
    const markup = renderToString(createElement(IntegrationsManager));

    expect(markup).toContain("Deliveroo");
    expect(markup).toContain("Glovo");
    expect(markup).toContain("Stripe");
    expect(markup).toContain("Integrazioni Esterne");
    expect(markup).toContain("Gestisci");
    expect(markup).toContain("Connetti");
  });
});
