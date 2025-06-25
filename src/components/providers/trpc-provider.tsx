'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useState } from 'react'

import { api, trpcClientOptions } from '@/lib/trpc/client'

interface TRPCProviderProps {
  children: React.ReactNode
}

export function TRPCProvider({ children }: TRPCProviderProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000, // 5 minutes
            retry: (failureCount: number, error: unknown) => {
              // Don't retry on 4xx errors
              if (error && typeof error === 'object' && 'data' in error) {
                const errorData = error.data as { httpStatus?: number }
                if (errorData?.httpStatus && errorData.httpStatus >= 400 && errorData.httpStatus < 500) {
                  return false
                }
              }
              return failureCount < 3
            },
          },
        },
      })
  )

  const [trpcClient] = useState(() =>
    api.createClient(trpcClientOptions)
  )

  return (
    <api.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {children}
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </api.Provider>
  )
} 