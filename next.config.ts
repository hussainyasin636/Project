import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config) => {
    // Disable disk cache in Webpack to prevent Node 22 WasmHash cache corruption on Windows
    config.cache = false;
    return config;
  },
  experimental: {
    cpus: 1,
    workerThreads: false,
  },
  turbopack: {},
};

export default nextConfig;
