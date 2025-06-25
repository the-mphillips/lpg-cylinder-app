import { z } from 'zod'

export interface User {
  id: string
  username: string // Required field for dual login support
  email: string | null
  first_name: string | null
  last_name: string | null
  password_hash: string
  role: 'Super Admin' | 'Admin' | 'Authorised Signatory' | 'Tester'
  signature: string | null
  reset_password_token: string | null
  reset_password_expire: string | null
  is_active: boolean
  last_login_at: string | null
  phone: string | null
  department: string | null
  signature_path: string | null
  created_at: string
  updated_at: string
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

export interface MajorCustomer {
  id: string
  name: string
  contact_person: string | null
  email: string | null
  phone: string | null
  address: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface ActivityLog {
  id: string
  user_id: string
  action: string
  target_type: string | null
  target_id: string | null
  details: Record<string, unknown> | null
  ip_address: string | null
  user_agent: string | null
  created_at: string
}

export interface EmailLog {
  id: string
  user_id: string
  report_id: string | null
  recipient: string
  subject: string
  body: string
  status: 'pending' | 'sent' | 'failed'
  sent_at: string | null
  error_message: string | null
  created_at: string
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

export interface SystemLog {
  id: string
  level: 'debug' | 'info' | 'warning' | 'error' | 'critical'
  message: string
  component: string | null
  details: Record<string, unknown> | null
  created_at: string
}

// Role-based permission helpers
export const userRoleSchema = z.enum(['Super Admin', 'Admin', 'Authorised Signatory', 'Tester'])

export type UserRole = z.infer<typeof userRoleSchema>

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