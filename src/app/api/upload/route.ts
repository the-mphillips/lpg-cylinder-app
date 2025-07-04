import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase/service'

// File type and size validation
const ALLOWED_TYPES = {
  branding: ['image/jpeg', 'image/png', 'image/svg+xml', 'image/webp', 'image/x-icon', 'image/vnd.microsoft.icon'],
  signature: ['image/jpeg', 'image/png', 'image/svg+xml']
}

const SIZE_LIMITS = {
  branding: 5 * 1024 * 1024, // 5MB
  signature: 2 * 1024 * 1024  // 2MB
}

// const BUCKET_MAPPING = {
//   branding: 'app-data',
//   signature: 'user-data'
// }

export async function POST(request: NextRequest) {
  try {
    // 1. Check authentication with Supabase
    const supabase = getServiceClient()
    
    // Get auth token from header or cookie
    const authHeader = request.headers.get('Authorization')
    const authToken = authHeader?.replace('Bearer ', '')
    
    if (!authToken) {
      return NextResponse.json(
        { success: false, error: 'Authentication token required' },
        { status: 401 }
      )
    }

    // Verify the user session
    const { data: { user }, error: authError } = await supabase.auth.getUser(authToken)
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Invalid authentication' },
        { status: 401 }
      )
    }

    // Get user profile for role checking
    const { data: userProfile } = await supabase
      .from('users')
      .select('role')
      .eq('email', user.email)
      .single()

    const userRole = userProfile?.role || 'Tester'

    // 2. Parse form data
    const formData = await request.formData()
    const file = formData.get('file') as File
    const type = formData.get('type') as 'branding' | 'signature'
    const subType = formData.get('subType') as string // e.g., 'logo', 'logo-dark', 'favicon'
    const userId = formData.get('userId') as string

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      )
    }

    if (!type || !['branding', 'signature'].includes(type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid upload type' },
        { status: 400 }
      )
    }

    // 3. Validate file type and size
    if (!ALLOWED_TYPES[type].includes(file.type)) {
      return NextResponse.json(
        { success: false, error: `File type ${file.type} not allowed for ${type}` },
        { status: 400 }
      )
    }

    if (file.size > SIZE_LIMITS[type]) {
      return NextResponse.json(
        { success: false, error: `File size exceeds limit of ${SIZE_LIMITS[type] / (1024 * 1024)}MB` },
        { status: 400 }
      )
    }

    // 4. Check permissions
    if (type === 'branding' && !['Admin', 'Super Admin'].includes(userRole)) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions for branding uploads' },
        { status: 403 }
      )
    }

    if (type === 'signature' && !userId) {
      return NextResponse.json(
        { success: false, error: 'User ID required for signature uploads' },
        { status: 400 }
      )
    }

    // 5. Upload to Supabase Storage
    
    let bucketName: string
    let filePath: string
    
    if (type === 'signature') {
      bucketName = 'user-data'
      const fileName = `${subType || userId}-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
      filePath = `signatures/${fileName}`
    } else {
      bucketName = 'app-data'
      const fileName = `${subType || 'general'}-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
      filePath = `branding/${fileName}`
    }

    // Convert file to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer()
    
    // Upload to Supabase Storage
    const { error } = await supabase.storage
      .from(bucketName)
      .upload(filePath, arrayBuffer, {
        contentType: file.type,
        upsert: false
      })

    if (error) {
      console.error('Storage upload error:', error)
      return NextResponse.json(
        { success: false, error: `Upload failed: ${error.message}` },
        { status: 500 }
      )
    }

    // Get public URL for app-data bucket files, signed URL for user-data
    let publicUrl: string
    if (bucketName === 'app-data') {
      const { data: urlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath)
      publicUrl = urlData.publicUrl
    } else {
      // For user-data bucket, we'll store the path and get signed URLs when needed
      publicUrl = filePath
    }

    // 8. Save branding settings if it's a logo upload
    if (type === 'branding' && publicUrl) {
      await saveBrandingSetting(subType, publicUrl)
    }

    // 9. Log the upload (optional - for audit trail)
    await logFileUpload(user.id, type, filePath, file.name)

    return NextResponse.json({
      success: true,
      path: filePath,
      url: publicUrl,
      message: 'File uploaded successfully'
    })

  } catch (error) {
    console.error('Upload API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}



export async function DELETE(request: NextRequest) {
  try {
    // 1. Check authentication with Supabase
    const supabase = getServiceClient()
    
    // Get auth token from header
    const authHeader = request.headers.get('Authorization')
    const authToken = authHeader?.replace('Bearer ', '')
    
    if (!authToken) {
      return NextResponse.json(
        { success: false, error: 'Authentication token required' },
        { status: 401 }
      )
    }

    // Verify the user session
    const { data: { user }, error: authError } = await supabase.auth.getUser(authToken)
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Invalid authentication' },
        { status: 401 }
      )
    }

    // Get user profile for role checking
    const { data: userProfile } = await supabase
      .from('users')
      .select('role')
      .eq('email', user.email)
      .single()

    const userRole = userProfile?.role || 'Tester'

    // 2. Parse request body
    const body = await request.json()
    const fileUrl = body.fileUrl as string

    if (!fileUrl) {
      return NextResponse.json(
        { success: false, error: 'File URL required' },
        { status: 400 }
      )
    }

    // Extract file path from URL for storage deletion
    const urlParts = fileUrl.split('/')
    const fileName = urlParts[urlParts.length - 1]
    const pathParts = urlParts.slice(-2) // Get folder and filename
    const folderName = pathParts[0]
    
    // Determine type and subType from folder structure
    let type: 'branding' | 'signature'
    let subType: string
    
    if (folderName === 'signatures') {
      type = 'signature'
      subType = 'signature'
    } else if (folderName === 'branding') {
      type = 'branding'
      // Try to determine subType from filename or folder structure
      if (fileName.includes('logo-dark') || fileName.includes('dark')) {
        subType = 'logo-dark'
      } else if (fileName.includes('logo')) {
        subType = 'logo'
      } else if (fileName.includes('favicon')) {
        subType = 'favicon'
      } else {
        subType = 'general'
      }
    } else {
      return NextResponse.json(
        { success: false, error: 'Unknown file type' },
        { status: 400 }
      )
    }

    // 3. Check permissions
    if (type === 'branding' && !['Admin', 'Super Admin'].includes(userRole)) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions for branding file deletion' },
        { status: 403 }
      )
    }

    // 4. Determine bucket and file path
    let bucketName: string
    let filePath: string
    
    if (type === 'signature') {
      bucketName = 'user-data'
      filePath = `signatures/${fileName}`
    } else {
      bucketName = 'app-data'
      filePath = `${folderName}/${fileName}`
    }

    // 5. Delete from Supabase Storage
    const { error } = await supabase.storage
      .from(bucketName)
      .remove([filePath])

    if (error) {
      console.error('Storage delete error:', error)
      return NextResponse.json(
        { success: false, error: `Delete failed: ${error.message}` },
        { status: 500 }
      )
    }

    // 6. Clear branding settings if it's a logo deletion
    if (type === 'branding' && subType) {
      await clearBrandingSetting(subType)
    }

    // 7. Log the deletion (optional - for audit trail)
    await logFileDelete(user.id, type, filePath, fileName)

    return NextResponse.json({
      success: true,
      message: 'File deleted successfully'
    })

  } catch (error) {
    console.error('Delete API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Helper function to log file uploads (optional)
async function logFileUpload(userId: string, type: string, path: string, fileName: string) {
  try {
    // You can implement audit logging here if needed
    console.log(`File uploaded by ${userId}: ${type}/${fileName} -> ${path}`)
  } catch (error) {
    console.error('Failed to log upload:', error)
  }
}

// Helper function to log file deletions (optional)
async function logFileDelete(userId: string, type: string, path: string, fileName: string) {
  try {
    // You can implement audit logging here if needed
    console.log(`File deleted by ${userId}: ${type}/${fileName} -> ${path}`)
  } catch (error) {
    console.error('Failed to log deletion:', error)
  }
}

// Helper function to save branding settings
async function saveBrandingSetting(subType: string, publicUrl: string) {
  try {
    const supabase = getServiceClient()
    
    // Map subType to app_settings key and category
    const brandingKeyMap: Record<string, string> = {
      'logo': 'logo_light_url',
      'logo-dark': 'logo_dark_url',
      'favicon': 'favicon_url'
    }
    
    const reportsKeyMap: Record<string, string> = {
      'report-logo': 'logo_url',
      'report-mark': 'mark_url'
    }
    
    let settingKey: string
    let category: string
    
    if (brandingKeyMap[subType]) {
      settingKey = brandingKeyMap[subType]
      category = 'branding'
    } else if (reportsKeyMap[subType]) {
      settingKey = reportsKeyMap[subType]
      category = 'reports'
    } else {
      console.warn(`Unknown branding subType: ${subType}`)
      return
    }
    
    // Update the app_settings table
    const { error } = await supabase
      .from('app_settings')
      .upsert({
        category: category,
        key: settingKey,
        value: JSON.stringify(publicUrl),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'category,key'
      })
    
    if (error) {
      console.error('Failed to save branding setting:', error)
    } else {
      console.log(`✅ Updated app setting: ${category}.${settingKey} -> ${publicUrl}`)
    }
  } catch (error) {
    console.error('Failed to save branding setting:', error)
  }
}

// Helper function to clear branding settings
async function clearBrandingSetting(subType: string) {
  try {
    const supabase = getServiceClient()
    
    // Map subType to app_settings key and category
    const brandingKeyMap: Record<string, string> = {
      'logo': 'logo_light_url',
      'logo-dark': 'logo_dark_url',
      'favicon': 'favicon_url'
    }
    
    const reportsKeyMap: Record<string, string> = {
      'report-logo': 'logo_url',
      'report-mark': 'mark_url'
    }
    
    let settingKey: string
    let category: string
    
    if (brandingKeyMap[subType]) {
      settingKey = brandingKeyMap[subType]
      category = 'branding'
    } else if (reportsKeyMap[subType]) {
      settingKey = reportsKeyMap[subType]
      category = 'reports'
    } else {
      console.warn(`Unknown branding subType: ${subType}`)
      return
    }
    
    // Update the app_settings table to clear the value
    const { error } = await supabase
      .from('app_settings')
      .upsert({
        category: category,
        key: settingKey,
        value: JSON.stringify(''),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'category,key'
      })
    
    if (error) {
      console.error('Failed to clear branding setting:', error)
    } else {
      console.log(`✅ Cleared app setting: ${category}.${settingKey}`)
    }
  } catch (error) {
    console.error('Failed to clear branding setting:', error)
  }
} 