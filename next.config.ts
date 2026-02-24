import type { NextConfig } from "next";

const nextConfig: any = {
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb',
    },
  },
  async redirects() {
    return [
      {
        source: '/',
        destination: '/uitgelegd',
        permanent: false, // Use false (307) so the user can be routed back if we ever change this
      },
    ];
  },
};

export default nextConfig;
