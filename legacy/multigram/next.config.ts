import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // Skip typecheck during container build to save 300MB RAM (we verify locally)
    ignoreBuildErrors: true,
  },

  experimental: {
    // Restrict to single thread to stay well under 512MB RAM on free tier
    cpus: 1,
    workerThreads: false,
  },

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(self), microphone=(self), geolocation=()',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
