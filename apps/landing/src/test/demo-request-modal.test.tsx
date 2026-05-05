import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  DEMO_SUCCESS_LINKS,
  DemoRequestModal,
} from "../features/home/components/demo-request-modal";

describe("demo request modal", () => {
  it("uses access copy instead of booking copy", () => {
    const markup = renderToString(
      createElement(DemoRequestModal, {
        isOpen: true,
        onClose: () => undefined,
      }),
    );

    expect(markup).toContain("Accesso demo");
    expect(markup).toContain("Invia i dati");
    expect(markup).toContain("web-app cliente");
    expect(markup).toContain("dashboard admin");
    expect(markup).not.toContain("Prenota la tua demo");
    expect(markup).not.toContain("call di 20 minuti");
  });

  it("defines success links for both demo surfaces", () => {
    expect(DEMO_SUCCESS_LINKS).toEqual([
      { label: "Demo Web-App Cliente", href: "/client" },
      { label: "Demo Dashboard Admin", href: "/admin" },
    ]);
  });
});
