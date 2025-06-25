'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Edit, Upload, Trash2 } from 'lucide-react'
import { api } from '@/lib/trpc/client'
import { toast } from 'sonner'

const defaultAddress = { street: '', city: '', state: '', postcode: '', country: '' }
const defaultContact = { phone: '', email: '', website: '' }

export function BrandingSettingsTab() {
  const [companyInfo, setCompanyInfo] = useState({
    company_name: '',
    company_tagline: '',
    company_address: defaultAddress,
    company_contact: defaultContact
  })
  const [originalCompanyInfo, setOriginalCompanyInfo] = useState(companyInfo)
  const [visualSettings, setVisualSettings] = useState({
    primary_color: '#3D3D3D',
    secondary_color: '#F79226',
    logo_light_url: '',
    logo_dark_url: '',
    favicon_url: ''
  })
  const [isEditingCompany, setIsEditingCompany] = useState(false)

  // File input refs
  const logoLightRef = useRef<HTMLInputElement>(null)
  const logoDarkRef = useRef<HTMLInputElement>(null)
  const faviconRef = useRef<HTMLInputElement>(null)

  // Mutations
  const { mutateAsync: updateBrandingSetting } = api.admin.updateAppSetting.useMutation()

  // Queries
  const { data: brandingSettings, isLoading, refetch } = api.admin.getBrandingSettings.useQuery()

  const safeStringValue = (value: unknown): string => {
    if (value === null || value === undefined) return ''
    if (typeof value === 'string') return value
    return String(value).replace(/^"|"$/g, '') // Remove surrounding quotes
  }

  const safeObjectValue = <T extends Record<string, string>>(value: unknown, defaultValue: T): T => {
    if (!value) return defaultValue
    if (typeof value === 'object') return { ...defaultValue, ...(value as T) }
    try {
      const parsed = JSON.parse(String(value))
      return { ...defaultValue, ...parsed } as T
    } catch {
      return defaultValue
    }
  }

  useEffect(() => {
    if (brandingSettings) {
      const newCompanyInfo = {
        company_name: safeStringValue(brandingSettings.company_name),
        company_tagline: safeStringValue(brandingSettings.company_tagline),
        company_address: safeObjectValue(brandingSettings.company_address, defaultAddress),
        company_contact: safeObjectValue(brandingSettings.company_contact, defaultContact)
      }
      
      const newVisualSettings = {
        primary_color: safeStringValue(brandingSettings.primary_color) || '#3D3D3D',
        secondary_color: safeStringValue(brandingSettings.secondary_color) || '#F79226',
        logo_light_url: safeStringValue(brandingSettings.logo_light_url),
        logo_dark_url: safeStringValue(brandingSettings.logo_dark_url),
        favicon_url: safeStringValue(brandingSettings.favicon_url)
      }
      
      setCompanyInfo(newCompanyInfo)
      setOriginalCompanyInfo(newCompanyInfo)
      setVisualSettings(newVisualSettings)
    }
  }, [brandingSettings])

  // Save only changed company information
  const handleSaveCompanyInfo = async () => {
    try {
      const updates = []
      
      // Only update fields that have actually changed
      if (companyInfo.company_name !== originalCompanyInfo.company_name) {
        updates.push(updateBrandingSetting({
          category: 'branding',
          key: 'company_name',
          value: JSON.stringify(companyInfo.company_name)
        }))
      }
      
      if (companyInfo.company_tagline !== originalCompanyInfo.company_tagline) {
        updates.push(updateBrandingSetting({
          category: 'branding',
          key: 'company_tagline',
          value: JSON.stringify(companyInfo.company_tagline)
        }))
      }
      
      if (JSON.stringify(companyInfo.company_address) !== JSON.stringify(originalCompanyInfo.company_address)) {
        updates.push(updateBrandingSetting({
          category: 'branding',
          key: 'company_address',
          value: JSON.stringify(JSON.stringify(companyInfo.company_address))
        }))
      }
      
      if (JSON.stringify(companyInfo.company_contact) !== JSON.stringify(originalCompanyInfo.company_contact)) {
        updates.push(updateBrandingSetting({
          category: 'branding',
          key: 'company_contact',
          value: JSON.stringify(JSON.stringify(companyInfo.company_contact))
        }))
      }
      
      if (updates.length > 0) {
        await Promise.all(updates)
        toast.success('Company information updated successfully')
        setOriginalCompanyInfo(companyInfo)
        refetch()
      } else {
        toast.info('No changes to save')
      }
      
      setIsEditingCompany(false)
    } catch (error) {
      toast.error(`Failed to update company information: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const handleCancelCompanyEdit = () => {
    setCompanyInfo(originalCompanyInfo)
    setIsEditingCompany(false)
  }

  // Immediate color update
  const handleColorChange = async (colorType: 'primary_color' | 'secondary_color', color: string) => {
    try {
      setVisualSettings(prev => ({ ...prev, [colorType]: color }))
      
      await updateBrandingSetting({
        category: 'branding',
        key: colorType,
        value: JSON.stringify(color)
      })
      
      toast.success(`${colorType.replace('_', ' ')} updated`)
    } catch (error) {
      toast.error(`Failed to update color: ${error instanceof Error ? error.message : 'Unknown error'}`)
      // Revert on error
      refetch()
    }
  }

  // Immediate file upload
  const handleFileUpload = async (file: File, settingKey: keyof typeof visualSettings) => {
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', 'branding')
      
      const subTypeMap = {
        logo_light_url: 'logo',
        logo_dark_url: 'logo-dark', 
        favicon_url: 'favicon',
        primary_color: '',
        secondary_color: ''
      }
      
      formData.append('subType', subTypeMap[settingKey])

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
        setVisualSettings(prev => ({ 
          ...prev, 
          [settingKey]: result.url 
        }))
        
        toast.success(`${settingKey.replace('_url', '').replace('logo', 'logo ')} uploaded successfully`)
        refetch()
      } else {
        toast.error(`Failed to upload ${settingKey.replace('_url', '')}: ${result.error}`)
      }
    } catch (error) {
      toast.error(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const handleFileSelect = (settingKey: keyof typeof visualSettings) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      handleFileUpload(file, settingKey)
    }
  }

  // Immediate file deletion
  const handleFileDelete = async (fileUrl: string, settingKey: keyof typeof visualSettings) => {
    const fileType = settingKey === 'logo_light_url' ? 'light logo' : 
                    settingKey === 'logo_dark_url' ? 'dark logo' : 'favicon'
    
    const confirmed = window.confirm(`Are you sure you want to delete the ${fileType}? This action cannot be undone.`)
    if (!confirmed) return

    try {
      const supabase = (await import('@/lib/supabase/client')).createClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      const response = await fetch('/api/upload', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token && { 'Authorization': `Bearer ${session.access_token}` })
        },
        body: JSON.stringify({ fileUrl }),
      })

      if (response.ok) {
        setVisualSettings(prev => ({ 
          ...prev, 
          [settingKey]: '' 
        }))
        
        toast.success(`${fileType} deleted successfully`)
        refetch()
      } else {
        toast.error(`Failed to delete ${fileType}: ${response.statusText}`)
      }
    } catch (error) {
      toast.error(`Delete failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  if (isLoading) return <div className="p-4">Loading branding settings...</div>

  return (
    <div className="space-y-6">
      {/* Hidden file inputs */}
      <input
        ref={logoLightRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect('logo_light_url')}
        className="hidden"
      />
      <input
        ref={logoDarkRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect('logo_dark_url')}
        className="hidden"
      />
      <input
        ref={faviconRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect('favicon_url')}
        className="hidden"
      />

      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              🎨
            </div>
            Branding & Identity
          </h2>
          <p className="text-sm text-muted-foreground">
            Customize your application&apos;s branding, logos, and color scheme
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Company Information */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Company Information</CardTitle>
              <div className="flex gap-2">
                {isEditingCompany ? (
                  <>
                    <Button variant="outline" size="sm" onClick={handleCancelCompanyEdit}>
                      Cancel
                    </Button>
                    <Button size="sm" onClick={handleSaveCompanyInfo}>Save</Button>
                  </>
                ) : (
                  <Button size="sm" onClick={() => setIsEditingCompany(true)}>
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="company_name">Company Name</Label>
              <Input
                id="company_name"
                value={companyInfo.company_name}
                onChange={(e) => setCompanyInfo(prev => ({ ...prev, company_name: e.target.value }))}
                disabled={!isEditingCompany}
                placeholder="Enter company name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="company_tagline">Company Tagline</Label>
              <Input
                id="company_tagline"
                value={companyInfo.company_tagline}
                onChange={(e) => setCompanyInfo(prev => ({ ...prev, company_tagline: e.target.value }))}
                disabled={!isEditingCompany}
                placeholder="Enter company tagline"
              />
            </div>

            <div className="space-y-3">
              <Label>Company Address</Label>
              {isEditingCompany ? (
                <div className="grid grid-cols-1 gap-3">
                  <Input
                    placeholder="Street Address"
                    value={companyInfo.company_address.street}
                    onChange={(e) => setCompanyInfo(prev => ({
                      ...prev,
                      company_address: { ...prev.company_address, street: e.target.value }
                    }))}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      placeholder="City"
                      value={companyInfo.company_address.city}
                      onChange={(e) => setCompanyInfo(prev => ({
                        ...prev,
                        company_address: { ...prev.company_address, city: e.target.value }
                      }))}
                    />
                    <Input
                      placeholder="State"
                      value={companyInfo.company_address.state}
                      onChange={(e) => setCompanyInfo(prev => ({
                        ...prev,
                        company_address: { ...prev.company_address, state: e.target.value }
                      }))}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      placeholder="Postcode"
                      value={companyInfo.company_address.postcode}
                      onChange={(e) => setCompanyInfo(prev => ({
                        ...prev,
                        company_address: { ...prev.company_address, postcode: e.target.value }
                      }))}
                    />
                    <Input
                      placeholder="Country"
                      value={companyInfo.company_address.country}
                      onChange={(e) => setCompanyInfo(prev => ({
                        ...prev,
                        company_address: { ...prev.company_address, country: e.target.value }
                      }))}
                    />
                  </div>
                </div>
              ) : (
                <div className="p-3 border rounded-md bg-muted/20">
                  {companyInfo.company_address.street || companyInfo.company_address.city ? (
                    <div className="space-y-1 text-sm">
                      {companyInfo.company_address.street && <div>{companyInfo.company_address.street}</div>}
                      <div>
                        {[companyInfo.company_address.city, companyInfo.company_address.state, companyInfo.company_address.postcode]
                          .filter(Boolean).join(', ')}
                      </div>
                      {companyInfo.company_address.country && <div>{companyInfo.company_address.country}</div>}
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-sm">No address set</span>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-3">
              <Label>Contact Information</Label>
              {isEditingCompany ? (
                <div className="space-y-2">
                  <Input
                    placeholder="Phone Number"
                    value={companyInfo.company_contact.phone}
                    onChange={(e) => setCompanyInfo(prev => ({
                      ...prev,
                      company_contact: { ...prev.company_contact, phone: e.target.value }
                    }))}
                  />
                  <Input
                    placeholder="Email Address"
                    value={companyInfo.company_contact.email}
                    onChange={(e) => setCompanyInfo(prev => ({
                      ...prev,
                      company_contact: { ...prev.company_contact, email: e.target.value }
                    }))}
                  />
                  <Input
                    placeholder="Website URL"
                    value={companyInfo.company_contact.website}
                    onChange={(e) => setCompanyInfo(prev => ({
                      ...prev,
                      company_contact: { ...prev.company_contact, website: e.target.value }
                    }))}
                  />
                </div>
              ) : (
                <div className="p-3 border rounded-md bg-muted/20">
                  {companyInfo.company_contact.phone || companyInfo.company_contact.email || companyInfo.company_contact.website ? (
                    <div className="space-y-1 text-sm">
                      {companyInfo.company_contact.phone && (
                        <div className="flex items-center gap-2">
                          <span>📞</span>
                          <span>{companyInfo.company_contact.phone}</span>
                        </div>
                      )}
                      {companyInfo.company_contact.email && (
                        <div className="flex items-center gap-2">
                          <span>✉️</span>
                          <span>{companyInfo.company_contact.email}</span>
                        </div>
                      )}
                      {companyInfo.company_contact.website && (
                        <div className="flex items-center gap-2">
                          <span>🌐</span>
                          <span>{companyInfo.company_contact.website}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-sm">No contact information set</span>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Logo Management & Brand Colors */}
        <Card>
          <CardHeader>
            <CardTitle>Visual Identity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Light Logo */}
            <div className="space-y-3">
              <Label>Light Mode Logo</Label>
              <div className="relative group">
                {visualSettings.logo_light_url ? (
                  <div className="relative border rounded-lg p-4 bg-white">
                    <img
                      src={visualSettings.logo_light_url}
                      alt="Light logo"
                      className="h-16 w-auto mx-auto object-contain"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 rounded-lg">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => logoLightRef.current?.click()}
                      >
                        <Upload className="w-4 h-4 mr-1" />
                        Replace
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleFileDelete(visualSettings.logo_light_url, 'logo_light_url')}
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Remove
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full h-24 border-dashed"
                    onClick={() => logoLightRef.current?.click()}
                  >
                    <Upload className="w-6 h-6 mr-2" />
                    Upload Light Logo
                  </Button>
                )}
              </div>
            </div>

            {/* Dark Logo */}
            <div className="space-y-3">
              <Label>Dark Mode Logo</Label>
              <div className="relative group">
                {visualSettings.logo_dark_url ? (
                  <div className="relative border rounded-lg p-4 bg-gray-900">
                    <img
                      src={visualSettings.logo_dark_url}
                      alt="Dark logo"
                      className="h-16 w-auto mx-auto object-contain"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 rounded-lg">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => logoDarkRef.current?.click()}
                      >
                        <Upload className="w-4 h-4 mr-1" />
                        Replace
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleFileDelete(visualSettings.logo_dark_url, 'logo_dark_url')}
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Remove
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full h-24 border-dashed"
                    onClick={() => logoDarkRef.current?.click()}
                  >
                    <Upload className="w-6 h-6 mr-2" />
                    Upload Dark Logo
                  </Button>
                )}
              </div>
            </div>

            {/* Bottom Row: Favicon + Brand Colors */}
            <div className="flex gap-8 items-start">
              {/* Favicon */}
              <div className="space-y-3">
                <Label>Favicon</Label>
                <div className="relative group">
                  {visualSettings.favicon_url ? (
                    <div className="relative border rounded-lg p-3 bg-white aspect-square w-16">
                      <img
                        src={visualSettings.favicon_url}
                        alt="Favicon"
                        className="w-full h-full object-contain"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1 rounded-lg">
                        <Button
                          size="sm"
                          variant="secondary"
                          className="p-1"
                          onClick={() => faviconRef.current?.click()}
                        >
                          <Upload className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="p-1"
                          onClick={() => handleFileDelete(visualSettings.favicon_url, 'favicon_url')}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      className="w-16 aspect-square border-dashed flex-col text-xs"
                      onClick={() => faviconRef.current?.click()}
                    >
                      <Upload className="w-4 h-4 mb-1" />
                      Upload
                    </Button>
                  )}
                </div>
              </div>

              {/* Brand Colors */}
              <div className="space-y-3 flex-1">
                <Label>Brand Colors</Label>
                <div className="flex gap-6">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-8 h-8 rounded border cursor-pointer flex-shrink-0"
                      style={{ backgroundColor: visualSettings.primary_color }}
                      onClick={() => document.getElementById('primary-color-input')?.click()}
                    />
                    <input
                      id="primary-color-input"
                      type="color"
                      value={visualSettings.primary_color}
                      onChange={(e) => handleColorChange('primary_color', e.target.value)}
                      className="sr-only"
                    />
                    <div>
                      <div className="text-sm font-medium">Primary</div>
                      <div className="text-xs text-muted-foreground">{visualSettings.primary_color}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-8 h-8 rounded border cursor-pointer flex-shrink-0"
                      style={{ backgroundColor: visualSettings.secondary_color }}
                      onClick={() => document.getElementById('secondary-color-input')?.click()}
                    />
                    <input
                      id="secondary-color-input"
                      type="color"
                      value={visualSettings.secondary_color}
                      onChange={(e) => handleColorChange('secondary_color', e.target.value)}
                      className="sr-only"
                    />
                    <div>
                      <div className="text-sm font-medium">Secondary</div>
                      <div className="text-xs text-muted-foreground">{visualSettings.secondary_color}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 