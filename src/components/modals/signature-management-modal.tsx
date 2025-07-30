'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  Upload, 
  X, 
  AlertCircle, 
  CheckCircle, 
  Trash2,
  Download,
  RefreshCw
} from 'lucide-react'
import { uploadUserSignature, deleteFile, buildSignatureUrl } from '@/lib/supabase/storage'
import Image from 'next/image'

interface SignatureModalProps {
  user: {
    id: string
    first_name: string
    last_name: string
    signature?: string
  } | null
  isOpen: boolean
  onClose: () => void
  onSignatureUpdate: (userId: string, signaturePath: string | null) => void
}

export function SignatureManagementModal({ 
  user, 
  isOpen, 
  onClose, 
  onSignatureUpdate 
}: SignatureModalProps) {
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [currentFile, setCurrentFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [signatureUrl, setSignatureUrl] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [deleting, setDeleting] = useState(false)
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Load signature when user changes
  useEffect(() => {
    async function loadSignatureUrl() {
      if (user?.signature) {
        try {
          // Get signed URL from API route
          const response = await fetch('/api/signature/url', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ signaturePath: user.signature }),
          })
          
          if (response.ok) {
            const data = await response.json()
            setSignatureUrl(data.url)
          } else {
            console.error('Error loading signature URL:', response.statusText)
            setSignatureUrl(null)
          }
        } catch (error) {
          console.error('Error loading signature:', error)
          setSignatureUrl(null)
        }
      } else {
        setSignatureUrl(null)
      }
    }
    loadSignatureUrl()
  }, [user])

  const validateFile = (file: File): string | null => {
    // Check file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/svg+xml']
    if (!allowedTypes.includes(file.type)) {
      return 'Please upload a JPEG, PNG, or SVG image'
    }

    // Check file size (2MB limit)
    const maxSize = 2 * 1024 * 1024 // 2MB
    if (file.size > maxSize) {
      return 'File size must be less than 2MB'
    }

    return null
  }

  const handleFileSelect = useCallback((file: File) => {
    const error = validateFile(file)
    if (error) {
      setMessage({ type: 'error', text: error })
      return
    }

    setCurrentFile(file)
    setMessage(null)

    // Create preview URL
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      handleFileSelect(files[0])
    }
  }, [handleFileSelect])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
  }, [])

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) {
      handleFileSelect(files[0])
    }
  }

  const handleUpload = async () => {
    if (!currentFile || !user) return

    setUploading(true)
    setUploadProgress(0)
    setMessage(null)

    try {
      const result = await uploadUserSignature(currentFile, user.id, (progress) => {
        setUploadProgress(progress)
      })

      if (result.success) {
        setMessage({ type: 'success', text: 'Signature uploaded successfully!' })
        setCurrentFile(null)
        setPreviewUrl(null)
        
        // Update the parent component
        onSignatureUpdate(user.id, result.path || result.url || '')
        
        // Reload signature display
        if (result.path) {
          try {
            const response = await fetch('/api/signature/url', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ signaturePath: result.path }),
            })
            
            if (response.ok) {
              const data = await response.json()
              setSignatureUrl(data.url)
            }
          } catch (error) {
            console.error('Error reloading signature:', error)
          }
        }
      } else {
        setMessage({ type: 'error', text: result.error || 'Upload failed' })
      }
         } catch {
       setMessage({ type: 'error', text: 'Upload failed. Please try again.' })
     } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }

  const handleDelete = async () => {
    if (!user?.signature) return

    setDeleting(true)
    setMessage(null)

    try {
      const result = await deleteFile('user-data', user.signature)
      
      if (result.success) {
        setMessage({ type: 'success', text: 'Signature deleted successfully!' })
        setSignatureUrl(null)
        onSignatureUpdate(user.id, null)
      } else {
        setMessage({ type: 'error', text: result.error || 'Delete failed' })
      }
         } catch {
       setMessage({ type: 'error', text: 'Delete failed. Please try again.' })
     } finally {
      setDeleting(false)
    }
  }

  const handleDownload = () => {
    if (signatureUrl) {
      const link = document.createElement('a')
      link.href = signatureUrl
      link.download = `${user?.first_name}_${user?.last_name}_signature.png`
      link.click()
    }
  }

  const clearCurrentFile = () => {
    setCurrentFile(null)
    setPreviewUrl(null)
    setMessage(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleClose = () => {
    clearCurrentFile()
    onClose()
  }

  if (!user) return null

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Digital Signature</DialogTitle>
          <DialogDescription>
            Upload, view, or manage the digital signature for {user.first_name} {user.last_name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Display Current Signature */}
          {signatureUrl && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Current Signature</h3>
              <div className="relative border rounded-lg p-4 bg-white">
                <Image
                  src={signatureUrl}
                  alt={`${user.first_name} ${user.last_name} signature`}
                  width={400}
                  height={150}
                  className="mx-auto object-contain"
                  style={{ maxHeight: '150px' }}
                />
                <div className="flex justify-center gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownload}
                  >
                    <Download className="w-4 h-4 mr-1" />
                    Download
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleDelete}
                    disabled={deleting}
                  >
                    {deleting ? (
                      <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4 mr-1" />
                    )}
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Upload New Signature */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">
              {signatureUrl ? 'Replace Signature' : 'Upload Signature'}
            </h3>
            
            {/* Drag & Drop Area */}
            <div
              className="border-2 border-dashed border-border rounded-lg p-8 text-center transition-colors hover:border-primary/50 cursor-pointer"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/svg+xml"
                onChange={handleFileInputChange}
                className="hidden"
              />
              
              {previewUrl ? (
                <div className="space-y-3">
                  <div className="relative inline-block">
                    <Image
                      src={previewUrl}
                      alt="Signature preview"
                      width={300}
                      height={100}
                      className="object-contain border rounded"
                      style={{ maxHeight: '100px' }}
                    />
                    <Button
                      variant="destructive"
                      size="sm"
                      className="absolute -top-2 -right-2"
                      onClick={(e) => {
                        e.stopPropagation()
                        clearCurrentFile()
                      }}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  <div>
                    <p className="font-medium text-sm">{currentFile?.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {currentFile && (currentFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <Upload className="w-12 h-12 text-muted-foreground mx-auto" />
                  <div>
                    <p className="font-medium">Drag & drop your signature here</p>
                    <p className="text-sm text-muted-foreground">
                      or click to browse files
                    </p>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    JPEG, PNG, SVG up to 2MB
                  </div>
                </div>
              )}
            </div>

            {/* Upload Progress */}
            {uploading && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Uploading...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} />
              </div>
            )}

            {/* Messages */}
            {message && (
              <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
                {message.type === 'error' ? (
                  <AlertCircle className="h-4 w-4" />
                ) : (
                  <CheckCircle className="h-4 w-4" />
                )}
                <AlertDescription>{message.text}</AlertDescription>
              </Alert>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Close
          </Button>
          {currentFile && (
            <Button 
              onClick={handleUpload} 
              disabled={uploading}
            >
              {uploading ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Signature
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 