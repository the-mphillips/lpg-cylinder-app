import { createClient } from './client'
import { getServiceClient } from './service'

export interface UploadResult {
  success: boolean
  url?: string
  error?: string
  path?: string
}

export interface StorageBucket {
  name: string
  public: boolean
  allowedMimeTypes: string[]
  fileSizeLimit: number // in bytes
}

// Define storage buckets configuration for existing buckets
export const STORAGE_BUCKETS: Record<string, StorageBucket> = {
  branding: {
    name: 'app-data',
    public: true,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/svg+xml', 'image/webp'],
    fileSizeLimit: 5 * 1024 * 1024 // 5MB
  },
  signatures: {
    name: 'user-data',
    public: false,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/svg+xml'],
    fileSizeLimit: 2 * 1024 * 1024 // 2MB
  },
  reports: {
    name: 'user-data',
    public: false,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'application/pdf'],
    fileSizeLimit: 10 * 1024 * 1024 // 10MB
  }
}

/**
 * Check if storage buckets exist (they should already exist)
 */
export async function checkStorageBuckets(): Promise<void> {
  const supabase = createClient()

  try {
    const { data: buckets, error: listError } = await supabase.storage.listBuckets()
    
    if (listError) {
      console.error(`Error listing buckets:`, listError)
      return
    }

    const requiredBuckets = ['app-data', 'user-data']
    const existingBuckets = buckets?.map(b => b.name) || []
    
    for (const bucketName of requiredBuckets) {
      if (existingBuckets.includes(bucketName)) {
        console.log(`✅ Storage bucket exists: ${bucketName}`)
      } else {
        console.warn(`⚠️ Storage bucket missing: ${bucketName}`)
      }
    }
  } catch (error) {
    console.error('Error checking storage buckets:', error)
  }
}



/**
 * Upload file via API route with progress callback
 */
export async function uploadFileViaAPI(
  file: File, 
  type: 'branding' | 'signature', 
  subType?: string,
  onProgress?: (progress: number) => void
): Promise<UploadResult> {
  try {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('type', type)
    if (subType) {
      formData.append('subType', subType)
    }

    // Create XMLHttpRequest for progress tracking
    return new Promise((resolve) => {
      const xhr = new XMLHttpRequest()
      
      if (onProgress) {
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const progress = Math.round((event.loaded / event.total) * 100)
            onProgress(progress)
          }
        })
      }

      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          const result = JSON.parse(xhr.responseText)
          resolve(result)
        } else {
          resolve({
            success: false,
            error: 'Upload failed'
          })
        }
      })

      xhr.addEventListener('error', () => {
        resolve({
          success: false,
          error: 'Network error during upload'
        })
      })

      xhr.open('POST', '/api/upload')
      xhr.send(formData)
    })
  } catch (error) {
    console.error('Upload error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Upload signature to user-data/signatures folder
 */
export async function uploadUserSignature(
  file: File, 
  userId: string,
  onProgress?: (progress: number) => void
): Promise<UploadResult> {
  return uploadFileViaAPI(file, 'signature', userId, onProgress)
}

/**
 * Upload branding image to app-data/branding folder
 */
export async function uploadBrandingImage(
  file: File, 
  type: 'logo' | 'logo-dark' | 'favicon',
  onProgress?: (progress: number) => void
): Promise<UploadResult> {
  return uploadFileViaAPI(file, 'branding', type, onProgress)
}

/**
 * Delete a file from storage
 */
export async function deleteFile(bucket: string, path: string): Promise<UploadResult> {
  try {
    const supabaseClient = getServiceClient()
    const { error } = await supabaseClient.storage
      .from(bucket)
      .remove([path])

    if (error) {
      console.error('Delete error:', error)
      return {
        success: false,
        error: error.message
      }
    }

    return {
      success: true
    }
  } catch (error) {
    console.error('Delete error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Get signed URL for a file
 */
export async function getSignedUrl(bucket: string, path: string, expiresIn: number = 3600): Promise<string | null> {
  try {
    const supabaseClient = getServiceClient()
    const { data, error } = await supabaseClient.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn)

    if (error) {
      console.error('Signed URL error:', error)
      return null
    }

    return data.signedUrl
  } catch (error) {
    console.error('Signed URL error:', error)
    return null
  }
}

/**
 * Upload file to specified bucket (legacy - kept for backwards compatibility)
 */
export async function uploadFile(
  bucketName: string,
  file: File
): Promise<UploadResult> {
  console.warn('Direct uploadFile is deprecated. Use uploadBrandingImage or uploadDigitalSignature instead.')
  
  // Try to determine type from bucket name
  const type = bucketName === 'app-data' ? 'branding' : 'signature'
  return uploadFileViaAPI(file, type, undefined, undefined)
}

/**
 * Upload user digital signature to user-data/signatures folder
 */
export async function uploadDigitalSignature(file: File, userId: string): Promise<UploadResult> {
  return uploadUserSignature(file, userId)
}

/**
 * Upload report attachment to user-data/reports folder
 */
export async function uploadReportAttachment(file: File, reportId: string): Promise<UploadResult> {
  // For now, treat as signature type - you might want to add a 'report' type later
  return uploadFileViaAPI(file, 'signature', reportId)
}

/**
 * Get user's digital signature URL
 */
export async function getUserSignatureUrl(userId: string, signaturePath: string): Promise<string | null> {
  return getSignedUrl(STORAGE_BUCKETS.signatures.name, signaturePath, 3600)
}

/**
 * Get branding image URL
 */
export async function getBrandingImageUrl(imagePath: string): Promise<string | null> {
  const supabase = createClient()
  
  try {
    const { data } = supabase.storage
      .from(STORAGE_BUCKETS.branding.name)
      .getPublicUrl(imagePath)
    
    return data.publicUrl
  } catch (error) {
    console.error('Error getting branding image URL:', error)
    return null
  }
}

/**
 * List files in a bucket folder
 */
export async function listFiles(bucketName: string, folder?: string): Promise<unknown[]> {
  const supabase = createClient()

  try {
    const { data, error } = await supabase.storage
      .from(bucketName)
      .list(folder, {
        limit: 100,
        offset: 0
      })

    if (error) {
      console.error('Error listing files:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error listing files:', error)
    return []
  }
} 