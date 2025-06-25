'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Settings, Users, Mail, Activity, FileText, Shield, Building2, Save, Plus, Trash2, Edit, Palette, Search, Upload, Eye, Signature } from 'lucide-react'
import { api } from '@/lib/trpc/client'
import { toast } from 'sonner'
import { UserEditModal } from '@/components/modals/user-edit-modal'
import { SignatureManagementModal } from '@/components/modals/signature-management-modal'
import { BrandingSettingsTab } from '@/components/branding-settings-tab'

// App Settings Tab with edit mode functionality
function AppSettingsTab() {
  const { data: settings, isLoading, error, refetch } = api.admin.getAllAppSettings.useQuery()
  const updateSetting = api.admin.updateAppSetting.useMutation()
  const [editingSettings, setEditingSettings] = useState<Record<string, unknown>>({})
  const [editingCategories, setEditingCategories] = useState<Record<string, boolean>>({})

  // Group settings by category
  const settingsByCategory: Record<string, any[]> = {}
  if (Array.isArray(settings)) {
    settings.forEach((setting: any) => {
      if (!settingsByCategory[setting.category]) {
        settingsByCategory[setting.category] = []
      }
      settingsByCategory[setting.category].push(setting)
    })
  }

  const handleSettingChange = (id: string, value: unknown) => {
    setEditingSettings(prev => ({ ...prev, [id]: value }))
  }

  const handleSaveCategory = async (category: string) => {
    const categorySettings = settingsByCategory[category] || []
    const promises = categorySettings
      .filter(setting => editingSettings[setting.id] !== undefined)
      .map(setting => 
        updateSetting.mutateAsync({
          id: setting.id,
          value: editingSettings[setting.id]
        })
      )

    try {
      await Promise.all(promises)
      toast.success(`${category} settings updated successfully`)
      refetch()
      // Clear editing state for this category
      setEditingSettings(prev => {
        const newState = { ...prev }
        categorySettings.forEach(setting => {
          delete newState[setting.id]
        })
        return newState
      })
      setEditingCategories(prev => ({ ...prev, [category]: false }))
    } catch (error: any) {
      toast.error(`Failed to update ${category} settings: ${error.message}`)
    }
  }

  const handleCancelCategoryEdit = (category: string) => {
    const categorySettings = settingsByCategory[category] || []
    setEditingSettings(prev => {
      const newState = { ...prev }
      categorySettings.forEach(setting => {
        delete newState[setting.id]
      })
      return newState
    })
    setEditingCategories(prev => ({ ...prev, [category]: false }))
  }

  const handleStartCategoryEdit = (category: string) => {
    setEditingCategories(prev => ({ ...prev, [category]: true }))
  }

  const renderSettingDisplay = (setting: any, isEditing: boolean) => {
    const currentValue = editingSettings[setting.id] !== undefined 
      ? editingSettings[setting.id] 
      : setting.value

    const displayName = setting.key.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())

    if (setting.data_type === 'boolean') {
      return (
        <div className="flex items-center justify-between py-3">
          <div className="flex-1">
            <div className="font-medium">{displayName}</div>
            {setting.description && (
              <div className="text-sm text-muted-foreground">{setting.description}</div>
            )}
          </div>
          <div className="flex items-center">
            {isEditing ? (
              <Switch
                checked={currentValue as boolean}
                onCheckedChange={(checked) => handleSettingChange(setting.id, checked)}
              />
            ) : (
              <Badge variant={currentValue ? 'default' : 'secondary'}>
                {currentValue ? 'Enabled' : 'Disabled'}
              </Badge>
            )}
          </div>
        </div>
      )
    }

    return (
      <div className="py-3">
        <div className="flex items-center justify-between mb-2">
          <Label className="font-medium">{displayName}</Label>
        </div>
        {setting.description && (
          <div className="text-sm text-muted-foreground mb-2">{setting.description}</div>
        )}
        {isEditing ? (
          <Input
            value={typeof currentValue === 'object' ? JSON.stringify(currentValue) : String(currentValue)}
            onChange={(e) => {
              let value: unknown = e.target.value
              if (setting.data_type === 'number') {
                value = Number(e.target.value)
              } else if (setting.data_type === 'json') {
                try {
                  value = JSON.parse(e.target.value)
                } catch {
                  value = e.target.value // Keep as string if JSON parsing fails
                }
              }
              handleSettingChange(setting.id, value)
            }}
            className="w-full"
          />
        ) : (
          <div className="p-3 bg-muted rounded-md border">
            <span className="text-sm">
              {typeof currentValue === 'object' 
                ? JSON.stringify(currentValue, null, 2) 
                : String(currentValue) || 'Not set'}
            </span>
          </div>
        )}
      </div>
    )
  }

  if (isLoading) return <div className="p-4">Loading app settings...</div>
  if (error) return <div className="p-4 text-red-500">Error: {error.message}</div>

  return (
    <div className="space-y-6">
      <Accordion type="multiple" className="space-y-4">
        {Object.entries(settingsByCategory).map(([category, categorySettings]) => {
          const isEditing = editingCategories[category] || false
          const hasChanges = categorySettings.some((setting: any) => 
            editingSettings[setting.id] !== undefined
          )

          return (
            <AccordionItem key={category} value={category} className="border rounded-lg">
              <Card>
                <AccordionTrigger className="px-6 py-4 hover:no-underline">
                  <CardHeader className="p-0 flex-1">
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Settings className="h-5 w-5" />
                        {category.charAt(0).toUpperCase() + category.slice(1)} Settings
                      </div>
                      <div className="flex items-center gap-2">
                        {!isEditing ? (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleStartCategoryEdit(category)
                            }}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </Button>
                        ) : (
                          <div className="flex gap-2">
                            <Button 
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleSaveCategory(category)
                              }}
                              disabled={!hasChanges}
                            >
                              <Save className="h-4 w-4 mr-2" />
                              Save
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleCancelCategoryEdit(category)
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardTitle>
                  </CardHeader>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-6">
                  <div className="space-y-1 divide-y">
                    {categorySettings.map((setting: any) => (
                      <div key={setting.id}>
                        {renderSettingDisplay(setting, isEditing)}
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </Card>
            </AccordionItem>
          )
        })}
      </Accordion>
    </div>
  )
}

