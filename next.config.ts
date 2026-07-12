import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required for the Docker runner stage: produces .next/standalone/
  // with all server-side code bundled into a single self-contained dir.
  output: "standalone",
  serverExternalPackages: ["argon2", "lightningcss", "@tailwindcss/postcss", "pyright"],
};

export default nextConfig;
