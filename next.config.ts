import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // @react-pdf/renderer berisi binary/native bindings — jangan di-bundle webpack
  serverExternalPackages: ["@react-pdf/renderer"],
};

export default nextConfig;
