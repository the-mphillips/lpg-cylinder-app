'use client'

import React, { useState, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Palette, Save, Edit, X, Upload, Image as ImageIcon } from 'lucide-react'
import { api } from '@/lib/trpc/client'
import { toast } from 'sonner'
import Image from 'next/image'

export function BrandingSettingsTab() {
  const { data: brandingSettings, isLoading, refetch } = api.admin.getBrandingSettings.useQuery()
  const updateBrandingSetting = api.admin.updateAppSetting.useMutation()
  
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    company_name: '',
    company_tagline: '',
    primary_color: '',
    secondary_color: '',
    logo_light_url: '',
    logo_dark_url: '',
    favicon_url: ''
  })

  // File input refs
  const logoLightRef = useRef<HTMLInputElement>(null)
  const logoDarkRef = useRef<HTMLInputElement>(null)
  const faviconRef = useRef<HTMLInputElement>(null)

  // Helper function to safely get string value
  const safeStringValue = (value: unknown): string => {
    if (!value || value === 'null' || value === null || value === undefined) {
      return ''
    }
    return String(value)
  }

  // Helper function to check if a URL is valid for Next.js Image
  const isValidImageUrl = (url: string): boolean => {
    if (!url || url.trim() === '' || url === 'null' || url === 'undefined') {
      return false
    }
    
    // Check if it's a valid absolute URL or relative path starting with /
    try {
      return url.startsWith('/') || url.startsWith('http://') || url.startsWith('https://')
    } catch {
      return false
    }
  }

  // Update form data when settings load
  React.useEffect(() => {
    if (brandingSettings) {
      setFormData({
        company_name: safeStringValue(brandingSettings.company_name),
        company_tagline: safeStringValue(brandingSettings.company_tagline),
        primary_color: safeStringValue(brandingSettings.primary_color) || '#3D3D3D',
        secondary_color: safeStringValue(brandingSettings.secondary_color) || '#F79226',
        logo_light_url: safeStringValue(brandingSettings.logo_light_url),
        logo_dark_url: safeStringValue(brandingSettings.logo_dark_url),
        favicon_url: safeStringValue(brandingSettings.favicon_url)
      })
    }
  }, [brandingSettings])

  const handleSave = async () => {
    try {
      // Update each setting
      const updates = Object.entries(formData).map(([key, value]) =>
        updateBrandingSetting.mutateAsync({
          category: 'branding',
          key,
          value: JSON.stringify(value)
        })
      )
      
      await Promise.all(updates)
      toast.success('Branding settings updated successfully')
      setIsEditing(false)
      refetch()
    } catch (error) {
      toast.error(`Failed to update branding settings: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const handleCancel = () => {
    // Reset form data to original values
    if (brandingSettings) {
      setFormData({
        company_name: safeStringValue(brandingSettings.company_name),
        company_tagline: safeStringValue(brandingSettings.company_tagline),
        primary_color: safeStringValue(brandingSettings.primary_color) || '#3D3D3D',
        secondary_color: safeStringValue(brandingSettings.secondary_color) || '#F79226',
        logo_light_url: safeStringValue(brandingSettings.logo_light_url),
        logo_dark_url: safeStringValue(brandingSettings.logo_dark_url),
        favicon_url: safeStringValue(brandingSettings.favicon_url)
      })
    }
    setIsEditing(false)
  }

  const handleFileUpload = async (file: File, type: 'logo' | 'logo-dark' | 'favicon') => {
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', 'branding')
      formData.append('subType', type)

      // Get auth token from Supabase client
      const supabase = (await import('@/lib/supabase/client')).createClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          ...(session?.access_token && { 'Authorization': `Bearer ${session.access_token}` })
        },
        body: formData,
      })

      const result = await response.json()

      if (result.success) {
        const urlKey = type === 'logo' ? 'logo_light_url' : 
                      type === 'logo-dark' ? 'logo_dark_url' : 'favicon_url'
        
        setFormData(prev => ({ 
          ...prev, 
          [urlKey]: result.url 
        }))
        
        toast.success(`${type} uploaded successfully`)
      } else {
        toast.error(`Failed to upload ${type}: ${result.error}`)
      }
    } catch (error) {
      toast.error(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const handleFileSelect = (type: 'logo' | 'logo-dark' | 'favicon') => (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      handleFileUpload(file, type)
    }
  }

  if (isLoading) return <div className="p-4">Loading branding settings...</div>

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Branding & Identity
            </div>
            {!isEditing ? (
              <Button onClick={() => setIsEditing(true)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button onClick={handleSave} disabled={updateBrandingSetting.isPending} className="btn-branded">
                  <Save className="h-4 w-4 mr-2" />
                  Save
                </Button>
                <Button variant="outline" onClick={handleCancel}>
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </div>
            )}
          </CardTitle>
          <CardDescription>
            Customize your application&apos;s branding, logos, and color scheme
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
                    {/* Company Information, Brand Colors & Logo Management - 3 Columns */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Company Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Company Information</h3>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="company_name" className="mb-2 block">Company Name</Label>
                  {isEditing ? (
                    <Input
                      id="company_name"
                      value={formData.company_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, company_name: e.target.value }))}
                      placeholder="BWA GAS"
                      className="w-full"
                    />
                  ) : (
                    <div className="p-2 bg-muted rounded-md border">
                      <span className="text-sm">{formData.company_name || 'Not set'}</span>
                    </div>
                  )}
                </div>
                <div>
                  <Label htmlFor="company_tagline" className="mb-2 block">Company Tagline</Label>
                  {isEditing ? (
                    <Input
                      id="company_tagline"
                      value={formData.company_tagline}
                      onChange={(e) => setFormData(prev => ({ ...prev, company_tagline: e.target.value }))}
                      placeholder="LPG Cylinder Testing System"
                      className="w-full"
                    />
                  ) : (
                    <div className="p-2 bg-muted rounded-md border">
                      <span className="text-sm">{formData.company_tagline || 'Not set'}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Brand Colors */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Brand Colors</h3>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="primary_color" className="mb-2 block">Primary Color</Label>
                  {isEditing ? (
                    <div className="flex gap-2">
                      <Input
                        id="primary_color"
                        type="color"
                        value={formData.primary_color}
                        onChange={(e) => setFormData(prev => ({ ...prev, primary_color: e.target.value }))}
                        className="w-12 h-8"
                      />
                      <Input
                        value={formData.primary_color}
                        onChange={(e) => setFormData(prev => ({ ...prev, primary_color: e.target.value }))}
                        placeholder="#3D3D3D"
                        className="flex-1"
                      />
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 p-2 bg-muted rounded-md border">
                      <div 
                        className="w-6 h-6 rounded border"
                        style={{ backgroundColor: formData.primary_color }}
                      />
                      <span className="text-sm">{formData.primary_color}</span>
                    </div>
                  )}
                </div>
                <div>
                  <Label htmlFor="secondary_color" className="mb-2 block">Secondary Color</Label>
                  {isEditing ? (
                    <div className="flex gap-2">
                      <Input
                        id="secondary_color"
                        type="color"
                        value={formData.secondary_color}
                        onChange={(e) => setFormData(prev => ({ ...prev, secondary_color: e.target.value }))}
                        className="w-12 h-8"
                      />
                      <Input
                        value={formData.secondary_color}
                        onChange={(e) => setFormData(prev => ({ ...prev, secondary_color: e.target.value }))}
                        placeholder="#F79226"
                        className="flex-1"
                      />
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 p-2 bg-muted rounded-md border">
                      <div 
                        className="w-6 h-6 rounded border"
                        style={{ backgroundColor: formData.secondary_color }}
                      />
                      <span className="text-sm">{formData.secondary_color}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Logo Management */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Logo Management</h3>
              <div className="space-y-3">
                {/* Hidden file inputs for uploads */}
                <input
                  ref={logoLightRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect('logo')}
                  className="hidden"
                />
                <input
                  ref={logoDarkRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect('logo-dark')}
                  className="hidden"
                />
                <input
                  ref={faviconRef}
                  type="file"
                  accept="image/*,.ico"
                  onChange={handleFileSelect('favicon')}
                  className="hidden"
                />

                {/* Light Mode Logo */}
                <div>
                  <Label className="mb-2 block">Light Logo</Label>
                  <div className="border rounded-lg p-3 bg-white group">
                    {isValidImageUrl(formData.logo_light_url) ? (
                      <div className="space-y-2">
                        <div className="w-full h-20 bg-white border rounded flex items-center justify-center relative group-hover:bg-gray-50 transition-colors">
                          <Image
                            src={formData.logo_light_url}
                            alt="Light mode logo"
                            width={80}
                            height={80}
                            className="max-w-full max-h-full object-contain transition-opacity group-hover:opacity-75"
                          />
                          {isEditing && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded">
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => logoLightRef.current?.click()}
                                  className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
                                  title="Replace logo"
                                >
                                  <Upload className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setFormData(prev => ({ ...prev, logo_light_url: '' }))}
                                  className="p-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
                                  title="Remove logo"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                        {isEditing && (
                          <div className="flex gap-1 opacity-70">
                            <button
                              type="button"
                              onClick={() => logoLightRef.current?.click()}
                              className="px-2 py-1 text-xs bg-blue-50 text-blue-600 rounded hover:bg-blue-100 flex-1"
                            >
                              Replace
                            </button>
                            <button
                              type="button"
                              onClick={() => setFormData(prev => ({ ...prev, logo_light_url: '' }))}
                              className="px-2 py-1 text-xs bg-red-50 text-red-600 rounded hover:bg-red-100"
                            >
                              Remove
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="w-full h-20 border-2 border-dashed border-gray-300 rounded flex items-center justify-center hover:border-gray-400 hover:bg-gray-50 transition-colors">
                        {isEditing ? (
                          <button
                            type="button"
                            onClick={() => logoLightRef.current?.click()}
                            className="text-center text-gray-500 hover:text-gray-700 p-4"
                          >
                            <Upload className="mx-auto h-6 w-6 mb-1" />
                            <div className="text-xs">Click to upload light logo</div>
                          </button>
                        ) : (
                          <div className="text-gray-400 text-xs">No logo uploaded</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Dark Mode Logo */}
                <div>
                  <Label className="mb-2 block">Dark Logo</Label>
                  <div className="border rounded-lg p-3 bg-gray-900 group">
                    {isValidImageUrl(formData.logo_dark_url) ? (
                      <div className="space-y-2">
                        <div className="w-full h-20 bg-gray-900 border border-gray-700 rounded flex items-center justify-center relative group-hover:bg-gray-800 transition-colors">
                          <Image
                            src={formData.logo_dark_url}
                            alt="Dark mode logo"
                            width={80}
                            height={80}
                            className="max-w-full max-h-full object-contain transition-opacity group-hover:opacity-75"
                          />
                          {isEditing && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded">
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => logoDarkRef.current?.click()}
                                  className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
                                  title="Replace logo"
                                >
                                  <Upload className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setFormData(prev => ({ ...prev, logo_dark_url: '' }))}
                                  className="p-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
                                  title="Remove logo"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                        {isEditing && (
                          <div className="flex gap-1 opacity-70">
                            <button
                              type="button"
                              onClick={() => logoDarkRef.current?.click()}
                              className="px-2 py-1 text-xs bg-blue-50 text-blue-600 rounded hover:bg-blue-100 flex-1"
                            >
                              Replace
                            </button>
                            <button
                              type="button"
                              onClick={() => setFormData(prev => ({ ...prev, logo_dark_url: '' }))}
                              className="px-2 py-1 text-xs bg-red-50 text-red-600 rounded hover:bg-red-100"
                            >
                              Remove
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="w-full h-20 border-2 border-dashed border-gray-600 rounded flex items-center justify-center hover:border-gray-500 hover:bg-gray-800 transition-colors">
                        {isEditing ? (
                          <button
                            type="button"
                            onClick={() => logoDarkRef.current?.click()}
                            className="text-center text-gray-400 hover:text-gray-300 p-4"
                          >
                            <Upload className="mx-auto h-6 w-6 mb-1" />
                            <div className="text-xs">Click to upload dark logo</div>
                          </button>
                        ) : (
                          <div className="text-gray-500 text-xs">No logo uploaded</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Favicon */}
                <div>
                  <Label className="mb-2 block">Favicon</Label>
                  <div className="border rounded-lg p-3 bg-white group">
                    {isValidImageUrl(formData.favicon_url) ? (
                      <div className="space-y-2">
                        <div className="w-full h-16 bg-white border rounded flex items-center justify-center relative group-hover:bg-gray-50 transition-colors">
                          <Image
                            src={formData.favicon_url}
                            alt="Favicon"
                            width={24}
                            height={24}
                            className="object-contain transition-opacity group-hover:opacity-75"
                          />
                          {isEditing && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded">
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => faviconRef.current?.click()}
                                  className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
                                  title="Replace favicon"
                                >
                                  <Upload className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setFormData(prev => ({ ...prev, favicon_url: '' }))}
                                  className="p-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
                                  title="Remove favicon"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                        {isEditing && (
                          <div className="flex gap-1 opacity-70">
                            <button
                              type="button"
                              onClick={() => faviconRef.current?.click()}
                              className="px-2 py-1 text-xs bg-blue-50 text-blue-600 rounded hover:bg-blue-100 flex-1"
                            >
                              Replace
                            </button>
                            <button
                              type="button"
                              onClick={() => setFormData(prev => ({ ...prev, favicon_url: '' }))}
                              className="px-2 py-1 text-xs bg-red-50 text-red-600 rounded hover:bg-red-100"
                            >
                              Remove
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="w-full h-16 border-2 border-dashed border-gray-300 rounded flex items-center justify-center hover:border-gray-400 hover:bg-gray-50 transition-colors">
                        {isEditing ? (
                          <button
                            type="button"
                            onClick={() => faviconRef.current?.click()}
                            className="text-center text-gray-500 hover:text-gray-700 p-4"
                          >
                            <ImageIcon className="mx-auto h-5 w-5 mb-1" />
                            <div className="text-xs">Click to upload favicon (.ico supported)</div>
                          </button>
                        ) : (
                          <div className="text-gray-400 text-xs">No favicon uploaded</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>



          {/* Preview Section */}
          {!isEditing && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Brand Preview</h3>
              <div className="p-6 border rounded-lg" style={{ 
                backgroundColor: formData.primary_color + '10',
                borderColor: formData.secondary_color 
              }}>
                <div className="text-center space-y-2">
                  <h2 className="text-2xl font-bold" style={{ color: formData.primary_color }}>
                    {formData.company_name || 'Company Name'}
                  </h2>
                  <p className="text-sm" style={{ color: formData.secondary_color }}>
                    {formData.company_tagline || 'Company Tagline'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 