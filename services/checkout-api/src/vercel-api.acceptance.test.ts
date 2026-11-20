// @vitest-environment node

import { createServer, request, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createDiagnostics, type Diagnostics } from "./diagnostics";

type Runtime = {
  app: { server: Server };
  reconcileOrders: () => Promise<void>;
  dispatchEmails: () => Promise<void>;
  close: () => Promise<void>;
  diagnostics: Diagnostics;
};
const factories = vi.hoisted(() => ({
  diagnostics: vi.fn<() => Promise<Diagnostics>>(),
  runtime: vi.fn<(env?: unknown, diagnostics?: Diagnostics) => Promise<Runtime>>(),
}));
vi.mock("./runtime", () => ({ createOrderingRuntime: factories.runtime }));
vi.mock("./sentry-reporter", () => ({ createRuntimeDiagnostics: factories.diagnostics }));

function deferred<T>() {
  let complete: ((value: T) => void) | undefined;
  const promise = new Promise<T>((resolve) => { complete = resolve; });
  return { promise, resolve: (value: T) => { complete?.(value); } };
}

const servers: Server[] = [];
afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => new Promise<void>((resolve) => {
    server.closeAllConnections();
    server.close(() => { resolve(); });
  })));
});
beforeEach(() => { vi.resetModules(); factories.runtime.mockReset(); factories.diagnostics.mockReset(); });

function diagnosticsFixture() {
  const flush = vi.fn(async () => {});
  const diagnostics = { ...createDiagnostics({ stream: { write: () => {} } }), flush };
  factories.diagnostics.mockResolvedValue(diagnostics);
  return { diagnostics, flush };
}

function runtime(app: Server, diagnostics: Diagnostics): Runtime {
  return { app: { server: app }, diagnostics, reconcileOrders: async () => {}, dispatchEmails: async () => {}, close: async () => {} };
}

async function boundary(handler: (req: IncomingMessage, res: ServerResponse) => Promise<void>) {
  const calls: Promise<void>[] = [];
  const responses: ServerResponse[] = [];
  const server = createServer((req, res) => {
    responses.push(res);
    const work = handler(req, res);
    calls.push(work);
    void work.catch(() => { if (!res.destroyed) { res.statusCode = 500; res.end(); } });
  });
  servers.push(server);
  await new Promise<void>((resolve) => { server.listen(0, "127.0.0.1", resolve); });
  const address = server.address();
  if (address === null || typeof address === "string") throw new Error("Loopback test server did not bind");
  return {
    calls, responses,
    send: () => new Promise<{ status: number; headers: IncomingMessage["headers"]; body: string }>((resolve, reject) => {
      const client = request({ hostname: "127.0.0.1", port: address.port, path: "/health", agent: false }, (res) => {
        const parts: Buffer[] = [];
        res.on("data", (chunk: Buffer) => { parts.push(chunk); });
        res.on("end", () => { resolve({ status: res.statusCode ?? 0, headers: res.headers, body: Buffer.concat(parts).toString("utf8") }); });
        res.on("error", reject);
      });
      client.on("error", reject);
      client.end();
    }),
    abortable: () => {
      const client = request({ hostname: "127.0.0.1", port: address.port, path: "/health", agent: false });
      client.on("error", () => {});
      client.end();
      return client;
    },
  };
}

async function settlesWithin(work: Promise<void>, timeoutMs = 1_000) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([work, new Promise<never>((_resolve, reject) => { timer = setTimeout(() => { reject(new Error("Serverless handler stayed pending")); }, timeoutMs); })]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

describe("serverless handler observable lifecycle", () => {
  it("waits for response finish and for the diagnostic flush before resolving", async () => {
    const { diagnostics, flush } = diagnosticsFixture();
    const handling = deferred<ServerResponse>();
    const flushing = deferred<void>();
    flush.mockImplementation(async () => { await flushing.promise; });
    factories.runtime.mockResolvedValue(runtime(createServer((_req, res) => { handling.resolve(res); }), diagnostics));
    const { default: handler } = await import("./vercel-api");
    const server = await boundary(handler);
    const response = server.send();
    const outgoing = await handling.promise;
    let completed = false;
    const work = server.calls[0];
    if (!work) throw new Error("Handler was not invoked");
    void work.then(() => { completed = true; });
    await new Promise<void>((resolve) => { setImmediate(resolve); });
    expect(completed).toBe(false);
    expect(flush).not.toHaveBeenCalled();
    outgoing.end("ok");
    expect((await response).status).toBe(200);
    await new Promise<void>((resolve) => { setImmediate(resolve); });
    expect(flush).toHaveBeenCalledTimes(1);
    expect(completed).toBe(false);
    flushing.resolve();
    await settlesWithin(work);
    expect(completed).toBe(true);
  });

  it("returns a correlated sanitized 503 on startup failure and retries initialization next request", async () => {
    const { diagnostics, flush } = diagnosticsFixture();
    factories.runtime.mockRejectedValueOnce(new Error("postgres://password-startup-private-secret"));
    factories.runtime.mockResolvedValueOnce(runtime(createServer((_req, res) => { res.end("ready"); }), diagnostics));
    const { default: handler } = await import("./vercel-api");
    const server = await boundary(handler);
    const first = await server.send();
    expect(first.status).toBe(503);
    expect(first.headers["x-request-id"]).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    expect(JSON.parse(first.body)).toMatchObject({ code: "service_unavailable", requestId: first.headers["x-request-id"], message: expect.any(String) });
    expect(first.body).not.toContain("private-secret");
    const second = await server.send();
    expect(second.status).toBe(200);
    expect(second.body).toBe("ready");
    await settlesWithin(Promise.all(server.calls).then(() => {}));
    expect(factories.runtime).toHaveBeenCalledTimes(2);
    expect(flush).toHaveBeenCalled();
  });

  it("settles after abort when response close happened during slow initialization", async () => {
    const { diagnostics, flush } = diagnosticsFixture();
    const starting = deferred<void>();
    const initialized = deferred<Runtime>();
    factories.runtime.mockImplementation(async () => { starting.resolve(); return initialized.promise; });
    const { default: handler } = await import("./vercel-api");
    const server = await boundary(handler);
    const client = server.abortable();
    await starting.promise;
    const outgoing = server.responses[0];
    if (!outgoing) throw new Error("Response was not created");
    const closed = new Promise<void>((resolve) => { outgoing.once("close", resolve); });
    client.destroy();
    await closed;
    expect(outgoing.destroyed).toBe(true);
    initialized.resolve(runtime(createServer((_req, res) => { res.end("unused"); }), diagnostics));
    const work = server.calls[0];
    if (!work) throw new Error("Handler was not invoked");
    await settlesWithin(work);
    expect(flush).toHaveBeenCalledTimes(1);
  });
});
