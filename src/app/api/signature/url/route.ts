import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { signaturePath } = await request.json()
    
    if (!signaturePath) {
      return NextResponse.json({ error: 'Signature path is required' }, { status: 400 })
    }

    const supabase = await createClient()
    
    // Remove any leading slash if present
    const cleanPath = signaturePath.startsWith('/') ? signaturePath.slice(1) : signaturePath
    
    // If the path doesn't start with 'signatures/', prepend it
    const fullPath = cleanPath.startsWith('signatures/') ? cleanPath : `signatures/${cleanPath}`
    
    const { data, error } = await supabase.storage
      .from('user-data')
      .createSignedUrl(fullPath, 3600) // 1 hour expiry
    
    if (error) {
      console.error('Error creating signed URL:', error)
      return NextResponse.json({ error: 'Failed to create signed URL' }, { status: 500 })
    }
    
    return NextResponse.json({ url: data.signedUrl })
  } catch (error) {
    console.error('Error in signature URL API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 