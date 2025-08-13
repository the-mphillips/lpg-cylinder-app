import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Enable CSS optimization for Tailwind v4
    optimizeCss: true,
  },
  // Ensure proper CSS handling
  transpilePackages: ['tailwindcss'],
  // Configure image domains for Supabase storage
  images: {
    remotePatterns: [
      // Add pattern for Supabase project URL from environment
      ...(process.env.NEXT_PUBLIC_SUPABASE_URL 
        ? [{
            protocol: 'https' as const,
            hostname: new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname,
            port: '',
            pathname: '/storage/v1/object/**',
          }]
        : []
      ),
    ],
  },
};

export default nextConfig;
