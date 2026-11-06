import { expect, type APIRequestContext } from "@playwright/test";

/** Authenticate against the real demo boundary, preserving its host-only cookies. */
export async function loginDemo(request: APIRequestContext, origin: string): Promise<void> {
  const response = await request.get(`${origin}/api/pilot/auth/demo`);
  expect(response.ok()).toBe(true);
  const access = await response.json() as { csrfToken: string };
  const login = await request.post(`${origin}/api/pilot/auth/demo`, {
    headers: { origin }, form: { email: "poc@pizzaos.app", password: "session-demo-browser-password", csrfToken: access.csrfToken }, maxRedirects: 0
  });
  expect(login.status()).toBe(303);
}
