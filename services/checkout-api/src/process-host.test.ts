import { afterEach, describe, expect, it, vi } from "vitest";
import { startOrderingHost } from "./process-host";

const { createRuntime, createWorkers, createDiagnostics } = vi.hoisted(() => ({
  createRuntime: vi.fn(), createWorkers: vi.fn(), createDiagnostics: vi.fn(),
}));

vi.mock("./runtime", () => ({ createOrderingRuntime: createRuntime }));
vi.mock("./reconciliation-worker", () => ({ createOperationalWorkers: createWorkers }));
vi.mock("./sentry-reporter", () => ({ createRuntimeDiagnostics: createDiagnostics }));

function pause() {
  let resume = () => {};
  const pending = new Promise<void>(resolve => { resume = resolve; });
  return { pending, resume };
}

function setup() {
  const signals = new Map<string, () => void>();
  vi.spyOn(process, "once").mockImplementation((event, listener) => {
    signals.set(String(event), listener);
    return process;
  });
  const diagnostics = { record: vi.fn(), report: vi.fn(), flush: vi.fn(async () => {}) };
  const listen = vi.fn(async () => "http://localhost:3004");
  const runtime = { app: { listen }, close: vi.fn(async () => {}) };
  const worker = { start: vi.fn(async () => {}), stop: vi.fn(async () => {}) };
  createRuntime.mockResolvedValue(runtime);
  createWorkers.mockReturnValue(worker);
  createDiagnostics.mockResolvedValue(diagnostics);
  return { diagnostics, listen, runtime, worker, stop: () => signals.get("SIGTERM")!() };
}

afterEach(() => { vi.restoreAllMocks(); vi.resetAllMocks(); });

describe("checkout process shutdown during startup", () => {
  it("closes a runtime that finishes initializing after SIGTERM without starting workers or HTTP", async () => {
    const host = setup();
    const initializing = pause();
    createRuntime.mockImplementation(async () => { await initializing.pending; return host.runtime; });
    const started = startOrderingHost(true);
    await vi.waitFor(() => expect(createRuntime).toHaveBeenCalledOnce());

    host.stop();
    initializing.resume();
    await started;

    await vi.waitFor(() => expect(host.diagnostics.flush).toHaveBeenCalledOnce());
    expect(host.runtime.close).toHaveBeenCalledOnce();
    expect(host.worker.start).not.toHaveBeenCalled();
    expect(host.listen).not.toHaveBeenCalled();
  });

  it("drains the first worker tick on SIGTERM without opening the HTTP listener", async () => {
    const host = setup();
    const firstTick = pause();
    host.worker.start.mockReturnValue(firstTick.pending);
    host.worker.stop.mockReturnValue(firstTick.pending);
    const started = startOrderingHost(true);
    await vi.waitFor(() => expect(host.worker.start).toHaveBeenCalledOnce());

    host.stop();
    expect(host.worker.stop).toHaveBeenCalledOnce();
    expect(host.runtime.close).not.toHaveBeenCalled();
    firstTick.resume();
    await started;

    await vi.waitFor(() => expect(host.diagnostics.flush).toHaveBeenCalledOnce());
    expect(host.runtime.close).toHaveBeenCalledOnce();
    expect(host.listen).not.toHaveBeenCalled();
  });
});
