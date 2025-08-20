import "./globals.css";
import localFont from 'next/font/local'

const geistSans = localFont({
  src: [
    { path: '../../public/static/static/fonts/Arial.ttf', weight: '400', style: 'normal' },
    { path: '../../public/static/static/fonts/Arial-Bold.ttf', weight: '700', style: 'normal' },
  ],
  variable: '--font-sans',
  display: 'swap',
  preload: true,
})
import { Toaster } from 'sonner'

import { TRPCProvider } from "@/components/providers/trpc-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { DynamicFavicon } from "@/components/ui/dynamic-favicon";
import { MainLayout } from "@/components/layout/main-layout";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Performance: Preconnect to Supabase to speed up auth/storage calls */}
        {process.env.NEXT_PUBLIC_SUPABASE_URL ? (
          <>
            <link rel="preconnect" href={new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin} />
            <link rel="dns-prefetch" href={new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin} />
          </>
        ) : null}
      </head>
      <body className={`${geistSans.variable}`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <TRPCProvider>
            <DynamicFavicon />
            <MainLayout>
              {children}
            </MainLayout>
            <Toaster />
          </TRPCProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