// User Management Tab with modal editing
function UserManagementTab() {
  const { data: users, isLoading, refetch } = api.admin.getAllUsers.useQuery()
  const updateUser = api.admin.updateUserProfile.useMutation()
  const createUser = api.admin.createUser.useMutation()
  const deleteUser = api.admin.deleteUser.useMutation()
  
  const [editingUser, setEditingUser] = useState<any>(null)
  const [selectedUserForSignature, setSelectedUserForSignature] = useState<any>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newUser, setNewUser] = useState({
    email: '',
    first_name: '',
    last_name: '',
    username: '',
    password_hash: '',
    phone: '',
    department: '',
    role: 'Tester' as const
  })

  const handleUpdateUser = async (userId: string, updates: any) => {
    try {
      await updateUser.mutateAsync({ id: userId, ...updates })
      toast.success('User updated successfully')
      setEditingUser(null)
      refetch()
    } catch (error: any) {
      toast.error(`Failed to update user: ${error.message}`)
    }
  }

  const handleSignatureUpdate = async (userId: string, signaturePath: string | null) => {
    try {
      await updateUser.mutateAsync({ 
        id: userId, 
        signature: signaturePath 
      })
      toast.success('Signature updated successfully')
      refetch()
    } catch (error: any) {
      toast.error(`Failed to update signature: ${error.message}`)
    }
  }

  const filteredUsers = users?.filter((user: any) =>
    user.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.username?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || []

  const handleCreateUser = async () => {
    try {
      await createUser.mutateAsync(newUser)
      toast.success('User created successfully')
      setNewUser({
        email: '',
        first_name: '',
        last_name: '',
        username: '',
        password_hash: '',
        phone: '',
        department: '',
        role: 'Tester'
      })
      setShowCreateForm(false)
      refetch()
    } catch (error: any) {
      toast.error(`Failed to create user: ${error.message}`)
    }
  }

  const handleDeleteUser = async (userId: string) => {
    if (confirm('Are you sure you want to delete this user?')) {
      try {
        await deleteUser.mutateAsync({ id: userId })
        toast.success('User deleted successfully')
        refetch()
      } catch (error: any) {
        toast.error(`Failed to delete user: ${error.message}`)
      }
    }
  }

  if (isLoading) return <div className="p-4">Loading users...</div>

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              User Management
            </div>
            <Button onClick={() => setShowCreateForm(!showCreateForm)}>
              <Plus className="h-4 w-4 mr-2" />
              Add User
            </Button>
          </CardTitle>
          <CardDescription>Manage system users, roles, and permissions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>

          {/* Create User Form */}
          {showCreateForm && (
            <Card>
              <CardHeader>
                <CardTitle>Create New User</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    placeholder="First Name"
                    value={newUser.first_name}
                    onChange={(e) => setNewUser(prev => ({ ...prev, first_name: e.target.value }))}
                  />
                  <Input
                    placeholder="Last Name"
                    value={newUser.last_name}
                    onChange={(e) => setNewUser(prev => ({ ...prev, last_name: e.target.value }))}
                  />
                  <Input
                    placeholder="Email"
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                  />
                  <Input
                    placeholder="Username"
                    value={newUser.username}
                    onChange={(e) => setNewUser(prev => ({ ...prev, username: e.target.value }))}
                  />
                  <Input
                    placeholder="Password"
                    type="password"
                    value={newUser.password_hash}
                    onChange={(e) => setNewUser(prev => ({ ...prev, password_hash: e.target.value }))}
                  />
                  <Select value={newUser.role} onValueChange={(value: any) => setNewUser(prev => ({ ...prev, role: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Tester">Tester</SelectItem>
                      <SelectItem value="Authorised Signatory">Authorised Signatory</SelectItem>
                      <SelectItem value="Admin">Admin</SelectItem>
                      <SelectItem value="Super Admin">Super Admin</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="Phone"
                    value={newUser.phone}
                    onChange={(e) => setNewUser(prev => ({ ...prev, phone: e.target.value }))}
                  />
                  <Input
                    placeholder="Department"
                    value={newUser.department}
                    onChange={(e) => setNewUser(prev => ({ ...prev, department: e.target.value }))}
                  />
                </div>
                <div className="flex gap-2 mt-4">
                  <Button onClick={handleCreateUser} disabled={createUser.isPending}>
                    <Save className="h-4 w-4 mr-2" />
                    Create User
                  </Button>
                  <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Users Table */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers?.map((user: any) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">
                    {user.first_name} {user.last_name}
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{user.role}</Badge>
                  </TableCell>
                  <TableCell>{user.department || 'N/A'}</TableCell>
                  <TableCell>
                    <Badge variant={user.is_active ? 'default' : 'secondary'}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingUser(user)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedUserForSignature(user)}
                      >
                        <Signature className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeleteUser(user.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modals */}
      <UserEditModal
        user={editingUser}
        isOpen={!!editingUser}
        onClose={() => setEditingUser(null)}
        onSave={handleUpdateUser}
      />

      <SignatureManagementModal
        user={selectedUserForSignature}
        isOpen={!!selectedUserForSignature}
        onClose={() => setSelectedUserForSignature(null)}
        onSignatureUpdate={handleSignatureUpdate}
      />
    </div>
  )
}

// Email Settings Tab with edit mode
function EmailSettingsTab() {
  const { data: emailSettings, isLoading, refetch } = api.admin.getEmailSettings.useQuery()
  const updateEmailSettings = api.admin.updateEmailSettings.useMutation()
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    smtp_server: '',
    smtp_port: 587,
    smtp_username: '',
    smtp_password: '',
    from_email: '',
    from_name: '',
    use_tls: true,
    use_ssl: false,
  })

  useEffect(() => {
    if (emailSettings) {
      setFormData(emailSettings)
    }
  }, [emailSettings])

  const handleSave = async () => {
    try {
      await updateEmailSettings.mutateAsync(formData)
      toast.success('Email settings updated successfully')
      setIsEditing(false)
      refetch()
    } catch (error: any) {
      toast.error(`Failed to update email settings: ${error.message}`)
    }
  }

  const handleCancel = () => {
    if (emailSettings) {
      setFormData(emailSettings)
    }
    setIsEditing(false)
  }

  const handleEdit = () => {
    setIsEditing(true)
  }

  if (isLoading) return <div className="p-4">Loading email settings...</div>

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Settings
          </div>
          {!isEditing ? (
            <Button onClick={handleEdit}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={updateEmailSettings.isPending}>
                <Save className="h-4 w-4 mr-2" />
                Save
              </Button>
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
            </div>
          )}
        </CardTitle>
        <CardDescription>Configure SMTP settings for system emails</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label className="font-medium">SMTP Server</Label>
            {isEditing ? (
              <Input
                value={formData.smtp_server}
                onChange={(e) => setFormData(prev => ({ ...prev, smtp_server: e.target.value }))}
                placeholder="smtp.gmail.com"
              />
            ) : (
              <div className="p-3 bg-muted rounded-md border">
                <span className="text-sm">{formData.smtp_server || 'Not configured'}</span>
              </div>
            )}
          </div>
          <div className="space-y-2">
            <Label className="font-medium">Port</Label>
            {isEditing ? (
              <Input
                type="number"
                value={formData.smtp_port}
                onChange={(e) => setFormData(prev => ({ ...prev, smtp_port: parseInt(e.target.value) }))}
              />
            ) : (
              <div className="p-3 bg-muted rounded-md border">
                <span className="text-sm">{formData.smtp_port}</span>
              </div>
            )}
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label className="font-medium">Username</Label>
            {isEditing ? (
              <Input
                value={formData.smtp_username}
                onChange={(e) => setFormData(prev => ({ ...prev, smtp_username: e.target.value }))}
              />
            ) : (
              <div className="p-3 bg-muted rounded-md border">
                <span className="text-sm">{formData.smtp_username || 'Not configured'}</span>
              </div>
            )}
          </div>
          <div className="space-y-2">
            <Label className="font-medium">Password</Label>
            {isEditing ? (
              <Input
                type="password"
                value={formData.smtp_password}
                onChange={(e) => setFormData(prev => ({ ...prev, smtp_password: e.target.value }))}
              />
            ) : (
              <div className="p-3 bg-muted rounded-md border">
                <span className="text-sm">{'••••••••' || 'Not configured'}</span>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label className="font-medium">From Email</Label>
            {isEditing ? (
              <Input
                type="email"
                value={formData.from_email}
                onChange={(e) => setFormData(prev => ({ ...prev, from_email: e.target.value }))}
              />
            ) : (
              <div className="p-3 bg-muted rounded-md border">
                <span className="text-sm">{formData.from_email || 'Not configured'}</span>
              </div>
            )}
          </div>
          <div className="space-y-2">
            <Label className="font-medium">From Name</Label>
            {isEditing ? (
              <Input
                value={formData.from_name}
                onChange={(e) => setFormData(prev => ({ ...prev, from_name: e.target.value }))}
              />
            ) : (
              <div className="p-3 bg-muted rounded-md border">
                <span className="text-sm">{formData.from_name || 'Not configured'}</span>
              </div>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-6 mt-6">
          <div className="flex items-center justify-between">
            <Label className="font-medium">Use TLS</Label>
            {isEditing ? (
              <Switch
                checked={formData.use_tls}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, use_tls: checked }))}
              />
            ) : (
              <Badge variant={formData.use_tls ? 'default' : 'secondary'}>
                {formData.use_tls ? 'Enabled' : 'Disabled'}
              </Badge>
            )}
          </div>
          <div className="flex items-center justify-between">
            <Label className="font-medium">Use SSL</Label>
            {isEditing ? (
              <Switch
                checked={formData.use_ssl}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, use_ssl: checked }))}
              />
            ) : (
              <Badge variant={formData.use_ssl ? 'default' : 'secondary'}>
                {formData.use_ssl ? 'Enabled' : 'Disabled'}
              </Badge>
            )}
          </div>
        </div>        
      </CardContent>
    </Card>
  )
}

