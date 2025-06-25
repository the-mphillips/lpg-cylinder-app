'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export function DynamicFavicon() {
  const supabase = createClient()

  useEffect(() => {
    async function updateFavicon() {
      try {
        const { data, error } = await supabase
          .from('app_settings')
          .select('key, value')
          .eq('category', 'branding')
          .eq('key', 'favicon_url')
          .single()

        if (error || !data?.value) {
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