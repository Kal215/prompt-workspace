import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  transpilePackages: [
    "@prompt-workspace/database",
    "@prompt-workspace/domain-rules",
    "@prompt-workspace/prompt-contracts",
    "@prompt-workspace/prompt-crawler",
    "@prompt-workspace/prompt-engine",
    "@prompt-workspace/prompt-spider",
    "@prompt-workspace/provider-adapters",
  ],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
