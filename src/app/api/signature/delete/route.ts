import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { signaturePath } = await request.json()

    if (!signaturePath) {
      return NextResponse.json(
        { error: 'Missing signaturePath' },
        { status: 400 }
      )
    }

    // Verify user is authenticated using server client
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Extract userId from signature path (format: signatures/userId-timestamp-filename)
    const pathParts = signaturePath.split('/')
    const filename = pathParts[pathParts.length - 1]
    
    // Split by '-' and get the UUID part (first 5 segments for UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
    const filenameParts = filename.split('-')
    if (filenameParts.length < 6) {
      return NextResponse.json(
        { error: 'Invalid signature filename format' },
        { status: 400 }
      )
    }
    
    // Reconstruct the full UUID (first 5 parts)
    const userId = filenameParts.slice(0, 5).join('-')

    if (!userId) {
      return NextResponse.json(
        { error: 'Could not extract userId from signature path' },
        { status: 400 }
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
      console.error('Error updating user record:', updateError)
      return NextResponse.json(
        { error: 'Failed to update user record' },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true,
      message: 'Signature deleted successfully'
    })

  } catch (error) {
    console.error('Error in signature deletion:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 