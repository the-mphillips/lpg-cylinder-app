'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export function DynamicFavicon() {
  const supabase = createClient()

  useEffect(() => {
    async function updateFavicon() {
      try {
        const { data: sessionData } = await supabase.auth.getSession()
        if (!sessionData.session) return

        const { data, error } = await supabase
          .from('app_settings')
          .select('key, value')
          .eq('category', 'branding')
          .eq('key', 'favicon_url')
          .single()

        if (error) {
          console.warn('Favicon fetch skipped (RLS or not available).')
          return
        }

        if (!data?.value) {
          console.log('No custom favicon found, using default')
          return
        }

        let faviconUrl: string
        try {
          faviconUrl = typeof data.value === 'string' ? JSON.parse(data.value) : data.value
        } catch {
          faviconUrl = data.value
        }

        if (faviconUrl) {
          // Normalize to current Supabase project host if needed
          try {
            const currentHost = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL as string).hostname
            const u = new URL(faviconUrl)
            if (u.hostname.endsWith('supabase.co') && u.hostname !== currentHost) {
              u.hostname = currentHost
              faviconUrl = u.toString()
            }
          } catch {}

          // Update favicon
          const link = document.querySelector("link[rel*='icon']") as HTMLLinkElement || 
                      document.createElement('link')
          link.type = 'image/x-icon'
          link.rel = 'shortcut icon'
          link.href = faviconUrl
          
          if (!document.querySelector("link[rel*='icon']")) {
            document.getElementsByTagName('head')[0].appendChild(link)
          }
        }
      } catch (error) {
        console.error('Error updating favicon:', error)
      }
    }

    updateFavicon()
  }, [supabase])

  return null // This component doesn't render anything
} 