// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { readRuntimeConfiguration } from "./runtime-config.js";
import { createReconciliationWorker } from "./reconciliation-worker.js";

// Every credential below is a deliberately fake fixture, never an account secret.
function validEnvironment(): Record<string, string | undefined> {
  return {
    NODE_ENV: "production",
    DATABASE_URL: "postgresql://fake_user:fake_password@database.invalid/pizzaos_test_fixture",
    AUTH_SECRET: "fake-auth-secret-for-runtime-tests-only-12345",
    PIZZAOS_PROXY_SECRET: "fake-proxy-secret-for-runtime-tests-only-67890",
    PIZZAOS_ALLOWED_ORIGINS: "https://client.example.org,https://admin.example.org",
    PIZZAOS_SUPERADMIN_EMAILS: "Admin@Example.org, OWNER@example.org ",
    AUTH_GOOGLE_ID: "fake-google-client-id",
    AUTH_GOOGLE_SECRET: "fake-google-client-secret",
    SMTP_URL: "smtp://fake_user:fake_password@mail.invalid:587",
    AUTH_EMAIL_FROM: "PizzaOS Test Fixture <fixture@example.org>",
    STRIPE_SECRET_KEY: "sk_test_explicitly_fake_runtime_fixture",
    STRIPE_WEBHOOK_SECRET: "whsec_explicitly_fake_runtime_fixture",
  };
}

const requiredFields = [
  "DATABASE_URL", "AUTH_SECRET", "PIZZAOS_PROXY_SECRET",
  "PIZZAOS_ALLOWED_ORIGINS", "PIZZAOS_SUPERADMIN_EMAILS", "AUTH_GOOGLE_ID",
  "AUTH_GOOGLE_SECRET", "SMTP_URL", "AUTH_EMAIL_FROM", "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
] as const;

