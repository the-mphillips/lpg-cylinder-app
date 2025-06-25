'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Settings, Users, Mail, Activity, FileText, Building2, Save, Plus, Trash2, Edit, Palette, Search, Signature, Shield, MoreHorizontal, Eye, UserCheck, UserX } from 'lucide-react'
import { api } from '@/lib/trpc/client'
import { toast } from 'sonner'
import { UserEditModal } from '@/components/modals/user-edit-modal'
import { SignatureManagementModal } from '@/components/modals/signature-management-modal'
import { BrandingSettingsTab } from '@/components/branding-settings-tab'
import { UnifiedLogsTable } from '@/components/ui/unified-logs-table'
import { buildSignatureUrl } from '@/lib/supabase/storage'


// Helper function to get role color
function getRoleColor(role: string): string {
  const roleColors: Record<string, string> = {
    'Super Admin': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    'Admin': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    'Authorised Signatory': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    'Tester': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    'Viewer': 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
  }
  return roleColors[role] || 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
}

// App Settings Tab with edit mode functionality
function AppSettingsTab() {
  const { data: settings, isLoading, error, refetch } = api.admin.getAllAppSettings.useQuery()
  const updateSetting = api.admin.updateAppSetting.useMutation()
  const [editingSettings, setEditingSettings] = useState<Record<string, unknown>>({})
  const [editingCategories, setEditingCategories] = useState<Record<string, boolean>>({})

  // Group settings by category, excluding branding and email categories since they have dedicated tabs
  const settingsByCategory: Record<string, any[]> = {}
  if (Array.isArray(settings)) {
    settings.forEach((setting: any) => {
      // Skip branding and email settings as they have dedicated tabs
      if (setting.category === 'branding' || setting.category === 'email') {
        return
      }
      
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
                    </CardTitle>
                  </CardHeader>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-6">
                  <div className="flex justify-end mb-4">
                    {!isEditing ? (
                      <Button 
                        variant="outline"
                        onClick={() => handleStartCategoryEdit(category)}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                    ) : (
                      <div className="flex gap-2">
                        <Button 
                          onClick={() => handleSaveCategory(category)}
                          disabled={!hasChanges}
                        >
                          <Save className="h-4 w-4 mr-2" />
                          Save
                        </Button>
                        <Button 
                          variant="outline"
                          onClick={() => handleCancelCategoryEdit(category)}
                        >
                          Cancel
                        </Button>
                      </div>
                    )}
                  </div>
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
  const [userToDelete, setUserToDelete] = useState<any>(null)
  const [userToToggleStatus, setUserToToggleStatus] = useState<any>(null)
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [departmentFilter, setDepartmentFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
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
        signature: signaturePath === null ? undefined : signaturePath 
      })
      toast.success('Signature updated successfully')
      refetch()
    } catch (error: any) {
      toast.error(`Failed to update signature: ${error.message}`)
    }
  }

  const filteredUsers = users?.filter((user: any) => {
    const matchesSearch = user.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.username?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesRole = roleFilter === 'all' || user.role === roleFilter
    const matchesDepartment = departmentFilter === 'all' || user.department === departmentFilter
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && user.is_active) ||
      (statusFilter === 'inactive' && !user.is_active)
    
    return matchesSearch && matchesRole && matchesDepartment && matchesStatus
  }) || []

  // Get unique values for filter dropdowns
  const uniqueRoles = [...new Set(users?.map((user: any) => user.role).filter(Boolean))] || []
  const uniqueDepartments = [...new Set(users?.map((user: any) => user.department).filter(Boolean))] || []

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
    try {
      await deleteUser.mutateAsync({ id: userId })
      toast.success('User deleted successfully')
      setUserToDelete(null)
      refetch()
    } catch (error: any) {
      toast.error(`Failed to delete user: ${error.message}`)
    }
  }

  const handleToggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      await updateUser.mutateAsync({ 
        id: userId, 
        is_active: !currentStatus 
      })
      toast.success(`User ${!currentStatus ? 'activated' : 'deactivated'} successfully`)
      setUserToToggleStatus(null)
      refetch()
    } catch (error: any) {
      toast.error(`Failed to update user status: ${error.message}`)
    }
  }

  const isSignatory = (role: string) => {
    return ['Authorised Signatory', 'Admin', 'Super Admin'].includes(role)
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
          {/* Search and Filters */}
          <div className="flex items-center space-x-4 flex-wrap gap-2">
            <div className="flex items-center space-x-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
            </div>
            
            <select 
              value={roleFilter} 
              onChange={(e) => setRoleFilter(e.target.value)}
              className="rounded border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="all">All Roles</option>
              {uniqueRoles.map(role => (
                <option key={role} value={role}>{role}</option>
              ))}
            </select>
            
            <select 
              value={departmentFilter} 
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="rounded border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="all">All Departments</option>
              {uniqueDepartments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
            
            <select 
              value={statusFilter} 
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="all">All Status</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
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
                <TableHead>Signature</TableHead>
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
                    <Badge className={getRoleColor(user.role)}>{user.role}</Badge>
                  </TableCell>
                  <TableCell>{user.department || 'N/A'}</TableCell>
                  <TableCell>
                    {isSignatory(user.role) && user.signature ? (
                      <div className="flex items-center justify-center">
                        <button
                          onClick={() => setSelectedUserForSignature(user)}
                          className="group relative w-24 h-12 rounded hover:bg-gray-50 transition-colors"
                        >
                          <img
                            src={buildSignatureUrl(user.signature)}
                            alt={`${user.first_name} ${user.last_name}'s signature`}
                            className="w-full h-full object-contain"
                          />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded flex items-center justify-center">
                            <Eye className="h-3 w-3 text-white" />
                          </div>
                        </button>
                      </div>
                    ) : (
                      <span></span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant={user.is_active ? "default" : "secondary"}
                      className={user.is_active ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" : ""}
                    >
                      {user.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditingUser(user)}>
                          <Eye className="h-4 w-4 mr-2" />
                          View/Edit
                        </DropdownMenuItem>
                        {isSignatory(user.role) && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => setSelectedUserForSignature(user)}>
                              <Signature className="h-4 w-4 mr-2" />
                              Signature Management
                            </DropdownMenuItem>
                          </>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => setUserToToggleStatus(user)}
                          className={user.is_active ? "text-orange-600" : "text-green-600"}
                        >
                          {user.is_active ? (
                            <>
                              <UserX className="h-4 w-4 mr-2" />
                              Deactivate
                            </>
                          ) : (
                            <>
                              <UserCheck className="h-4 w-4 mr-2" />
                              Activate
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => setUserToDelete(user)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!userToDelete} onOpenChange={() => setUserToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {userToDelete?.first_name} {userToDelete?.last_name}? 
              This action cannot be undone and will permanently remove the user from the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => userToDelete && handleDeleteUser(userToDelete.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Status Toggle Confirmation Dialog */}
      <AlertDialog open={!!userToToggleStatus} onOpenChange={() => setUserToToggleStatus(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {userToToggleStatus?.is_active ? 'Deactivate' : 'Activate'} User
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to {userToToggleStatus?.is_active ? 'deactivate' : 'activate'} {userToToggleStatus?.first_name} {userToToggleStatus?.last_name}? 
              {userToToggleStatus?.is_active 
                ? ' This will prevent them from accessing the system.' 
                : ' This will restore their access to the system.'
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => userToToggleStatus && handleToggleUserStatus(userToToggleStatus.id, userToToggleStatus.is_active)}
            >
              {userToToggleStatus?.is_active ? 'Deactivate' : 'Activate'} User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// Email Settings Tab with edit mode
function EmailSettingsTab() {
  const { data: emailSettings, isLoading, refetch } = api.admin.getEmailSettings.useQuery()
  const { data: emailLogs, isLoading: loadingEmailLogs } = api.admin.getEmailLogs.useQuery({})
  const updateEmailSettings = api.admin.updateEmailSettings.useMutation()
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    smtp_server: '',
    smtp_port: 587,
    smtp_username: '',
    smtp_password: '',
    from_email: '',
    from_name: '',
    reply_to_email: '',
    email_signature: '',
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
    <div className="space-y-6">
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
                <Button onClick={handleSave} disabled={updateEmailSettings.isPending} className="btn-branded">
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
                <span className="text-sm">••••••••</span>
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

        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label className="font-medium">Reply-To Email</Label>
            {isEditing ? (
              <Input
                type="email"
                value={formData.reply_to_email}
                onChange={(e) => setFormData(prev => ({ ...prev, reply_to_email: e.target.value }))}
                placeholder="Optional reply-to address"
              />
            ) : (
              <div className="p-3 bg-muted rounded-md border">
                <span className="text-sm">{formData.reply_to_email || 'Not configured'}</span>
              </div>
            )}
          </div>
          <div className="space-y-2">
            <Label className="font-medium">Email Signature</Label>
            {isEditing ? (
              <Textarea
                value={formData.email_signature}
                onChange={(e) => setFormData(prev => ({ ...prev, email_signature: e.target.value }))}
                placeholder="Best regards,&#10;BWA GAS Team"
                rows={3}
              />
            ) : (
              <div className="p-3 bg-muted rounded-md border min-h-[76px]">
                <span className="text-sm whitespace-pre-line">{formData.email_signature || 'Not configured'}</span>
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

    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Email Logs
        </CardTitle>
        <CardDescription>History of sent emails and delivery status</CardDescription>
      </CardHeader>
      <CardContent>
        {loadingEmailLogs ? (
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
    </div>
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
  const { data: unifiedLogs, isLoading, refetch } = api.admin.getUnifiedLogs.useQuery({
    limit: 100
  })

  return (
    <div className="space-y-6">
      <UnifiedLogsTable 
        logs={unifiedLogs || []}
        isLoading={isLoading}
        title="Unified System Logs"
        onRefresh={refetch}
      />
    </div>
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
        <TabsList className="grid w-full grid-cols-6">
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
          <TabsTrigger value="customers" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">Customers</span>
          </TabsTrigger>
          <TabsTrigger value="system-logs" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            <span className="hidden sm:inline">System</span>
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

        <TabsContent value="customers">
          <MajorCustomersTab />
        </TabsContent>

        <TabsContent value="system-logs">
          <SystemLogsTab />
        </TabsContent>
      </Tabs>


    </div>
  )
} 