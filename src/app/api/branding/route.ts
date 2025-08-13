import { NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase/service'

export async function GET() {
  try {
    const supabase = getServiceClient()
    const { data, error } = await supabase
      .from('app_settings')
      .select('key, value')
      .eq('category', 'branding')

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Return parsed settings with host normalization for Supabase URLs
    const currentHost = process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname : ''
    const result: Record<string, unknown> = {}
    for (const item of data || []) {
      let parsed: unknown = item.value
      try {
        parsed = typeof item.value === 'string' ? JSON.parse(item.value) : item.value
        if (typeof parsed === 'string') {
          let str = parsed as string
          for (let i = 0; i < 3; i++) {
            if (str.startsWith('"') && str.endsWith('"')) {
              str = JSON.parse(str)
            }
          }
          parsed = str
        }
      } catch {}

      if (typeof parsed === 'string' && (parsed as string).includes('supabase.co') && currentHost) {
        try {
          const u = new URL(parsed as string)
          if (u.hostname.endsWith('supabase.co') && u.hostname !== currentHost) {
            u.hostname = currentHost
            parsed = u.toString()
          }
        } catch {}
      }
      result[item.key] = parsed
    }

    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 })
  }
}


