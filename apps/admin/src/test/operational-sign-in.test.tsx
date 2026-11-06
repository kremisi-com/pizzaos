import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SignInScreen, SignOutButton } from "../features/identity/components/sign-in-screen";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

function authFetch() {
  const calls: { path: string; method: string }[] = [];
  const fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const path = new URL(url, "https://rider.pizzaos.app").pathname;
    calls.push({ path, method: init?.method ?? "GET" });
    return new Response(JSON.stringify(path.endsWith("/demo")
      ? { enabled: true, active: false, csrfToken: "demo-csrf" }
      : { csrfToken: "auth-csrf" }), { headers: { "content-type": "application/json" } });
  });
  vi.stubGlobal("fetch", fetch);
  return calls;
}

describe("operational login public presentation", () => {
  it("defaults to restaurant login", () => {
    render(<SignInScreen returnTo="/operazioni" />);
    expect(screen.getByRole("heading", { name: "Accesso ristorante" })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Accesso rider" })).toBeNull();
  });

  it("provides rider-specific Italian login without restaurant navigation", () => {
    render(<SignInScreen returnTo="/rider" area="rider" />);
    expect(screen.getByRole("heading", { name: "Accesso rider" })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Accesso ristorante" })).toBeNull();
    expect(screen.getByRole("button", { name: /google/i })).toBeTruthy();
    expect(screen.getByRole("textbox", { name: /email/i })).toBeTruthy();
    expect(screen.queryAllByRole("link").some(link => link.getAttribute("href")?.startsWith("/operazioni"))).toBe(false);
  });

  it("never discovers or offers demo access to riders, including the demo email", async () => {
    const calls = authFetch();
    await act(async () => { render(<SignInScreen returnTo="/rider" area="rider" />); });
    fireEvent.change(screen.getByRole("textbox", { name: /email/i }), { target: { value: "poc@pizzaos.app" } });
    await act(async () => { await Promise.resolve(); });
    expect(calls.some(call => call.path.startsWith("/api/pilot/auth/demo"))).toBe(false);
    expect(screen.queryByLabelText(/password/i)).toBeNull();
    expect(screen.queryByRole("button", { name: /demo/i })).toBeNull();
    expect(screen.queryByText(/demo/i)).toBeNull();
    expect(screen.getByRole("button", { name: /google/i })).toBeTruthy();
  });

  it("keeps the existing demo login on the default admin area", async () => {
    const calls = authFetch();
    render(<SignInScreen returnTo="/operazioni" />);
    await waitFor(() => expect(calls).toContainEqual({ path: "/api/pilot/auth/demo", method: "GET" }));
    fireEvent.change(screen.getByRole("textbox", { name: /email/i }), { target: { value: "poc@pizzaos.app" } });
    expect(await screen.findByLabelText(/password/i)).toBeTruthy();
  });

  it("logs out with normal Auth.js CSRF directly when demo access is disabled", async () => {
    const calls = authFetch();
    const submit = vi.spyOn(HTMLFormElement.prototype, "submit").mockImplementation(() => undefined);
    render(<SignOutButton allowDemo={false} />);
    fireEvent.click(screen.getByRole("button"));
    await waitFor(() => expect(calls).toContainEqual({ path: "/api/pilot/auth/csrf", method: "GET" }));
    expect(calls.some(call => call.path.startsWith("/api/pilot/auth/demo"))).toBe(false);
    await waitFor(() => expect(submit).toHaveBeenCalledOnce());
    const form: unknown = submit.mock.contexts[0];
    if (!(form instanceof HTMLFormElement)) throw new Error("Il logout deve inviare un form Auth.js");
    expect(form.getAttribute("action")).toBe("/api/pilot/auth/signout");
    expect(form.method.toLowerCase()).toBe("post");
    expect(new FormData(form).get("csrfToken")).toBe("auth-csrf");
  });
});