// Placeholder tabs for existing functionality
function SignatoriesTestersTab() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Signatories & Testers
        </CardTitle>
        <CardDescription>Manage authorized signatories and testers</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8">
          <p className="text-muted-foreground">This functionality is now integrated into the Users tab.</p>
          <p className="text-sm text-muted-foreground mt-2">Use the signature management modal in the Users tab to manage user signatures.</p>
        </div>
      </CardContent>
    </Card>
  )
}

function MajorCustomersTab() {
  const { data: customers, isLoading } = api.admin.getAllCustomers.useQuery()
  
  if (isLoading) return <div className="p-4">Loading customers...</div>

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Major Customers
        </CardTitle>
        <CardDescription>Manage major customer accounts</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers?.map((customer: any) => (
              <TableRow key={customer.id}>
                <TableCell className="font-medium">{customer.name}</TableCell>
                <TableCell>{customer.contact_person || 'N/A'}</TableCell>
                <TableCell>{customer.contact_email || 'N/A'}</TableCell>
                <TableCell>
                  <Badge variant={customer.is_active ? 'default' : 'secondary'}>
                    {customer.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

function SystemLogsTab() {
  const { data: systemLogs, isLoading: loadingSystem } = api.admin.getSystemLogs.useQuery({})
  const { data: activityLogs, isLoading: loadingActivity } = api.admin.getActivityLogs.useQuery({})

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            System Logs
          </CardTitle>
          <CardDescription>Recent system events and error logs</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingSystem ? (
            <div>Loading system logs...</div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {systemLogs?.slice(0, 10).map((log: any) => (
                <div key={log.id} className="p-3 border rounded-md">
                  <div className="flex items-center justify-between">
                    <Badge variant={log.level === 'ERROR' ? 'destructive' : log.level === 'WARNING' ? 'default' : 'secondary'}>
                      {log.level}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {new Date(log.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm mt-1">{log.message}</p>
                  {log.module && (
                    <p className="text-xs text-muted-foreground">Module: {log.module}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            User Activity Logs
          </CardTitle>
          <CardDescription>Recent user actions and system activity</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingActivity ? (
            <div>Loading activity logs...</div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {activityLogs?.slice(0, 10).map((log: any) => (
                <div key={log.id} className="p-3 border rounded-md">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{log.action}</span>
                    <span className="text-sm text-muted-foreground">
                      {new Date(log.created_at).toLocaleString()}
                    </span>
                  </div>
                  {log.resource_type && (
                    <p className="text-xs text-muted-foreground">
                      Resource: {log.resource_type} {log.resource_id && `(${log.resource_id})`}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function EmailLogsTab() {
  const { data: emailLogs, isLoading } = api.admin.getEmailLogs.useQuery({})

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Email Logs
        </CardTitle>
        <CardDescription>History of sent emails and delivery status</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div>Loading email logs...</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Recipient</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Sent Date</TableHead>
                <TableHead>Error</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {emailLogs?.slice(0, 20).map((log: any) => (
                <TableRow key={log.id}>
                  <TableCell>{log.recipient_email}</TableCell>
                  <TableCell className="font-medium">{log.subject}</TableCell>
                  <TableCell>
                    <Badge variant={log.status === 'sent' ? 'default' : log.status === 'failed' ? 'destructive' : 'secondary'}>
                      {log.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {log.sent_at ? new Date(log.sent_at).toLocaleString() : 'N/A'}
                  </TableCell>
                  <TableCell className="max-w-xs truncate">
                    {log.error_message || 'N/A'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}

// Main Settings Page Component
export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('app-settings')

  // Handle URL parameters for direct tab access
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const tab = urlParams.get('tab')
    if (tab) {
      setActiveTab(tab)
    }
  }, [])

  const handleTabChange = (tab: string) => {
    setActiveTab(tab)
    // Update URL without page reload
    const url = new URL(window.location.href)
    url.searchParams.set('tab', tab)
    window.history.replaceState({}, '', url.toString())
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">System Settings</h1>
        <p className="text-muted-foreground">Comprehensive system configuration and administration</p>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList className="grid w-full grid-cols-8">
          <TabsTrigger value="app-settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">App Settings</span>
          </TabsTrigger>
          <TabsTrigger value="branding" className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            <span className="hidden sm:inline">Branding</span>
          </TabsTrigger>
          <TabsTrigger value="email" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            <span className="hidden sm:inline">Email</span>
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Users</span>
          </TabsTrigger>
          <TabsTrigger value="signatories" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Signatories</span>
          </TabsTrigger>
          <TabsTrigger value="customers" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">Customers</span>
          </TabsTrigger>
          <TabsTrigger value="system-logs" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            <span className="hidden sm:inline">System</span>
          </TabsTrigger>
          <TabsTrigger value="email-logs" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Email Logs</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="app-settings">
          <AppSettingsTab />
        </TabsContent>

        <TabsContent value="branding">
          <BrandingSettingsTab />
        </TabsContent>

        <TabsContent value="email">
          <EmailSettingsTab />
        </TabsContent>

        <TabsContent value="users">
          <UserManagementTab />
        </TabsContent>

        <TabsContent value="signatories">
          <SignatoriesTestersTab />
        </TabsContent>

        <TabsContent value="customers">
          <MajorCustomersTab />
        </TabsContent>

        <TabsContent value="system-logs">
          <SystemLogsTab />
        </TabsContent>

        <TabsContent value="email-logs">
          <EmailLogsTab />
        </TabsContent>
      </Tabs>
    </div>
  )
} 