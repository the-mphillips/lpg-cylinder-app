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
import { Settings, Users, Mail, Activity, Building2, Save, Plus, Trash2, Edit, Palette, Search, Signature, MoreHorizontal, Eye, UserCheck, UserX } from 'lucide-react'
import { api } from '@/lib/trpc/client'
import type { AppRouter } from "@/lib/trpc/routers/_app";
import { type inferRouterOutputs } from "@trpc/server";
import { toast } from 'sonner'
import { UserEditModal } from '@/components/modals/user-edit-modal'
import { SignatureManagementModal } from '@/components/modals/signature-management-modal'
import { BrandingSettingsTab } from '@/components/branding-settings-tab'
import { EquipmentSettingsTab } from '@/components/equipment-settings-tab'

import { UnifiedLogsTable } from '@/components/ui/unified-logs-table'
import Image from 'next/image'

// Component to handle async signature URL loading
function SignatureImage({ signaturePath, alt }: { signaturePath?: string, alt: string }) {
  const [src, setSrc] = useState<string>('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadSignatureUrl() {
      if (signaturePath) {
        try {
          // Get signed URL from API route
          const response = await fetch('/api/signature/url', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ signaturePath }),
          })
          
          if (response.ok) {
            const data = await response.json()
            setSrc(data.url)
          } else {
            console.error('Error loading signature URL:', response.statusText)
            setSrc('')
          }
        } catch (error) {
          console.error('Error loading signature:', error)
          setSrc('')
        }
      } else {
        setSrc('')
      }
      setLoading(false)
    }
    loadSignatureUrl()
  }, [signaturePath])

  if (loading) {
    return <div className="w-full h-full bg-gray-100 animate-pulse rounded" />
  }

  if (!src) {
    return <div className="w-full h-full bg-gray-50 flex items-center justify-center text-gray-400 text-xs">No signature</div>
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={200}
      height={100}
      className="w-full h-full object-contain"
    />
  )
}


