'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Palette, Save, Edit, X } from 'lucide-react'
import { FileUpload } from '@/components/ui/file-upload'
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

  // Update form data when settings load
  React.useEffect(() => {
    if (brandingSettings) {
      setFormData({
        company_name: brandingSettings.company_name || '',
        company_tagline: brandingSettings.company_tagline || '',
        primary_color: brandingSettings.primary_color || '#3D3D3D',
        secondary_color: brandingSettings.secondary_color || '#F79226',
        logo_light_url: brandingSettings.logo_light_url || '',
        logo_dark_url: brandingSettings.logo_dark_url || '',
        favicon_url: brandingSettings.favicon_url || ''
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
    } catch (error: any) {
      toast.error(`Failed to update branding settings: ${error.message}`)
    }
  }

  const handleCancel = () => {
    // Reset form data to original values
    if (brandingSettings) {
      setFormData({
        company_name: brandingSettings.company_name || '',
        company_tagline: brandingSettings.company_tagline || '',
        primary_color: brandingSettings.primary_color || '#3D3D3D',
        secondary_color: brandingSettings.secondary_color || '#F79226',
        logo_light_url: brandingSettings.logo_light_url || '',
        logo_dark_url: brandingSettings.logo_dark_url || '',
        favicon_url: brandingSettings.favicon_url || ''
      })
    }
    setIsEditing(false)
  }

  const handleLogoUpload = (type: 'logo' | 'logo-dark' | 'favicon') => (result: any) => {
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
                <Button onClick={handleSave} disabled={updateBrandingSetting.isPending}>
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
            Customize your application's branding, logos, and color scheme
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Company Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Company Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="company_name">Company Name</Label>
                {isEditing ? (
                  <Input
                    id="company_name"
                    value={formData.company_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, company_name: e.target.value }))}
                    placeholder="BWA GAS"
                  />
                ) : (
                  <div className="p-3 bg-muted rounded-md border">
                    <span className="text-sm">{formData.company_name || 'Not set'}</span>
                  </div>
                )}
              </div>
              <div>
                <Label htmlFor="company_tagline">Company Tagline</Label>
                {isEditing ? (
                  <Input
                    id="company_tagline"
                    value={formData.company_tagline}
                    onChange={(e) => setFormData(prev => ({ ...prev, company_tagline: e.target.value }))}
                    placeholder="LPG Cylinder Testing System"
                  />
                ) : (
                  <div className="p-3 bg-muted rounded-md border">
                    <span className="text-sm">{formData.company_tagline || 'Not set'}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Brand Colors */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Brand Colors</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="primary_color">Primary Color</Label>
                {isEditing ? (
                  <div className="flex gap-2">
                    <Input
                      id="primary_color"
                      type="color"
                      value={formData.primary_color}
                      onChange={(e) => setFormData(prev => ({ ...prev, primary_color: e.target.value }))}
                      className="w-16 h-10"
                    />
                    <Input
                      value={formData.primary_color}
                      onChange={(e) => setFormData(prev => ({ ...prev, primary_color: e.target.value }))}
                      placeholder="#3D3D3D"
                      className="flex-1"
                    />
                  </div>
                ) : (
                  <div className="flex items-center gap-3 p-3 bg-muted rounded-md border">
                    <div 
                      className="w-8 h-8 rounded border"
                      style={{ backgroundColor: formData.primary_color }}
                    />
                    <span className="text-sm">{formData.primary_color}</span>
                  </div>
                )}
              </div>
              <div>
                <Label htmlFor="secondary_color">Secondary Color</Label>
                {isEditing ? (
                  <div className="flex gap-2">
                    <Input
                      id="secondary_color"
                      type="color"
                      value={formData.secondary_color}
                      onChange={(e) => setFormData(prev => ({ ...prev, secondary_color: e.target.value }))}
                      className="w-16 h-10"
                    />
                    <Input
                      value={formData.secondary_color}
                      onChange={(e) => setFormData(prev => ({ ...prev, secondary_color: e.target.value }))}
                      placeholder="#F79226"
                      className="flex-1"
                    />
                  </div>
                ) : (
                  <div className="flex items-center gap-3 p-3 bg-muted rounded-md border">
                    <div 
                      className="w-8 h-8 rounded border"
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Light Mode Logo */}
              <div className="space-y-3">
                <Label>Light Mode Logo</Label>
                {formData.logo_light_url && !isEditing && (
                  <div className="p-4 border rounded-lg bg-white">
                    <Image
                      src={formData.logo_light_url}
                      alt="Light mode logo"
                      width={200}
                      height={100}
                      className="mx-auto object-contain"
                      style={{ maxHeight: '100px' }}
                    />
                  </div>
                )}
                {isEditing && (
                  <FileUpload
                    type="branding"
                    brandingType="logo"
                    onUploadComplete={handleLogoUpload('logo')}
                  />
                )}
              </div>

              {/* Dark Mode Logo */}
              <div className="space-y-3">
                <Label>Dark Mode Logo</Label>
                {formData.logo_dark_url && !isEditing && (
                  <div className="p-4 border rounded-lg bg-gray-900">
                    <Image
                      src={formData.logo_dark_url}
                      alt="Dark mode logo"
                      width={200}
                      height={100}
                      className="mx-auto object-contain"
                      style={{ maxHeight: '100px' }}
                    />
                  </div>
                )}
                {isEditing && (
                  <FileUpload
                    type="branding"
                    brandingType="logo-dark"
                    onUploadComplete={handleLogoUpload('logo-dark')}
                  />
                )}
              </div>

              {/* Favicon */}
              <div className="space-y-3">
                <Label>Favicon</Label>
                {formData.favicon_url && !isEditing && (
                  <div className="p-4 border rounded-lg bg-white">
                    <Image
                      src={formData.favicon_url}
                      alt="Favicon"
                      width={32}
                      height={32}
                      className="mx-auto object-contain"
                    />
                  </div>
                )}
                {isEditing && (
                  <FileUpload
                    type="branding"
                    brandingType="favicon"
                    onUploadComplete={handleLogoUpload('favicon')}
                  />
                )}
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