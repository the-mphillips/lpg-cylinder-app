import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Enable CSS optimization for Tailwind v4
    optimizeCss: true,
  },
  // Ensure proper CSS handling
  transpilePackages: ['tailwindcss'],
};

export default nextConfig;
