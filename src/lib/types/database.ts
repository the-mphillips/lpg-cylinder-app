import { z } from 'zod'

// User role types that match the database enum
export type UserRole = 'Tester' | 'Admin' | 'Super Admin' | 'Authorised Signatory'

// User interface for consistent typing
export interface User {
  id: string
  username: string | null
  email: string | null
  first_name: string | null
  last_name: string | null
  phone: string | null
  department: string | null
  role: UserRole
  is_active: boolean
  created_at: string
  last_login_at: string | null
}

// App setting types
export interface AppSetting {
  id: string
  category: string
  key: string
  value: unknown
  data_type: 'string' | 'number' | 'boolean' | 'json'
  description: string | null
  created_at: string
  updated_at: string
}

// Email log types
export interface EmailLog {
  id: string
  recipient_email: string
  subject: string
  status: 'sent' | 'failed' | 'pending'
  sent_at: string | null
  error_message: string | null
  created_at: string
}

// System log types
export interface SystemLog {
  id: string
  level: 'info' | 'warning' | 'error' | 'debug'
  message: string
  module: string | null
  created_at: string
}

// Activity log types
export interface ActivityLog {
  id: string
  user_id: string | null
  action: string
  resource_type: string | null
  resource_id: string | null
  details: Record<string, unknown> | null
  created_at: string
}

// Branding settings interface
export interface BrandingSettings {
  company_name: string | null
  company_tagline: string | null
  primary_color: string | null
  secondary_color: string | null
  logo_light_url: string | null
  logo_dark_url: string | null
  favicon_url: string | null
}

// Major customer interface
export interface MajorCustomer {
  id: string
  name: string
  contact_person: string | null
  contact_email: string | null
  contact_phone: string | null
  address: string | null
  notes: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

// Authentication user permissions
export interface UserPermissions {
  isAdmin: boolean
  isSuperAdmin: boolean
  isSignatory: boolean
  isTester: boolean
}

export interface Report {
  id: string
  user_id: string
  major_customer_id: string | null
  report_number: number
  status: 'draft' | 'submitted' | 'approved' | 'rejected'
  test_date: string
  created_at: string
  updated_at: string
  customer: string
  address: string
  gas_supplier: string | null
  gas_type: string
  size: string
  cylinder_data: Record<string, unknown>
  tester_names: string
  approved_signatory: string | null
  vehicle_id: string
  work_order: string | null
  equipment_used: string | null
  images: string[] | null
  notes: string | null
}

export interface EmailSettings {
  id: string
  smtp_server: string
  smtp_port: number
  smtp_username: string
  smtp_password: string
  from_email: string
  from_name: string
  use_tls: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}

// Role-based permission helpers
export const userRoleSchema = z.enum(['Super Admin', 'Admin', 'Authorised Signatory', 'Tester'])

export interface RolePermissions {
  isSuperAdmin: boolean
  isAdmin: boolean
  isSignatory: boolean
  isTester: boolean
}

export interface UserForHeader {
  id: string
  username?: string | null
  displayName: string
  role: UserRole
  permissions: RolePermissions
}

export function getRolePermissions(role: UserRole): RolePermissions {
  const permissions: RolePermissions = {
    isSuperAdmin: false,
    isAdmin: false,
    isSignatory: false,
    isTester: false
  }

  switch (role) {
    case 'Super Admin':
      permissions.isSuperAdmin = true
      permissions.isAdmin = true
      permissions.isSignatory = true
      permissions.isTester = true
      break
    case 'Admin':
      permissions.isAdmin = true
      permissions.isSignatory = true
      break
    case 'Authorised Signatory':
      permissions.isSignatory = true
      break
    case 'Tester':
      permissions.isTester = true
      break
  }

  return permissions
}

export interface UserWithPermissions extends User {
  permissions: RolePermissions
}

export interface ReportWithDetails extends Report {
  major_customer?: MajorCustomer
  user?: User
  formatted_date: string
  status_display: string
}

// Form types
export interface CreateReportInput {
  customer: string
  address: string
  gas_supplier?: string
  gas_type: string
  size: string
  test_date: string
  tester_names: string
  vehicle_id: string
  cylinder_data: Record<string, unknown>
  work_order?: string
  major_customer_id?: string
  equipment_used?: string
  images?: string[]
  notes?: string
}

export interface UpdateReportInput extends Partial<CreateReportInput> {
  id: string
  status?: 'draft' | 'submitted' | 'approved' | 'rejected'
  approved_signatory?: string
}

export interface CreateUserInput {
  username: string
  email?: string
  first_name?: string
  last_name?: string
  password: string
  role: UserRole
  signature?: string
}

export interface UpdateUserInput extends Partial<Omit<CreateUserInput, 'password'>> {
  id: string
  password?: string
}

export { type CreateUserInput as UserInsert } 