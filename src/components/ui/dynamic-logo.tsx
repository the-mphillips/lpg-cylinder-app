'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { useTheme } from 'next-themes'
import { createClient } from '@/lib/supabase/client'

interface BrandingSettings {
  company_name?: string
  logo_light_url?: string
  logo_dark_url?: string
  favicon_url?: string
  primary_color?: string
  secondary_color?: string
}

interface DynamicLogoProps {
  className?: string
  fallbackText?: string
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'xxl'
  showCompanyName?: boolean
  forceTheme?: 'light' | 'dark'
}

export function DynamicLogo({ 
  className = '', 
  fallbackText = 'BWA', 
  size = 'md',
  showCompanyName = false,
  forceTheme
}: DynamicLogoProps) {
  const { theme } = useTheme()
  const [branding, setBranding] = useState<BrandingSettings>({})
  const [isLoading, setIsLoading] = useState(true)
  const [imageError, setImageError] = useState(false)
  const supabase = createClient()

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12', 
    lg: 'w-20 h-20',
    xl: 'w-32 h-32',
    xxl: 'w-64 h-64'
  }

  useEffect(() => {
    async function fetchBrandingSettings() {
      try {
        const { data, error } = await supabase
          .from('app_settings')
          .select('key, value')
          .eq('category', 'branding')

        if (error) {
          console.error('Error fetching branding settings:', error)
          setIsLoading(false)
          return
        }

        const brandingSettings: BrandingSettings = {}
        data?.forEach((setting: { key: string; value: unknown }) => {
          try {
            let parsedValue = typeof setting.value === 'string' ? JSON.parse(setting.value) : setting.value
            
            // Handle nested JSON escaping
            if (typeof parsedValue === 'string' && (parsedValue.startsWith('"') || parsedValue === 'null')) {
              try {
                parsedValue = JSON.parse(parsedValue)
              } catch {
                // If it fails to parse again, keep the original value
              }
            }
            
            // Don't store null strings
            if (parsedValue === 'null' || parsedValue === null || parsedValue === '') {
              parsedValue = undefined
            }

            // Normalize any Supabase storage URLs to current project host
            if (typeof parsedValue === 'string' && parsedValue.includes('supabase.co')) {
              try {
                const currentHost = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL as string).hostname
                const u = new URL(parsedValue)
                if (u.hostname.endsWith('supabase.co') && u.hostname !== currentHost) {
                  u.hostname = currentHost
                  parsedValue = u.toString()
                }
              } catch {}
            }

            brandingSettings[setting.key as keyof BrandingSettings] = parsedValue as string
          } catch {
            brandingSettings[setting.key as keyof BrandingSettings] = setting.value as string
          }
        })

        setBranding(brandingSettings)
      } catch (error) {
        console.error('Error fetching branding:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchBrandingSettings()
  }, [supabase])

  // Determine which logo to use based on theme or forceTheme
  const effectiveTheme = forceTheme || theme
  const logoUrl: string | undefined = effectiveTheme === 'dark' ? branding.logo_dark_url : branding.logo_light_url
  const companyName = branding.company_name || 'BWA Gas'

  // Show loading state
  if (isLoading) {
    return (
      <div className={`${sizeClasses[size]} ${className} bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800 rounded-lg animate-pulse flex items-center justify-center`}>
        <div className="w-1/2 h-1/2 bg-slate-300 dark:bg-slate-600 rounded"></div>
      </div>
    )
  }

  // Show image logo if available and no error. Only show company name alongside if explicitly requested.
  if (logoUrl && logoUrl !== 'null' && logoUrl !== 'undefined' && typeof logoUrl === 'string' && logoUrl.trim() !== '' && !imageError) {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <div className={`${sizeClasses[size]} relative overflow-hidden rounded-lg`}>
          <Image
            src={logoUrl}
            alt={`${companyName} Logo`}
            fill
            className="object-contain"
            onError={() => setImageError(true)}
            priority
          />
        </div>
        {/* When a logo is shown, suppress company name text in navbar per requirement */}
      </div>
    )
  }

  // Fallback to text-based logo
  const primaryColor = branding.primary_color || '#3D3D3D'
  const fallbackStyle = {
    backgroundColor: primaryColor,
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div 
        className={`${sizeClasses[size]} rounded-lg flex items-center justify-center text-white font-bold shadow-lg`}
        style={fallbackStyle}
      >
        <span className={`${size === 'xl' ? 'text-4xl' : size === 'lg' ? 'text-2xl' : size === 'md' ? 'text-lg' : 'text-sm'}`}>
          {fallbackText}
        </span>
      </div>
      {showCompanyName && (
        <div className="flex flex-col">
          <span className="font-bold text-lg leading-tight" style={{ color: primaryColor }}>
            {companyName}
          </span>
          <span className="text-sm text-muted-foreground">Test Report System</span>
        </div>
      )}
    </div>
  )
} 