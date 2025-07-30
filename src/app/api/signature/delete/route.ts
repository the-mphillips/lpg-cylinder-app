import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { createServerClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { signaturePath } = await request.json()

    if (!signaturePath) {
      return NextResponse.json(
        { error: 'Missing signaturePath' },
        { status: 400 }
      )
    }

    // Extract userId from signature path (format: signatures/userId-timestamp-filename)
    const pathParts = signaturePath.split('/')
    const filename = pathParts[pathParts.length - 1]
    const userId = filename.split('-')[0]

    if (!userId) {
      return NextResponse.json(
        { error: 'Could not extract userId from signature path' },
        { status: 400 }
      )
    }

    // Verify user is authenticated using server client
    const supabase = createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Use service client to delete the file
    const serviceClient = createServiceClient()
    const { error: deleteError } = await serviceClient.storage
      .from('user-data')
      .remove([signaturePath])

    if (deleteError) {
      console.error('Error deleting signature file:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete signature file' },
        { status: 500 }
      )
    }

    // Update user record to remove signature path
    const { error: updateError } = await serviceClient
      .from('users')
      .update({ 
        signature: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)

    if (updateError) {
      console.error('Error updating user signature:', updateError)
      return NextResponse.json(
        { error: 'Failed to update user signature' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Signature deletion error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 