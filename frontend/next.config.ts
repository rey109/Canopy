import type { NextConfig } from "next";

const apiOrigin = process.env.NEXT_PUBLIC_API_URL || "https://staging-canopy-3xyi.encr.app";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["172.16.0.2", "localhost:3000"],
  async rewrites() {
    return [{ source: "/api-backend/:path*", destination: `${apiOrigin}/:path*` }];
  },
};

export default nextConfig;
