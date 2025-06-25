import "./globals.css";
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
      <body>
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
