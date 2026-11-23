import { createHmac } from "node:crypto";
import { createDemoSuccessLinks } from "./demo-links";

export interface DemoHandoff {
  readonly action: string;
  readonly pass: string;
}

export interface DemoAccess {
  readonly client: DemoHandoff;
  readonly admin: DemoHandoff;
}

/** Called by the landing server after the existing lead submission succeeds. */
export function createDemoAccess(env: NodeJS.ProcessEnv = process.env): DemoAccess | undefined {
  const secret = env["PIZZAOS_DEMO_HANDOFF_SECRET"]?.trim();
  if (!secret || secret.length < 32) return undefined;
  const links = createDemoSuccessLinks({ clientHref: env["LINK_CLIENT"], adminHref: env["LINK_ADMIN"] });
  const expires = Date.now() + 10 * 60 * 1000;
  const grant = (href: string): DemoHandoff => {
    const { origin } = new URL(href);
    const claim = Buffer.from(JSON.stringify({ purpose: "landing-demo", origin, expires })).toString("base64url");
    const signature = createHmac("sha256", secret).update(claim).digest("base64url");
    return { action: new URL("/api/pilot/auth/demo/handoff", origin).href, pass: `${claim}.${signature}` };
  };
  return { client: grant(links[0].href), admin: grant(links[1].href) };
}
