import { initTRPC, TRPCError } from '@trpc/server'
import superjson from 'superjson'
import { ZodError } from 'zod'

import { createServerClient } from '@supabase/ssr'

/**
 * 1. CONTEXT
 *
 * This section defines the "contexts" that are available in the backend API.
 *
 * These allow you to access things when processing a request, like the database, the session, etc.
 *
 * This helper generates the "internals" for a tRPC context. The API handler and RSC clients each
 * wrap this and provides the required context.
 *
 * @see https://trpc.io/docs/server/context
 */
export const createTRPCContext = async (opts: { req: Request; res?: Response }) => {
  const { req } = opts

  // Create a Supabase client that can access cookies from the request
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          const cookieHeader = req.headers.get('cookie')
          if (!cookieHeader) return []
          
          return cookieHeader.split(';').map(cookie => {
            const [name, ...valueParts] = cookie.trim().split('=')
            return {
              name: name.trim(),
              value: valueParts.join('=').trim()
            }
          })
        },
        setAll() {
          // In API routes, we can't set cookies directly on the request
          // This would normally be handled by middleware or response headers
        },
      },
    }
  )

  // Create a service role client for admin operations to bypass RLS
  const supabaseService = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll: () => [],
        setAll: () => {},
      },
    }
  )

  return {
    supabase,
    supabaseService,
    req,
    headers: req.headers,
  }
}

/**
 * 2. INITIALIZATION
 *
 * This is where the tRPC API is initialized, connecting the context and transformer. We also parse
 * ZodErrors so that you get typesafety on the frontend if your procedure fails due to validation
 * errors on the backend.
 */
const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    }
  },
})

/**
 * Create a server-side caller.
 *
 * @see https://trpc.io/docs/server/server-side-calls
 */
export const createCallerFactory = t.createCallerFactory

/**
 * 3. ROUTER & PROCEDURE (THE IMPORTANT BIT)
 *
 * These are the pieces you use to build your tRPC API. You should import these a lot in the
 * "/src/server/api/routers" directory.
 */

/**
 * This is how you create new routers and sub-routers in your tRPC API.
 *
 * @see https://trpc.io/docs/router
 */
export const createTRPCRouter = t.router

/**
 * Public (unauthenticated) procedure
 *
 * This is the base piece you use to build new queries and mutations on your tRPC API. It does not
 * guarantee that a user querying is authorized, but you can still access user session data if they
 * are logged in.
 */
export const publicProcedure = t.procedure

/**
 * Re-usable middleware to ensure
 * users are logged in
 */
const isAuthed = t.middleware(async ({ ctx, next }) => {
  const { data: { user: authUser }, error } = await ctx.supabase.auth.getUser()
  
  if (error || !authUser) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }

  // Get user profile from public.users table by email, as IDs may not match auth.users
  const { data: userProfile, error: profileError } = await ctx.supabaseService
    .from('users')
    .select('*')
    .eq('email', authUser.email)
    .single()

  if (profileError || !userProfile) {
    console.error('User profile lookup failed:', profileError, 'for email:', authUser.email)
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'User profile not found' });
  }
  
  return next({
    ctx: {
      user: userProfile,
      authUser,
      supabase: ctx.supabase,
      supabaseService: ctx.supabaseService,
      headers: ctx.headers,
      req: ctx.req,
    },
  });
});

/**
 * Protected (authenticated) procedure
 *
 * If you want a query or mutation to ONLY be accessible to logged in users, use this. It verifies
 * that an auth token is present on the header.
 *
 * @see https://trpc.io/docs/procedures
 */
export const authedProcedure = t.procedure.use(isAuthed);

/**
 * Admin procedure
 *
 * Only accessible to users with admin or super admin roles
 */
export const adminProcedure = authedProcedure.use(async ({ ctx, next }) => {
  if (!ctx.user?.role || !['Admin', 'Super Admin'].includes(ctx.user.role)) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' })
  }

  return next({ ctx })
});

/**
 * Super Admin procedure
 *
 * Only accessible to users with super_admin role
 */
export const superAdminProcedure = authedProcedure.use(async ({ ctx, next }) => {
  if (!ctx.user?.role || ctx.user.role !== 'Super Admin') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Super Admin access required' })
  }

  return next({ ctx })
});

// Legacy procedure for backward compatibility - will be removed
export const protectedProcedure = authedProcedure; 