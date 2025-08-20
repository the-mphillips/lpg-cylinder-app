import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  compress: true,
  experimental: {
    // Enable CSS optimization for Tailwind v4
    optimizeCss: true,
    // Reduce bundle size by optimizing imports for common libs
    optimizePackageImports: [
      "lucide-react",
      "@radix-ui/react-accordion",
      "@radix-ui/react-dialog",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-popover",
      "@radix-ui/react-select",
      "@radix-ui/react-tooltip",
    ],
  },
  // Ensure proper CSS handling
  transpilePackages: ['tailwindcss'],
  // Configure image domains for Supabase storage
  images: {
    formats: ['image/avif', 'image/webp'],
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
  output: 'standalone',
  async headers() {
    const headers: { source: string; headers: { key: string; value: string }[] }[] = []

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseHost = supabaseUrl ? new URL(supabaseUrl).hostname : ''

    const cspDirectives = [
      "default-src 'self'",
      // Allow Next internal scripts and inline styles when necessary; consider tightening with nonces in future
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      `connect-src 'self' https://${supabaseHost} wss://${supabaseHost} https:`,
      "img-src 'self' data: blob: https:",
      "font-src 'self' data: https:",
      "media-src 'self' data: blob: https:",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; ')

    headers.push({
      source: '/:path*',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-DNS-Prefetch-Control', value: 'on' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
        { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
        { key: 'Content-Security-Policy', value: cspDirectives },
      ],
    })

    return headers
  },
};

export default nextConfig;
