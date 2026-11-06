import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: process.env.PIZZAOS_BUILD_DIRECTORY ?? ".next",
  // Preserve the canonical host on redirects: demo cookies are bound to that origin.
  skipMiddlewareUrlNormalize: true,
  outputFileTracingRoot: path.join(__dirname, "../.."),
  transpilePackages: [
    "@pizzaos/brand",
    "@pizzaos/domain",
    "@pizzaos/mock-data",
    "@pizzaos/testing",
    "@pizzaos/ui"
  ]
};

export default nextConfig;
