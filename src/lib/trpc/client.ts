import { createTRPCReact } from '@trpc/react-query'
import { httpBatchLink, loggerLink } from '@trpc/client'
import superjson from 'superjson'

import type { AppRouter } from '@/app/api/trpc/[trpc]/route'

const getBaseUrl = () => {
  if (typeof window !== 'undefined') return '' // browser should use relative url
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}` // SSR should use vercel url
  return `http://localhost:${process.env.PORT ?? 3000}` // dev SSR should use localhost
}

export const api = createTRPCReact<AppRouter>()

export const trpcClientOptions = {
  links: [
    loggerLink({
      enabled: (opts) =>
        process.env.NODE_ENV === 'development' ||
        (opts.direction === 'down' && opts.result instanceof Error),
    }),
    httpBatchLink({
      url: `${getBaseUrl()}/api/trpc`,
      transformer: superjson,
      headers() {
        return {
          // Add any headers you need here
        }
      },
    }),
  ],
  queryClientConfig: {
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
  },
} 