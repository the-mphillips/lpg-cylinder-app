import { createClient as createSupabaseClient } from '@supabase/supabase-js'

/**
 * Service role client for server-side operations that bypass RLS
 * Use this for:
 * - File uploads/downloads
 * - Admin operations
 * - Background tasks
 * 
 * IMPORTANT: Never expose service role key to client-side code!
 */
export function createServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY // This should be in your .env.local

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'Missing Supabase environment variables. Please check your .env.local file.\n' +
      'Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY'
    )
  }

  return createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

/**
 * Get service client for API routes and server actions
 */
export function getServiceClient() {
  return createServiceClient()
} 