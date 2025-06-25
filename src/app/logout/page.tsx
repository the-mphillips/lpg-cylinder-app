"use client"

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function LogoutPage() {
  useEffect(() => {
    async function handleLogout() {
      const supabase = createClient()
      
      try {
        await supabase.auth.signOut()
      } catch (error) {
        console.error('Error during logout:', error)
      } finally {
        // Always redirect to login, even if logout fails
        window.location.href = '/login'
      }
    }

    handleLogout()
  }, [])

  return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-gray-100 mx-auto mb-4"></div>
        <p className="text-gray-600 dark:text-gray-400">Signing out...</p>
      </div>
    </div>
  )
} 