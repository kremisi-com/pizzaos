import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
