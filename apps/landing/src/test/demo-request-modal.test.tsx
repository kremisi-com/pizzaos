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
    expect(markup).toContain('name="policyConsent"');
    expect(markup).toContain("Accetto la");
    expect(markup).toContain("Privacy Policy");
    expect(markup).toContain("Cookie Policy");
    expect(markup).toContain(
      "https://www.iubenda.com/privacy-policy/45209498",
    );
    expect(markup).toContain(
      "https://www.iubenda.com/privacy-policy/45209498/cookie-policy",
    );
    expect(markup).not.toContain("Prenota la tua demo");
    expect(markup).not.toContain("call di 20 minuti");
  });

  it("includes free trial context when opened from the trial CTA", () => {
    const markup = renderToString(
      createElement(DemoRequestModal, {
        isOpen: true,
        onClose: () => undefined,
        requestIntent: "free-trial",
      }),
    );

    expect(markup).toContain("message");
    expect(markup).toContain("Inizia la prova gratuita");
  });

  it("defines success links from configured demo surfaces", () => {
    expect(
      createDemoSuccessLinks({
        clientHref: "https://client.example.test",
        adminHref: "https://admin.example.test",
      }),
    ).toEqual([
      { label: "Demo Web-App Cliente", href: "https://client.example.test/poc" },
      { label: "Demo Dashboard Admin", href: "https://admin.example.test/poc" },
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

  it("posts each demo pass to its own origin without putting it in a hyperlink", () => {
    const markup = renderToString(
      createElement(DemoSuccessActions, {
        demoLinks: createDemoSuccessLinks(),
        demoAccess: {
          client: { action: "https://client.pizzaos.app/api/pilot/auth/demo/handoff", pass: "client-pass" },
          admin: { action: "https://admin.pizzaos.app/api/pilot/auth/demo/handoff", pass: "admin-pass" },
        },
      }),
    );
    expect(markup.match(/method="post"/g)).toHaveLength(2);
    expect(markup).toContain('action="https://client.pizzaos.app/api/pilot/auth/demo/handoff"');
    expect(markup).toContain('action="https://admin.pizzaos.app/api/pilot/auth/demo/handoff"');
    expect(markup).not.toContain("?pass=");
  });
});
