'use client'

import React, { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { X, Upload, Image as ImageIcon, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import Image from 'next/image'

interface UploadedImage {
  filePath: string
  originalName: string
  size: number
  preview?: string
  publicUrl?: string
}

interface MultiImageUploadProps {
  value: string[]
  onChange: (filePaths: string[]) => void
  maxFiles?: number
  maxSizeMB?: number
  className?: string
  onUploadStart?: () => void
  onUploadComplete?: (results: UploadedImage[]) => void
  onUploadError?: (error: string) => void
}

export function MultiImageUpload({
  value = [],
  onChange,
  maxFiles = 10,
  maxSizeMB = 10,
  className,
  onUploadStart,
  onUploadComplete,
  onUploadError
}: MultiImageUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [previews, setPreviews] = useState<{[key: string]: string}>({})
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (files: FileList | null) => {
    if (!files) return

    const fileArray = Array.from(files)
    
    // Check file count limit
    if (value.length + fileArray.length > maxFiles) {
      onUploadError?.(`Maximum ${maxFiles} images allowed`)
      return
    }

    // Validate files
    const validFiles: File[] = []
    const errors: string[] = []

    for (const file of fileArray) {
      if (!file.type.startsWith('image/')) {
        errors.push(`${file.name}: Not an image file`)
        continue
      }

      if (file.size > maxSizeMB * 1024 * 1024) {
        errors.push(`${file.name}: File too large (max ${maxSizeMB}MB)`)
        continue
      }

      validFiles.push(file)
    }

    if (errors.length > 0) {
      onUploadError?.(errors.join(', '))
    }

    if (validFiles.length === 0) return

    setUploading(true)
    onUploadStart?.()

    try {
      // Create previews for immediate feedback
      const newPreviews: {[key: string]: string} = {}
      validFiles.forEach(file => {
        const previewUrl = URL.createObjectURL(file)
        newPreviews[file.name] = previewUrl
      })
      setPreviews(prev => ({ ...prev, ...newPreviews }))

      const formData = new FormData()
      validFiles.forEach(file => formData.append('images', file))

      const response = await fetch('/api/upload/images', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error('Upload failed')
      }

      const result = await response.json()
      
      if (result.success) {
        const uploadedFilePaths = result.uploadedFiles.map((file: UploadedImage) => file.filePath)
        onChange([...value, ...uploadedFilePaths])
        onUploadComplete?.(result.uploadedFiles)
        
        if (result.errors) {
          onUploadError?.(result.errors.join(', '))
        }
      } else {
        throw new Error(result.error || 'Upload failed')
      }
    } catch (error) {
      console.error('Upload error:', error)
      onUploadError?.(error instanceof Error ? error.message : 'Upload failed')
      
      // Clean up failed previews
      setPreviews(prev => {
        const updated = { ...prev }
        validFiles.forEach(file => {
          if (updated[file.name]) {
            URL.revokeObjectURL(updated[file.name])
            delete updated[file.name]
          }
        })
        return updated
      })
    } finally {
      setUploading(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    handleFileSelect(e.dataTransfer.files)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
  }

  const removeImage = (filePath: string) => {
    const newValue = value.filter(path => path !== filePath)
    onChange(newValue)
    
    // Clean up preview if it exists
    const previewKey = Object.keys(previews).find(key => previews[key] === filePath)
    if (previewKey) {
      URL.revokeObjectURL(previews[previewKey])
      setPreviews(prev => {
        const updated = { ...prev }
        delete updated[previewKey]
        return updated
      })
    }
  }

  const getImageSrc = (filePath: string) => {
    // Check if it's a preview URL first
    const previewKey = Object.keys(previews).find(key => previews[key] === filePath)
    if (previewKey) {
      return previews[previewKey]
    }
    
    // If it's already a full URL (public URL from Supabase), return as is
    if (filePath.startsWith('http')) {
      return filePath
    }
    
    // For uploaded files, construct the public URL from Supabase storage
    // The filePath should be the full path in the storage bucket
    if (filePath.startsWith('reports/images/')) {
      // Construct the public URL for Supabase storage
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const bucketName = 'app-data'
      return `${supabaseUrl}/storage/v1/object/public/${bucketName}/${filePath}`
    }
    
    // Fallback to API route for other cases
    return `/api/images/${filePath.split('/').pop()}`
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Upload Area */}
      <div
        className={cn(
          "border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer",
          dragOver 
            ? "border-primary bg-primary/5" 
            : "border-gray-300 hover:border-gray-400",
          uploading && "pointer-events-none opacity-50"
        )}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => handleFileSelect(e.target.files)}
          disabled={uploading}
        />
        
        <div className="flex flex-col items-center space-y-2">
          {uploading ? (
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          ) : (
            <Upload className="h-8 w-8 text-gray-400" />
          )}
          <div className="text-sm">
            <span className="font-medium text-primary">Click to upload</span>
            <span className="text-gray-500"> or drag and drop</span>
          </div>
          <div className="text-xs text-gray-500">
            PNG, JPG, WebP up to {maxSizeMB}MB each ({maxFiles - value.length} remaining)
          </div>
        </div>
      </div>

      {/* Image Previews */}
      {value.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {value.map((filePath, index) => (
            <Card key={filePath} className="relative group">
              <CardContent className="p-2">
                <div className="aspect-square relative rounded-md overflow-hidden bg-gray-100">
                  <Image
                    src={getImageSrc(filePath)}
                    alt={`Upload ${index + 1}`}
                    width={200}
                    height={200}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // Fallback if image fails to load
                      e.currentTarget.src = '/placeholder-image.png'
                    }}
                  />
                  
                  {/* Delete button */}
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation()
                      removeImage(filePath)
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
                
                {/* File info */}
                <div className="mt-1 text-xs text-gray-500 truncate">
                  {filePath.split('/').pop()}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* No images state */}
      {value.length === 0 && (
        <div className="text-center py-6 text-gray-500">
          <ImageIcon className="h-12 w-12 mx-auto mb-2 text-gray-300" />
          <p className="text-sm">No images uploaded yet</p>
        </div>
      )}
    </div>
  )
} 