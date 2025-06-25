import { checkStorageBuckets } from './storage'

/**
 * Check Supabase storage buckets and other setup tasks
 * This should be called when the application starts
 */
export async function initializeSupabase(): Promise<void> {
  try {
    console.log('🚀 Checking Supabase storage...')
    
    // Check storage buckets
    await checkStorageBuckets()
    
    console.log('✅ Supabase check complete')
  } catch (error) {
    console.error('❌ Supabase check failed:', error)
  }
}

/**
 * Check if Supabase is properly configured
 */
export function checkSupabaseConfig(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!url || !anonKey) {
    console.error('❌ Supabase configuration missing. Please check your environment variables.')
    return false
  }
  
  console.log('✅ Supabase configuration found')
  return true
} 