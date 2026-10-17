import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // GitHub project pages serve the site at /upabode/.
  output: "export",
  basePath: "/upabode",
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
