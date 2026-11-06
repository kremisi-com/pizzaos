import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SignInScreen } from "../features/identity/components/sign-in-screen";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); window.history.replaceState({}, "", "/"); });

describe("operational magic-link confirmation", () => {
  for (const query of ["?verifica=1", "?provider=nodemailer&type=email", "?verifica=1?provider=nodemailer&type=email"]) {
    it(`shows the sent-email notice for ${query}`, async () => {
      window.history.replaceState({}, "", `/accesso${query}`);
      vi.stubGlobal("fetch", vi.fn(async () => Response.json({ csrfToken: "local-test-csrf", enabled: false })));
      render(<SignInScreen returnTo="/operazioni" />);
      expect(await screen.findByRole("heading", { name: "Controlla la tua email" })).toBeTruthy();
      expect(screen.queryByRole("button", { name: "Inviami un link di accesso" })).toBeNull();
    });
  }
});
