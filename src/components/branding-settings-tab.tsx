'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Edit, Upload, Trash2 } from 'lucide-react'
import { api } from '@/lib/trpc/client'
import { toast } from 'sonner'
import Image from 'next/image'

const defaultAddress = { street: '', city: '', state: '', postcode: '', country: '' }
const defaultContact = { phone: '', email: '', website: '' }
const defaultReportSettings = { 
  test_station_number: '871', 
  test_station_text: 'SAI GLOBAL APPROVED TEST STATION NO. 871',
  company_abn: '',
  company_phone: '',
  company_email: '',
  company_address_line1: '',
  company_address_line2: '',
  logo_url: '',
  mark_url: ''
}

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
  const [reportSettings, setReportSettings] = useState(defaultReportSettings)
  const [originalReportSettings, setOriginalReportSettings] = useState(defaultReportSettings)
  const [isEditingReports, setIsEditingReports] = useState(false)

  // File input refs
  const logoLightRef = useRef<HTMLInputElement>(null)
  const logoDarkRef = useRef<HTMLInputElement>(null)
  const faviconRef = useRef<HTMLInputElement>(null)
  const reportLogoRef = useRef<HTMLInputElement>(null)
  const reportMarkRef = useRef<HTMLInputElement>(null)

  // Mutations
  const { mutateAsync: updateSystemSetting } = api.admin.updateSystemSetting.useMutation()

  // Queries
  const { data: systemSettings, isLoading, refetch } = api.admin.getSystemSettings.useQuery()

  const normalizeAssetUrl = (url: string): string => {
    if (!url) return ''
    try {
      const currentHost = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL as string).hostname
      const parsed = new URL(url)
      if (parsed.hostname !== currentHost && parsed.hostname.endsWith('supabase.co')) {
        parsed.hostname = currentHost
        return parsed.toString()
      }
      return url
    } catch {
      return url
    }
  }

  const safeStringValue = (value: unknown): string => {
    if (value === null || value === undefined) return ''
    let str = typeof value === 'string' ? value : String(value)
    // Unwrap double-encoded JSON strings like "value"
    try {
      // unwrap repeatedly if necessary
      // limit to 3 iterations to avoid loops
      for (let i = 0; i < 3; i++) {
        if (str.length >= 2 && str.startsWith('"') && str.endsWith('"')) {
          str = JSON.parse(str)
        } else {
          break
        }
      }
    } catch {}
    return str
  }

  const safeObjectValue = <T extends Record<string, string>>(value: unknown, defaultValue: T): T => {
    if (!value) return defaultValue
    if (typeof value === 'object') return { ...defaultValue, ...(value as T) }
    try {
      let str = String(value)
      // unwrap if double-encoded
      for (let i = 0; i < 3; i++) {
        if (str.length >= 2 && str.startsWith('"') && str.endsWith('"')) {
          str = JSON.parse(str)
        } else {
          break
        }
      }
      const parsed = JSON.parse(str)
      return { ...defaultValue, ...parsed } as T
    } catch {
      return defaultValue
    }
  }

  useEffect(() => {
    if (systemSettings) {
      // Convert array of settings to object
      const settingsObj: Record<string, unknown> = {}
      systemSettings.forEach(setting => {
        settingsObj[setting.key] = setting.value
      })
      
      const newCompanyInfo = {
        company_name: safeStringValue(settingsObj.company_name),
        company_tagline: safeStringValue(settingsObj.company_tagline),
        company_address: safeObjectValue(settingsObj.company_address, defaultAddress),
        company_contact: safeObjectValue(settingsObj.company_contact, defaultContact)
      }
      
      const newVisualSettings = {
        primary_color: safeStringValue(settingsObj.primary_color) || '#3D3D3D',
        secondary_color: safeStringValue(settingsObj.secondary_color) || '#F79226',
        logo_light_url: normalizeAssetUrl(safeStringValue(settingsObj.logo_light_url)),
        logo_dark_url: normalizeAssetUrl(safeStringValue(settingsObj.logo_dark_url)),
        favicon_url: normalizeAssetUrl(safeStringValue(settingsObj.favicon_url))
      }
      
      setCompanyInfo(newCompanyInfo)
      setOriginalCompanyInfo(newCompanyInfo)
      setVisualSettings(newVisualSettings)
      
      // Load report settings
      const newReportSettings = {
        test_station_number: safeStringValue(settingsObj.test_station_number) || '871',
        test_station_text: safeStringValue(settingsObj.test_station_text) || 'SAI GLOBAL APPROVED TEST STATION NO. 871',
        company_abn: safeStringValue(settingsObj.company_abn),
        company_phone: safeStringValue(settingsObj.company_phone),
        company_email: safeStringValue(settingsObj.company_email),
        company_address_line1: safeStringValue(settingsObj.company_address_line1),
        company_address_line2: safeStringValue(settingsObj.company_address_line2),
        logo_url: normalizeAssetUrl(safeStringValue(settingsObj.logo_url)),
        mark_url: normalizeAssetUrl(safeStringValue(settingsObj.mark_url))
      }
      
      setReportSettings(newReportSettings)
      setOriginalReportSettings(newReportSettings)
    }
  }, [systemSettings])

  // Save only changed company information
  const handleSaveCompanyInfo = async () => {
    try {
      const updates = []
      
      // Only update fields that have actually changed
      if (companyInfo.company_name !== originalCompanyInfo.company_name) {
        updates.push(updateSystemSetting({
          key: 'company_name',
          value: JSON.stringify(companyInfo.company_name)
        }))
      }
      
      if (companyInfo.company_tagline !== originalCompanyInfo.company_tagline) {
        updates.push(updateSystemSetting({
          key: 'company_tagline',
          value: JSON.stringify(companyInfo.company_tagline)
        }))
      }
      
      if (JSON.stringify(companyInfo.company_address) !== JSON.stringify(originalCompanyInfo.company_address)) {
        updates.push(updateSystemSetting({
          key: 'company_address',
          value: JSON.stringify(companyInfo.company_address)
        }))
      }
      
      if (JSON.stringify(companyInfo.company_contact) !== JSON.stringify(originalCompanyInfo.company_contact)) {
        updates.push(updateSystemSetting({
          key: 'company_contact',
          value: JSON.stringify(companyInfo.company_contact)
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

  // Save only changed report settings
  const handleSaveReportSettings = async () => {
    try {
      const updates: Promise<unknown>[] = []
      
      // Only update fields that have actually changed
      Object.keys(reportSettings).forEach((key) => {
        const typedKey = key as keyof typeof reportSettings
        if (reportSettings[typedKey] !== originalReportSettings[typedKey]) {
          updates.push(updateSystemSetting({
            key: typedKey,
            value: JSON.stringify(reportSettings[typedKey])
          }))
        }
      })
      
      if (updates.length > 0) {
        await Promise.all(updates)
        toast.success('Report settings updated successfully')
        setOriginalReportSettings(reportSettings)
        refetch()
      } else {
        toast.info('No changes to save')
      }
      
      setIsEditingReports(false)
    } catch (error) {
      toast.error(`Failed to update report settings: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const handleCancelReportEdit = () => {
    setReportSettings(originalReportSettings)
    setIsEditingReports(false)
  }

  // Report file upload
  const handleReportFileUpload = async (file: File, settingKey: 'logo_url' | 'mark_url') => {
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', 'branding')
      formData.append('subType', settingKey === 'logo_url' ? 'report-logo' : 'report-mark')

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
        setReportSettings(prev => ({ 
          ...prev, 
          [settingKey]: result.url 
        }))
        
        toast.success(`Report ${settingKey === 'logo_url' ? 'logo' : 'mark'} uploaded successfully`)
        refetch()
      } else {
        toast.error(`Failed to upload: ${result.error}`)
      }
    } catch (error) {
      toast.error(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const handleReportFileSelect = (settingKey: 'logo_url' | 'mark_url') => (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      handleReportFileUpload(file, settingKey)
    }
  }

  const handleReportFileDelete = async (fileUrl: string, settingKey: 'logo_url' | 'mark_url') => {
    const fileType = settingKey === 'logo_url' ? 'report logo' : 'report mark'
    
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
        setReportSettings(prev => ({ 
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

  // Immediate color update
  const handleColorChange = async (colorType: 'primary_color' | 'secondary_color', color: string) => {
    try {
      setVisualSettings(prev => ({ ...prev, [colorType]: color }))
      
      await updateSystemSetting({
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
      <input
        ref={reportLogoRef}
        type="file"
        accept="image/*"
        onChange={handleReportFileSelect('logo_url')}
        className="hidden"
      />
      <input
        ref={reportMarkRef}
        type="file"
        accept="image/*"
        onChange={handleReportFileSelect('mark_url')}
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
                    <Image
                      src={visualSettings.logo_light_url}
                      alt="Light logo"
                      width={200}
                      height={64}
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
                    <Image
                      src={visualSettings.logo_dark_url}
                      alt="Dark logo"
                      width={200}
                      height={64}
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
                      <Image
                        src={visualSettings.favicon_url}
                        alt="Favicon"
                        width={64}
                        height={64}
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

      {/* Report Configuration */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Report Configuration</CardTitle>
            <div className="flex gap-2">
              {isEditingReports ? (
                <>
                  <Button variant="outline" size="sm" onClick={handleCancelReportEdit}>
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleSaveReportSettings}>Save</Button>
                </>
              ) : (
                <Button size="sm" onClick={() => setIsEditingReports(true)}>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Test Station Configuration */}
          <div className="space-y-4">
            <h4 className="font-medium">Test Station</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="test_station_number">Station Number</Label>
                <Input
                  id="test_station_number"
                  value={reportSettings.test_station_number}
                  onChange={(e) => setReportSettings(prev => ({ ...prev, test_station_number: e.target.value }))}
                  disabled={!isEditingReports}
                  placeholder="871"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="test_station_text">Station Description</Label>
                <Input
                  id="test_station_text"
                  value={reportSettings.test_station_text}
                  onChange={(e) => setReportSettings(prev => ({ ...prev, test_station_text: e.target.value }))}
                  disabled={!isEditingReports}
                  placeholder="SAI GLOBAL APPROVED TEST STATION NO. 871"
                />
              </div>
            </div>
          </div>

          {/* Company Information for Reports */}
          <div className="space-y-4">
            <h4 className="font-medium">Company Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="company_abn">ABN</Label>
                <Input
                  id="company_abn"
                  value={reportSettings.company_abn}
                  onChange={(e) => setReportSettings(prev => ({ ...prev, company_abn: e.target.value }))}
                  disabled={!isEditingReports}
                  placeholder="64 246 540 757"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company_phone">Phone</Label>
                <Input
                  id="company_phone"
                  value={reportSettings.company_phone}
                  onChange={(e) => setReportSettings(prev => ({ ...prev, company_phone: e.target.value }))}
                  disabled={!isEditingReports}
                  placeholder="1300 292 427"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company_email">Email</Label>
                <Input
                  id="company_email"
                  value={reportSettings.company_email}
                  onChange={(e) => setReportSettings(prev => ({ ...prev, company_email: e.target.value }))}
                  disabled={!isEditingReports}
                  placeholder="accounts@bwavic.com.au"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="company_address_line1">Address Line 1</Label>
                <Input
                  id="company_address_line1"
                  value={reportSettings.company_address_line1}
                  onChange={(e) => setReportSettings(prev => ({ ...prev, company_address_line1: e.target.value }))}
                  disabled={!isEditingReports}
                  placeholder="PO BOX 210"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company_address_line2">Address Line 2</Label>
                <Input
                  id="company_address_line2"
                  value={reportSettings.company_address_line2}
                  onChange={(e) => setReportSettings(prev => ({ ...prev, company_address_line2: e.target.value }))}
                  disabled={!isEditingReports}
                  placeholder="BUNYIP VIC 3815"
                />
              </div>
            </div>
          </div>

          {/* Visual Assets for Reports */}
          <div className="space-y-4">
            <h4 className="font-medium">Report Assets</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Report Logo */}
              <div className="space-y-3">
                <Label>Report Logo</Label>
                <div className="relative group">
                  {reportSettings.logo_url ? (
                    <div className="relative border rounded-lg p-4 bg-white">
                      <Image
                        src={reportSettings.logo_url}
                        alt="Report logo"
                        width={200}
                        height={64}
                        className="h-16 w-auto mx-auto object-contain"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 rounded-lg">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => reportLogoRef.current?.click()}
                        >
                          <Upload className="w-4 h-4 mr-1" />
                          Replace
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleReportFileDelete(reportSettings.logo_url, 'logo_url')}
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
                      onClick={() => reportLogoRef.current?.click()}
                    >
                      <Upload className="w-6 h-6 mr-2" />
                      Upload Report Logo
                    </Button>
                  )}
                </div>
              </div>

              {/* Report Mark */}
              <div className="space-y-3">
                <Label>Report Mark</Label>
                <div className="relative group">
                  {reportSettings.mark_url ? (
                    <div className="relative border rounded-lg p-4 bg-white">
                      <Image
                        src={reportSettings.mark_url}
                        alt="Report mark"
                        width={200}
                        height={64}
                        className="h-16 w-auto mx-auto object-contain"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 rounded-lg">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => reportMarkRef.current?.click()}
                        >
                          <Upload className="w-4 h-4 mr-1" />
                          Replace
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleReportFileDelete(reportSettings.mark_url, 'mark_url')}
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
                      onClick={() => reportMarkRef.current?.click()}
                    >
                      <Upload className="w-6 h-6 mr-2" />
                      Upload Report Mark
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 