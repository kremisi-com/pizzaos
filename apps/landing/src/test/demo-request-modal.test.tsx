import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  DemoRequestModal,
  DemoSuccessActions,
} from "../features/home/components/demo-request-modal";
import { createDemoSuccessLinks } from "../features/home/demo-links";

describe("demo request modal", () => {
  it("uses access copy instead of booking copy", () => {
    const markup = renderToString(
      createElement(DemoRequestModal, {
        isOpen: true,
        onClose: () => undefined,
      }),
    );

    expect(markup).toContain("Accesso demo");
    expect(markup).toContain("Apri la Demo");
    expect(markup).toContain("web-app cliente");
    expect(markup).toContain("dashboard admin");
    expect(markup).not.toContain("Prenota la tua demo");
    expect(markup).not.toContain("call di 20 minuti");
  });

  it("defines success links from configured demo surfaces", () => {
    expect(
      createDemoSuccessLinks({
        clientHref: "https://client.example.test",
        adminHref: "https://admin.example.test",
      }),
    ).toEqual([
      { label: "Demo Web-App Cliente", href: "https://client.example.test" },
      { label: "Demo Dashboard Admin", href: "https://admin.example.test" },
    ]);
  });

  it("opens success links in a new browser tab", () => {
    const markup = renderToString(
      createElement(DemoSuccessActions, {
        demoLinks: createDemoSuccessLinks({
          clientHref: "https://client.example.test",
          adminHref: "https://admin.example.test",
        }),
      }),
    );

    expect(markup).toContain('target="_blank"');
    expect(markup).toContain('rel="noopener noreferrer"');
  });
});
