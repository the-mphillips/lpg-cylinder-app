"use client"

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { FileUpload } from '@/components/ui/file-upload'
import { Trash2, Upload, Eye } from 'lucide-react'
import { toast } from 'sonner'
import { deleteFile, type UploadResult } from '@/lib/supabase/storage'
import Image from 'next/image'

interface SignaturePreviewModalProps {
  isOpen: boolean
  onClose: () => void
  user: {
    id: string
    name: string
    email: string
    signature?: string
  }
  onSignatureUpdate: (userId: string, signatureUrl: string | null) => void
}

export function SignaturePreviewModal({ isOpen, onClose, user, onSignatureUpdate }: SignaturePreviewModalProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [uploadMode, setUploadMode] = useState(false)

  const handleUploadComplete = (result: UploadResult) => {
    if (result.success && result.url) {
      onSignatureUpdate(user.id, result.url)
      toast.success('Signature uploaded successfully')
      setUploadMode(false)
    } else {
      toast.error(result.error || 'Failed to upload signature')
    }
  }

  const handleDeleteSignature = async () => {
    if (!user.signature) return

    setIsDeleting(true)
    try {
      // Extract path from URL - assuming signature URLs are in format: bucket/path/file
      const url = new URL(user.signature)
      const pathParts = url.pathname.split('/')
      const bucket = 'user-data' // signatures are stored in user-data bucket
      const path = pathParts.slice(2).join('/') // Remove first two parts (/storage/v1/object/public/)
      
      const result = await deleteFile(bucket, path)
      
      if (result.success) {
        onSignatureUpdate(user.id, null)
        toast.success('Signature deleted successfully')
      } else {
        toast.error(result.error || 'Failed to delete signature')
      }
    } catch (error) {
      console.error('Delete error:', error)
      toast.error('Failed to delete signature')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Signature for {user.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Signature Display */}
          <div className="border rounded-lg p-6 bg-gray-50 dark:bg-gray-900">
            <h3 className="text-sm font-medium mb-4">Current Signature</h3>
            {user.signature ? (
              <div className="flex flex-col items-center space-y-4">
                <div className="border rounded bg-white p-4 max-w-md">
                  <Image 
                    src={user.signature} 
                    alt={`${user.name}'s signature`}
                    width={300}
                    height={128}
                    className="max-h-32 max-w-full object-contain"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setUploadMode(true)}
                    disabled={isDeleting}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Replace
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isDeleting}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Signature</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete {user.name}&apos;s signature? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleDeleteSignature}
                          disabled={isDeleting}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          {isDeleting ? 'Deleting...' : 'Delete'}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">No signature uploaded</p>
                <Button
                  variant="outline"
                  onClick={() => setUploadMode(true)}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Signature
                </Button>
              </div>
            )}
          </div>

          {/* Upload Section */}
          {uploadMode && (
            <div className="border rounded-lg p-6">
              <h3 className="text-sm font-medium mb-4">Upload New Signature</h3>
              <FileUpload
                type="signature"
                userId={user.id}
                onUploadComplete={handleUploadComplete}
                className="w-full"
              />
              <div className="flex gap-2 mt-4">
                <Button
                  variant="outline"
                  onClick={() => setUploadMode(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 