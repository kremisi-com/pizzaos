// DOM setup belongs only to browser tests; service suites run in Node.
if (typeof window !== "undefined") {
  await import("../apps/client/src/test/setup");
}

export {};