type RouterOutputs = inferRouterOutputs<AppRouter>;
type User = RouterOutputs["admin"]["getAllUsers"][number];
type Customer = RouterOutputs["admin"]["getAllCustomers"][number];

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
  const { data: allSettings, isLoading: settingsLoading } = api.admin.getAllAppSettings.useQuery()
  const updateSetting = api.admin.updateAppSetting.useMutation()
  const [editingSettings, setEditingSettings] = useState<Record<string, unknown>>({})
  const [editingCategories, setEditingCategories] = useState<Record<string, boolean>>({})

  // Group settings by category
  const settingsByCategory: Record<string, RouterOutputs["admin"]["getAllAppSettings"][number][]> = {}
  allSettings?.forEach((setting) => {
    if (!settingsByCategory[setting.category]) {
      settingsByCategory[setting.category] = []
    }
    settingsByCategory[setting.category].push(setting)
  })

  // Debug logging
  console.log('AppSettingsTab - allSettings:', allSettings)
  console.log('AppSettingsTab - settingsByCategory:', settingsByCategory)
  console.log('AppSettingsTab - categories count:', Object.keys(settingsByCategory).length)

  const handleSettingChange = (id: string, value: unknown) => {
    setEditingSettings(prev => ({ ...prev, [id]: value }))
  }

  const handleSaveCategory = async (category: string) => {
    const categorySettings = settingsByCategory[category] || []
    const promises = categorySettings
      .filter(setting => editingSettings[setting.id] !== undefined)
      .map(setting => {
        return updateSetting.mutateAsync({
          key: setting.key,
          value: String(editingSettings[setting.id]),
          description: setting.description,
          category: setting.category
        })
      })

    try {
      await Promise.all(promises)
      toast.success(`${category} settings updated successfully`)
      // Clear editing state for this category
      setEditingSettings(prev => {
        const newState = { ...prev }
        categorySettings.forEach(setting => {
          delete newState[setting.id]
        })
        return newState
      })
      setEditingCategories(prev => ({ ...prev, [category]: false }))
    } catch (error) {
      const err = error as { message?: string };
      toast.error(`Failed to update ${category} settings: ${err.message}`)
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

  const renderSettingDisplay = (setting: RouterOutputs["admin"]["getAllAppSettings"][number], isEditing: boolean) => {
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

  if (settingsLoading) return <div className="p-4">Loading app settings...</div>

  return (
    <div className="space-y-6">
      <Accordion type="multiple" className="space-y-4">
        {Object.entries(settingsByCategory).map(([category, categorySettings]) => {
          const isEditing = editingCategories[category] || false
          const hasChanges = categorySettings.some((setting) => 
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
                    {categorySettings.map((setting) => (
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
  const updateUser = api.admin.updateUser.useMutation()
  const createUser = api.admin.createUser.useMutation()
  const deleteUser = api.admin.deleteUser.useMutation()
  const updateUserSignature = api.admin.updateUserSignature.useMutation()
  
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [selectedUserForSignature, setSelectedUserForSignature] = useState<User | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [userToDelete, setUserToDelete] = useState<User | null>(null)
  const [userToToggleStatus, setUserToToggleStatus] = useState<User | null>(null)
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [departmentFilter, setDepartmentFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    username: '',
    phone: '',
    department: '',
    role: 'Tester' as const
  })

  const handleUpdateUser = async (userId: string, updates: Partial<User>) => {
    try {
      await updateUser.mutateAsync({ id: userId, ...updates })
      toast.success('User updated successfully')
      setEditingUser(null)
      refetch()
    } catch (error) {
      const err = error as { message?: string };
      toast.error(`Failed to update user: ${err.message}`)
    }
  }

  const handleSignatureUpdate = async (userId: string, signaturePath: string | null) => {
    try {
      await updateUserSignature.mutateAsync({
        id: userId,
        signature: signaturePath
      })
      toast.success('Signature updated successfully')
      refetch()
    } catch (error) {
      const err = error as { message?: string };
      toast.error(`Failed to update signature: ${err.message}`)
    }
  }

  const filteredUsers = users?.filter((user) => {
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
  const uniqueRoles = [...new Set(users?.map((user) => user.role).filter(Boolean))]
  const uniqueDepartments = [...new Set(users?.map((user) => user.department).filter(Boolean))]

  const handleCreateUser = async () => {
    try {
      await createUser.mutateAsync(newUser)
      toast.success('User created successfully')
      setNewUser({
        email: '',
        password: '',
        first_name: '',
        last_name: '',
        username: '',
        phone: '',
        department: '',
        role: 'Tester'
      })
      setShowCreateForm(false)
      refetch()
    } catch (error) {
      const err = error as { message?: string };
      toast.error(`Failed to create user: ${err.message}`)
    }
  }

  const handleDeleteUser = async (userId: string) => {
    try {
      await deleteUser.mutateAsync({ id: userId })
      toast.success('User deleted successfully')
      setUserToDelete(null)
      refetch()
    } catch (error) {
      const err = error as { message?: string };
      toast.error(`Failed to delete user: ${err.message}`)
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
    } catch (error) {
      const err = error as { message?: string };
      toast.error(`Failed to update user status: ${err.message}`)
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
                    value={newUser.password}
                    onChange={(e) => setNewUser(prev => ({ ...prev, password: e.target.value }))}
                  />
                  <Select value={newUser.role} onValueChange={(value: User['role']) => setNewUser(prev => ({ ...prev, role: value ?? 'Tester' }))}>
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
              {filteredUsers?.map((user) => (
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
                                                      <SignatureImage signaturePath={user.signature} alt={`${user.first_name} ${user.last_name}'s signature`} />
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
  const { data: logs, isLoading: loadingLogs } = api.admin.getLogs.useQuery({ 
    logType: 'email',
    limit: 20 
  })
  const updateEmailSetting = api.admin.updateEmailSetting.useMutation()
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    smtp_host: '',
    smtp_port: 587,
    smtp_username: '',
    smtp_password: '',
    from_email: '',
    from_name: '',
    reply_to_email: '',
    email_signature: '',
    use_tls: true,
    use_ssl: false,
    is_enabled: true,
    subject_prefix: '',
  })

  useEffect(() => {
    if (emailSettings) {
      // Convert array of settings to object
      const settingsObj: Record<string, unknown> = {}
      emailSettings.forEach(setting => {
        settingsObj[setting.key] = setting.value
      })
      
      setFormData({
        smtp_host: String(settingsObj.smtp_host || ''),
        smtp_port: Number(settingsObj.smtp_port) || 587,
        smtp_username: String(settingsObj.smtp_username || ''),
        smtp_password: String(settingsObj.smtp_password || ''),
        from_email: String(settingsObj.from_email || ''),
        from_name: String(settingsObj.from_name || ''),
        reply_to_email: String(settingsObj.reply_to_email || ''),
        email_signature: String(settingsObj.email_signature || ''),
        use_tls: settingsObj.use_tls === 'true' || settingsObj.use_tls === true,
        use_ssl: settingsObj.use_ssl === 'true' || settingsObj.use_ssl === true,
        is_enabled: settingsObj.is_enabled !== 'false' && settingsObj.is_enabled !== false,
        subject_prefix: String(settingsObj.subject_prefix || ''),
      })
    }
  }, [emailSettings])

  const handleSave = async () => {
    try {
      // Update each setting individually
      const updatePromises = Object.entries(formData).map(([key, value]) =>
        updateEmailSetting.mutateAsync({
          key,
          value: String(value),
          description: `Email setting: ${key}`
        })
      )
      
      await Promise.all(updatePromises)
      toast.success('Email settings updated successfully')
      setIsEditing(false)
      refetch()
    } catch (error) {
      const err = error as { message?: string };
      toast.error(`Failed to update email settings: ${err.message}`)
    }
  }

  const handleCancel = () => {
    if (emailSettings) {
      // Reset form data to original values
      const settingsObj: Record<string, unknown> = {}
      emailSettings.forEach(setting => {
        settingsObj[setting.key] = setting.value
      })
      
      setFormData({
        smtp_host: String(settingsObj.smtp_host || ''),
        smtp_port: Number(settingsObj.smtp_port) || 587,
        smtp_username: String(settingsObj.smtp_username || ''),
        smtp_password: String(settingsObj.smtp_password || ''),
        from_email: String(settingsObj.from_email || ''),
        from_name: String(settingsObj.from_name || ''),
        reply_to_email: String(settingsObj.reply_to_email || ''),
        email_signature: String(settingsObj.email_signature || ''),
        use_tls: settingsObj.use_tls === 'true' || settingsObj.use_tls === true,
        use_ssl: settingsObj.use_ssl === 'true' || settingsObj.use_ssl === true,
        is_enabled: settingsObj.is_enabled !== 'false' && settingsObj.is_enabled !== false,
        subject_prefix: String(settingsObj.subject_prefix || ''),
      })
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
                <Button onClick={handleSave} disabled={updateEmailSetting.isPending} className="btn-branded">
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
                value={formData.smtp_host}
                onChange={(e) => setFormData(prev => ({ ...prev, smtp_host: e.target.value }))}
                placeholder="smtp.gmail.com"
              />
            ) : (
              <div className="p-3 bg-muted rounded-md border">
                <span className="text-sm">{formData.smtp_host || 'Not configured'}</span>
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
          <Mail className="h-5 w-5" />
          Email Logs
        </CardTitle>
        <CardDescription>History of sent emails and delivery status</CardDescription>
      </CardHeader>
      <CardContent>
        {loadingLogs ? (
          <div>Loading email logs...</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Action</TableHead>
                <TableHead>Message</TableHead>
                <TableHead>Level</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs?.slice(0, 20).map((log: RouterOutputs["admin"]["getLogs"][number]) => (
                <TableRow key={log.id}>
                  <TableCell>{log.action}</TableCell>
                  <TableCell className="font-medium">{log.message}</TableCell>
                  <TableCell>
                    <Badge variant={log.level === 'ERROR' ? 'destructive' : log.level === 'WARN' ? 'secondary' : 'default'}>
                      {log.level}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {log.created_at ? new Date(log.created_at).toLocaleString() : 'N/A'}
                  </TableCell>
                  <TableCell className="max-w-xs truncate">
                    {log.details ? JSON.stringify(log.details).substring(0, 100) + '...' : 'N/A'}
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
function MajorCustomersTab() {
  const { data: customers, isLoading, refetch } = api.admin.getAllCustomers.useQuery()
  const createCustomer = api.admin.createCustomer.useMutation()
  const updateCustomer = api.admin.updateCustomer.useMutation()
  const deleteCustomer = api.admin.deleteCustomer.useMutation()

  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Customer | null>(null)
  const [form, setForm] = useState({
    name: '',
    contact_person: '',
    contact_email: '',
    contact_phone: '',
    address: '',
    billing_address: '',
    website: '',
    is_active: true,
  })

  useEffect(() => {
    if (editing) {
      setForm({
        name: editing.name || '',
        contact_person: editing.contact_person || '',
        contact_email: editing.contact_email || '',
        contact_phone: editing.contact_phone || '',
        address: editing.address || '',
        billing_address: editing.billing_address || '',
        website: editing.website || '',
        is_active: Boolean(editing.is_active),
      })
      setShowForm(true)
    }
  }, [editing])

  const handleSubmit = async () => {
    try {
      if (!form.name.trim()) {
        toast.error('Customer name is required')
        return
      }

      if (editing) {
        await updateCustomer.mutateAsync({
          id: editing.id,
          name: form.name,
          contact_person: form.contact_person || undefined,
          contact_email: form.contact_email || undefined,
          contact_phone: form.contact_phone || undefined,
          address: form.address || undefined,
          billing_address: form.billing_address || undefined,
          website: form.website || undefined,
          is_active: form.is_active,
        })
        toast.success('Customer updated')
      } else {
        await createCustomer.mutateAsync({
          name: form.name,
          contact_person: form.contact_person || undefined,
          contact_email: form.contact_email || undefined,
          contact_phone: form.contact_phone || undefined,
          address: form.address || undefined,
          billing_address: form.billing_address || undefined,
          website: form.website || undefined,
        })
        toast.success('Customer created')
      }
      setShowForm(false)
      setEditing(null)
      setForm({
        name: '', contact_person: '', contact_email: '', contact_phone: '', address: '', billing_address: '', website: '', is_active: true,
      })
      await refetch()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to save customer')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this customer?')) return
    try {
      await deleteCustomer.mutateAsync({ id })
      toast.success('Customer deleted')
      await refetch()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete customer')
    }
  }

  if (isLoading) return <div className="p-4">Loading customers...</div>

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Major Customers
          </span>
          <Button onClick={() => { setEditing(null); setShowForm(true) }}>
            <Plus className="h-4 w-4 mr-2" />
            Add Customer
          </Button>
        </CardTitle>
        <CardDescription>Manage major customer accounts</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {showForm && (
          <div className="border rounded-md p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Name</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Customer name" />
              </div>
              <div>
                <Label>Contact Person</Label>
                <Input value={form.contact_person} onChange={(e) => setForm({ ...form, contact_person: e.target.value })} placeholder="Contact person" />
              </div>
              <div>
                <Label>Contact Email</Label>
                <Input type="email" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} placeholder="email@example.com" />
              </div>
              <div>
                <Label>Contact Phone</Label>
                <Input value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} placeholder="Phone" />
              </div>
              <div>
                <Label>Address</Label>
                <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Address" />
              </div>
              <div>
                <Label>Billing Address</Label>
                <Input value={form.billing_address} onChange={(e) => setForm({ ...form, billing_address: e.target.value })} placeholder="Billing address" />
              </div>
              <div>
                <Label>Website</Label>
                <Input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="https://..." />
              </div>
              <div className="flex items-center gap-2">
                <Switch id="active" checked={form.is_active} onCheckedChange={(checked) => setForm({ ...form, is_active: checked })} />
                <Label htmlFor="active">Active</Label>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSubmit} disabled={createCustomer.isPending || updateCustomer.isPending}>
                <Save className="h-4 w-4 mr-2" />
                {editing ? 'Save Changes' : 'Create'}
              </Button>
              <Button variant="secondary" onClick={() => { setShowForm(false); setEditing(null) }}>Cancel</Button>
            </div>
          </div>
        )}

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[140px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers?.map((customer: Customer) => (
              <TableRow key={customer.id}>
                <TableCell className="font-medium">{customer.name}</TableCell>
                <TableCell>{customer.contact_person || 'N/A'}</TableCell>
                <TableCell>{customer.contact_email || 'N/A'}</TableCell>
                <TableCell>
                  <Badge variant={customer.is_active ? 'default' : 'secondary'}>
                    {customer.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setEditing(customer)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDelete(customer.id)}>
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
  )
}

function SystemLogsTab() {
  const { data: unifiedLogs, isLoading, refetch } = api.admin.getLogs.useQuery({
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
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="app-settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">App Settings</span>
          </TabsTrigger>
          <TabsTrigger value="branding" className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            <span className="hidden sm:inline">Branding</span>
          </TabsTrigger>
          <TabsTrigger value="equipment" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Equipment</span>
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

        <TabsContent value="equipment">
          <EquipmentSettingsTab />
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