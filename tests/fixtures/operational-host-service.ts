/** Host-routing acceptance fixture; never imported by production. No real credentials or email. */
import { createServer } from "node:http";

const origins = new Set(["http://admin.localhost:3202", "http://rider.localhost:3202"]);
const server = createServer((request, response) => {
  response.setHeader("content-type", "application/json");
  response.setHeader("cache-control", "no-store");
  if (request.url === "/health") { response.end('{}'); return; }
  const origin = String(request.headers["x-pizzaos-origin"]);
  if (!origins.has(origin) || request.headers["x-pizzaos-proxy-secret"] !== "operational-domains-test-proxy-secret") {
    response.writeHead(403); response.end('{}'); return;
  }
  const role = request.headers.cookie?.match(/(?:^|;\s*)host-test-role=([^;]+)/)?.[1];
  const actor = role ? { id: role, email: `${role}@example.test`, name: role } : null;
  const path = request.url?.split("?")[0];
  const json = (value: unknown) => response.end(JSON.stringify(value));
  if (path === "/v1/pilot/session") { json({ actor, superadmin: role === "superadmin", storeIds: role === "operator" ? ["roma"] : [] }); return; }
  if (path === "/v1/pilot/rider/session") { json({ actor, storeIds: role === "rider" ? ["roma"] : [] }); return; }
  if (path === "/api/pilot/auth/csrf") { json({ csrfToken: "test-csrf" }); return; }
  if (path === "/api/pilot/auth/demo") { json({ enabled: false, active: false }); return; }
  if (path === "/api/pilot/auth/mode") { json({ mode: "live" }); return; }
  if (path === "/api/pilot/auth/signin/google") {
    let body = "";
    request.on("data", chunk => { body += String(chunk); });
    request.on("end", () => {
      const callback = new URLSearchParams(body).get("callbackUrl") ?? "/";
      const destination = new URL(callback, origin);
      response.writeHead(302, { location: destination.origin === origin ? destination.href : origin });
      response.end();
    });
    return;
  }
  if (path === "/v1/pilot/rider/deliveries" && role === "rider") { json([]); return; }
  if (path === "/v1/pilot/stores" && (role === "operator" || role === "superadmin")) { json([]); return; }
  response.writeHead(403); json({ code: "forbidden", message: "Accesso non consentito." });
});
server.listen(3204, "127.0.0.1");
for (const signal of ["SIGTERM", "SIGINT"] as const) process.once(signal, () => server.close());
