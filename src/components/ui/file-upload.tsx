'use client'

import { useState, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { uploadBrandingImage, uploadDigitalSignature, type UploadResult } from '@/lib/supabase/storage'
import { Upload, X, FileImage, AlertCircle, CheckCircle } from 'lucide-react'

interface FileUploadProps {
  type: 'branding' | 'signature'
  brandingType?: 'logo' | 'logo-dark' | 'favicon'
  userId?: string
  onUploadComplete?: (result: UploadResult) => void
  className?: string
}

export function FileUpload({ 
  type, 
  brandingType, 
  userId: propUserId,
  onUploadComplete, 
  className 
}: FileUploadProps) {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<UploadResult | null>(null)
  const [selectedUserId, setSelectedUserId] = useState<string>(propUserId || '')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Mock users list - in real app this would come from your user management system
  const mockUsers = [
    { id: '1', name: 'John Doe', role: 'Admin' },
    { id: '2', name: 'Jane Smith', role: 'Tester' },
    { id: '3', name: 'Mike Johnson', role: 'Authorised Signatory' },
    { id: '4', name: 'Sarah Wilson', role: 'Authorised Signatory' }
  ]

  const getTitle = () => {
    if (type === 'branding') {
      switch (brandingType) {
        case 'logo': return 'Upload Logo (Light Mode)'
        case 'logo-dark': return 'Upload Logo (Dark Mode)'
        case 'favicon': return 'Upload Favicon'
        default: return 'Upload Image'
      }
    }
    return 'Upload Digital Signature'
  }

  const getDescription = () => {
    if (type === 'branding') {
      switch (brandingType) {
        case 'logo': return 'Upload a logo image for your application branding (light mode)'
        case 'logo-dark': return 'Upload a logo image for your application branding (dark mode)'
        case 'favicon': return 'Upload a favicon for your application'
        default: return 'Upload an image'
      }
    }
    return 'Upload your digital signature for report approval'
  }

  const getAcceptedFormats = () => {
    if (type === 'branding') {
      return 'JPEG, PNG, SVG, WebP up to 5MB'
    }
    return 'JPEG, PNG, SVG up to 2MB'
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) {
      setFile(droppedFile)
      setResult(null)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      setResult(null)
    }
  }

  const handleUpload = async () => {
    if (!file) return

    if (type === 'signature' && !selectedUserId) {
      setResult({
        success: false,
        error: 'Please select a user for the signature upload'
      })
      return
    }

    setUploading(true)
    setResult(null)

    try {
      let uploadResult: UploadResult

      if (type === 'branding' && brandingType) {
        uploadResult = await uploadBrandingImage(file, brandingType)
      } else if (type === 'signature') {
        uploadResult = await uploadDigitalSignature(file, selectedUserId)
      } else {
        uploadResult = {
          success: false,
          error: 'Invalid upload configuration'
        }
      }

      setResult(uploadResult)
      onUploadComplete?.(uploadResult)

      if (uploadResult.success) {
        setFile(null)
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
      }
    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed'
      })
    } finally {
      setUploading(false)
    }
  }

  const clearFile = () => {
    setFile(null)
    setResult(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <Card className={`bwa-card ${className}`}>
      <CardHeader>
        <CardTitle className="text-bwa-primary">{getTitle()}</CardTitle>
        <CardDescription className="text-bwa-muted-foreground">
          {getDescription()}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* User Selection for Signatures */}
        {type === 'signature' && !propUserId && (
          <div>
            <label className="block text-sm font-medium text-bwa-text mb-2">
              Select User
            </label>
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose a user for this signature" />
              </SelectTrigger>
              <SelectContent>
                {mockUsers.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.name} ({user.role})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Upload Area */}
        <div
          className="border-2 border-dashed border-bwa-border rounded-lg p-8 text-center transition-colors hover:border-bwa-secondary/50"
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onDragEnter={(e) => e.preventDefault()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={type === 'branding' ? 'image/*' : 'image/jpeg,image/png,image/svg+xml'}
            onChange={handleFileSelect}
            className="hidden"
          />
          
          {file ? (
            <div className="space-y-3">
              <FileImage className="w-12 h-12 text-bwa-secondary mx-auto" />
              <div>
                <p className="font-medium text-bwa-text">{file.name}</p>
                <p className="text-sm text-bwa-muted-foreground">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={clearFile}
                className="text-red-500 hover:text-red-700 hover:bg-red-50"
              >
                <X className="w-4 h-4 mr-1" />
                Remove
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <Upload className="w-12 h-12 text-bwa-muted-foreground mx-auto" />
              <div>
                <p className="text-lg font-medium text-bwa-text">Drop files here or click to browse</p>
                <p className="text-sm text-bwa-muted-foreground">{getAcceptedFormats()}</p>
              </div>
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="border-bwa-secondary text-bwa-secondary hover:bg-bwa-secondary hover:text-white"
              >
                Choose File
              </Button>
            </div>
          )}
        </div>

        {/* Upload Button */}
        {file && (
          <Button 
            onClick={handleUpload} 
            disabled={uploading || (type === 'signature' && !selectedUserId)}
            className="w-full bg-bwa-primary hover:bg-bwa-primary/90 text-white"
          >
            {uploading ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Uploading...
              </div>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Upload File
              </>
            )}
          </Button>
        )}

        {/* Result */}
        {result && (
          <Alert className={result.success ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}>
            {result.success ? (
              <CheckCircle className="w-4 h-4 text-green-600" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600" />
            )}
            <AlertDescription className={result.success ? 'text-green-700' : 'text-red-700'}>
              {result.success ? 'File uploaded successfully!' : result.error}
              {result.url && (
                <div className="mt-2">
                  <a 
                    href={result.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 underline"
                  >
                    View uploaded file
                  </a>
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
} 