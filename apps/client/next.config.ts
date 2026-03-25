import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@pizzaos/brand",
    "@pizzaos/domain",
    "@pizzaos/mock-data",
    "@pizzaos/testing",
    "@pizzaos/ui"
  ]
};

export default nextConfig;
