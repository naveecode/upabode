import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // Skip typecheck during container build to save 300MB RAM (we verify locally)
    ignoreBuildErrors: true,
  },
  eslint: {
    // Skip linting during container build to save memory
    ignoreDuringBuilds: true,
  },
  experimental: {
    // Restrict to single thread to stay well under 512MB RAM on free tier
    cpus: 1,
    workerThreads: false,
  },
};

export default nextConfig;