function expectConfigurationError(env: Record<string, string | undefined>, field: string) {
  let failure: unknown;
  try {
    readRuntimeConfiguration(env);
  } catch (error) {
    failure = error;
  }
  expect(failure).toBeInstanceOf(Error);
  const message = failure instanceof Error ? failure.message : "";
  expect(message).toContain(field);
  for (const secretField of [
    "DATABASE_URL", "AUTH_SECRET", "PIZZAOS_PROXY_SECRET", "AUTH_GOOGLE_SECRET",
    "SMTP_URL", "STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET",
  ]) {
    const secret = env[secretField];
    if (secret?.trim()) expect(message).not.toContain(secret);
  }
}

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("runtime configuration public contract", () => {
  it("returns provider configuration, canonical origins and normalized superadmins", () => {
    const env = validEnvironment();
    expect(readRuntimeConfiguration(env)).toEqual({
      databaseUrl: env.DATABASE_URL,
      authSecret: env.AUTH_SECRET,
      proxySecret: env.PIZZAOS_PROXY_SECRET,
      origins: ["https://client.example.org", "https://admin.example.org"],
      superadminEmails: ["admin@example.org", "owner@example.org"],
      googleClientId: env.AUTH_GOOGLE_ID,
      googleClientSecret: env.AUTH_GOOGLE_SECRET,
      smtpUrl: env.SMTP_URL,
      emailFrom: env.AUTH_EMAIL_FROM,
      stripeSecretKey: env.STRIPE_SECRET_KEY,
      stripeWebhookSecret: env.STRIPE_WEBHOOK_SECRET,
      environment: "production",
      reservationMs: 600_000,
    });
  });

  for (const field of requiredFields) {
    it.each([undefined, "", "   "])(`rejects missing or empty ${field}: %s without exposing credentials`, (value) => {
      expectConfigurationError({ ...validEnvironment(), [field]: value }, field);
    });
  }

  it.each(["AUTH_SECRET", "PIZZAOS_PROXY_SECRET"])("requires at least 32 characters for %s", (field) => {
    expectConfigurationError({ ...validEnvironment(), [field]: "fake-short-secret" }, field);
    expect(() => readRuntimeConfiguration({ ...validEnvironment(), [field]: "f".repeat(32) })).not.toThrow();
  });

  it("rejects identical authentication and proxy secrets", () => {
    const env = validEnvironment();
    env.PIZZAOS_PROXY_SECRET = env.AUTH_SECRET;
    expectConfigurationError(env, "PIZZAOS_PROXY_SECRET");
  });

  it.each([
    "https://fake_user:fake_password@client.example.org",
    "https://client.example.org/path",
    "https://client.example.org?fake_token=value",
    "https://client.example.org#fragment",
    "https://*.example.org",
    "*",
    "client.example.org",
    "http://client.example.org",
    "ftp://client.example.org",
    "https://client.example.org,http://unsafe.example.org",
  ])("rejects unsafe allowed origin %s", (origin) => {
    expectConfigurationError({ ...validEnvironment(), PIZZAOS_ALLOWED_ORIGINS: origin }, "PIZZAOS_ALLOWED_ORIGINS");
  });

  it.each(["http://localhost:3001", "http://127.0.0.1:3001", "http://[::1]:3001"])("permits development loopback origin %s", (origin) => {
    expect(readRuntimeConfiguration({
      ...validEnvironment(), NODE_ENV: "development", PIZZAOS_ALLOWED_ORIGINS: origin,
    }).origins).toEqual([origin]);
    expectConfigurationError({ ...validEnvironment(), PIZZAOS_ALLOWED_ORIGINS: origin }, "PIZZAOS_ALLOWED_ORIGINS");
  });

  it.each(["http://localhost.example.org:3001", "http://192.168.1.20:3001"])("rejects non-loopback HTTP in development: %s", (origin) => {
    expectConfigurationError({
      ...validEnvironment(), NODE_ENV: "development", PIZZAOS_ALLOWED_ORIGINS: origin,
    }, "PIZZAOS_ALLOWED_ORIGINS");
  });

  it.each(["not-an-email", "poc@pizzaos.app", "POC@PIZZAOS.APP"])("rejects invalid or reserved superadmin %s", (email) => {
    expectConfigurationError({ ...validEnvironment(), PIZZAOS_SUPERADMIN_EMAILS: email }, "PIZZAOS_SUPERADMIN_EMAILS");
  });

  it("accepts explicit production and test environments with their provider credentials", () => {
    expect(readRuntimeConfiguration({
      ...validEnvironment(), PIZZAOS_ENVIRONMENT: "production",
      STRIPE_SECRET_KEY: "sk_live_explicitly_fake_runtime_fixture",
    }).environment).toBe("production");
    expect(readRuntimeConfiguration({ ...validEnvironment(), PIZZAOS_ENVIRONMENT: "test" }).environment).toBe("test");
  });

  it.each(["preview", "development", "TEST", ""])("rejects unsupported environment %s", (environment) => {
    expectConfigurationError({ ...validEnvironment(), PIZZAOS_ENVIRONMENT: environment }, "PIZZAOS_ENVIRONMENT");
  });

  it.each(["sk_live_explicitly_fake_runtime_fixture", "explicitly_fake_unrecognized_key"])("prevents test runtime with non-test Stripe key %s", (key) => {
    expectConfigurationError({
      ...validEnvironment(), PIZZAOS_ENVIRONMENT: "test", STRIPE_SECRET_KEY: key,
    }, "STRIPE_SECRET_KEY");
  });

  it("converts fractional reservation minutes to milliseconds", () => {
    expect(readRuntimeConfiguration({ ...validEnvironment(), PAYMENT_RESERVATION_MINUTES: "2.5" }).reservationMs).toBe(150_000);
  });

  it.each(["0", "-1", "NaN", "Infinity", "invalid"])("rejects non-positive or non-finite reservation %s", (minutes) => {
    expectConfigurationError({ ...validEnvironment(), PAYMENT_RESERVATION_MINUTES: minutes }, "PAYMENT_RESERVATION_MINUTES");
  });

  it("preserves optional demo configuration without relaxing required fields", () => {
    const env = { ...validEnvironment(), PIZZAOS_DEMO_PASSWORD: "fake-demo-password-fixture-only" };
    expect(readRuntimeConfiguration(env).demoPassword).toBe(env.PIZZAOS_DEMO_PASSWORD);
    expectConfigurationError({ ...env, DATABASE_URL: undefined }, "DATABASE_URL");
  });

  it("uses only the supplied environment and leaves it unchanged", () => {
    const env = Object.freeze(validEnvironment());
    const before = { ...env };
    vi.stubEnv("PIZZAOS_ENVIRONMENT", "test");
    try {
      expect(readRuntimeConfiguration(env).environment).toBe("production");
      expect(env).toEqual(before);
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("does not print configuration or validation failures", () => {
    const spies = ["log", "info", "warn", "error", "debug"]
      .map((method) => vi.spyOn(console, method as "log" | "info" | "warn" | "error" | "debug").mockImplementation(() => undefined));
    readRuntimeConfiguration(validEnvironment());
    expectConfigurationError({ ...validEnvironment(), AUTH_SECRET: undefined }, "AUTH_SECRET");
    for (const spy of spies) expect(spy).not.toHaveBeenCalled();
  });
});

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((complete) => { resolve = complete; });
  return { promise, resolve };
}

describe("reconciliation worker public lifecycle", () => {
  it("starts immediately, then runs every five seconds without HTTP activity", async () => {
    vi.useFakeTimers();
    const tick = vi.fn(async () => undefined);
    const worker = createReconciliationWorker({ tick });
    expect(tick).not.toHaveBeenCalled();
    await worker.start();
    expect(tick).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(4_999);
    expect(tick).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(tick).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(5_000);
    expect(tick).toHaveBeenCalledTimes(3);
    await worker.stop();
  });

  it("supports a custom interval", async () => {
    vi.useFakeTimers();
    const tick = vi.fn(async () => undefined);
    const worker = createReconciliationWorker({ tick, intervalMs: 250 });
    await worker.start();
    await vi.advanceTimersByTimeAsync(249);
    expect(tick).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(tick).toHaveBeenCalledTimes(2);
    await worker.stop();
  });

  it.each([0, -1, 0.5, Number.NaN, Number.POSITIVE_INFINITY])("rejects invalid interval %s before running work", (intervalMs) => {
    const tick = vi.fn(async () => undefined);
    expect(() => createReconciliationWorker({ tick, intervalMs })).toThrow();
    expect(tick).not.toHaveBeenCalled();
  });

  it("awaits the first tick and repeated start neither duplicates it nor adds timers", async () => {
    vi.useFakeTimers();
    const pending = deferred();
    const tick = vi.fn(() => pending.promise);
    const worker = createReconciliationWorker({ tick });
    let started = false;
    const first = worker.start().then(() => { started = true; });
    const second = worker.start();
    await vi.advanceTimersByTimeAsync(15_000);
    expect(started).toBe(false);
    expect(tick).toHaveBeenCalledTimes(1);
    pending.resolve();
    await Promise.all([first, second]);
    await worker.start();
    expect(tick).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(5_000);
    expect(tick).toHaveBeenCalledTimes(2);
    await worker.stop();
  });

  it("never overlaps a pending periodic tick and resumes after it completes", async () => {
    vi.useFakeTimers();
    const pending = deferred();
    const tick = vi.fn<() => Promise<void>>(async () => undefined)
      .mockImplementationOnce(async () => undefined)
      .mockImplementationOnce(() => pending.promise);
    const worker = createReconciliationWorker({ tick });
    await worker.start();
    await vi.advanceTimersByTimeAsync(5_000);
    expect(tick).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(20_000);
    expect(tick).toHaveBeenCalledTimes(2);
    pending.resolve();
    await vi.advanceTimersByTimeAsync(5_000);
    expect(tick).toHaveBeenCalledTimes(3);
    await worker.stop();
  });

  it("reports initial and periodic errors and keeps later ticks possible", async () => {
    vi.useFakeTimers();
    const initialError = new Error("fake initial provider failure");
    const periodicError = new Error("fake periodic provider failure");
    const tick = vi.fn(async () => undefined).mockRejectedValueOnce(initialError).mockRejectedValueOnce(periodicError);
    const onError = vi.fn();
    const worker = createReconciliationWorker({ tick, onError });
    await expect(worker.start()).resolves.toBeUndefined();
    expect(onError).toHaveBeenNthCalledWith(1, initialError);
    await vi.advanceTimersByTimeAsync(5_000);
    expect(onError).toHaveBeenNthCalledWith(2, periodicError);
    await vi.advanceTimersByTimeAsync(5_000);
    expect(tick).toHaveBeenCalledTimes(3);
    await worker.stop();
  });

  it("does not print provider failures when no error observer is supplied", async () => {
    vi.useFakeTimers();
    const spies = ["log", "info", "warn", "error", "debug"]
      .map((method) => vi.spyOn(console, method as "log" | "info" | "warn" | "error" | "debug").mockImplementation(() => undefined));
    const tick = vi.fn(async () => { throw new Error("sk_test_explicitly_fake_error_fixture"); });
    const worker = createReconciliationWorker({ tick });
    await expect(worker.start()).resolves.toBeUndefined();
    await vi.advanceTimersByTimeAsync(5_000);
    for (const spy of spies) expect(spy).not.toHaveBeenCalled();
    await worker.stop();
  });

  it.each(["initial", "periodic"] as const)("stop drains an active %s tick and prevents all later starts", async (phase) => {
    vi.useFakeTimers();
    const pending = deferred();
    const tick = vi.fn(() => pending.promise);
    if (phase === "periodic") tick.mockResolvedValueOnce(undefined);
    const worker = createReconciliationWorker({ tick });
    const starting = worker.start();
    if (phase === "periodic") {
      await starting;
      await vi.advanceTimersByTimeAsync(5_000);
    }
    const callsBeforeStop = tick.mock.calls.length;
    let stopped = false;
    const stopping = worker.stop().then(() => { stopped = true; });
    const stoppingAgain = worker.stop();
    await vi.advanceTimersByTimeAsync(20_000);
    expect(stopped).toBe(false);
    expect(tick).toHaveBeenCalledTimes(callsBeforeStop);
    pending.resolve();
    await Promise.all([starting, stopping, stoppingAgain]);
    expect(stopped).toBe(true);
    await worker.stop();
    await worker.start();
    await vi.advanceTimersByTimeAsync(20_000);
    expect(tick).toHaveBeenCalledTimes(callsBeforeStop);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("stop before start is harmless and permanently prevents work", async () => {
    vi.useFakeTimers();
    const tick = vi.fn(async () => undefined);
    const worker = createReconciliationWorker({ tick });
    await worker.stop();
    await worker.stop();
    await worker.start();
    await vi.advanceTimersByTimeAsync(20_000);
    expect(tick).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
});
