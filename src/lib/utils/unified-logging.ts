/**
 * UNIFIED AUDIT LOGGING SYSTEM
 * 
 * This module provides comprehensive logging functionality for the LPG Cylinder app
 * using the new unified audit_logs table. It captures user activities, system events,
 * email logs, and more with rich metadata including IP addresses and user information.
 */

import { getServiceClient } from '@/lib/supabase/service'

export type LogLevel = 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL'

export type LogType = 
  | 'system' 
  | 'user_activity' 
  | 'email' 
  | 'auth' 
  | 'security' 
  | 'api' 
  | 'file_operation'

export interface AuditLogDetails {
  // Settings changes
  setting_category?: string
  setting_key?: string
  old_value?: string
  new_value?: string
  
  // File operations
  file_name?: string
  file_size?: number
  file_type?: string
  file_path?: string
  
  // Email details
  recipient?: string
  subject?: string
  status?: 'sent' | 'failed' | 'pending'
  error_message?: string
  
  // Authentication details
  login_method?: string
  failed_reason?: string
  
  // Request details
  user_agent?: string
  ip_address?: string
  request_path?: string
  request_method?: string
  
  // General metadata
  [key: string]: unknown
}

export interface AuditLogEntry {
  id?: string
  created_at?: string
  log_type: LogType
  level: LogLevel
  action: string
  message: string
  
  // User information
  user_id?: string | null
  user_email?: string | null
  user_name?: string | null
  user_role?: string | null
  session_id?: string | null
  
  // Network information
  ip_address?: string | null
  user_agent?: string | null
  request_method?: string | null
  request_path?: string | null
  request_headers?: Record<string, unknown> | null
  
  // Resource information
  resource_type?: string | null
  resource_id?: string | null
  resource_name?: string | null
  
  // Event details
  details?: AuditLogDetails | null
  
  // Additional metadata
  module?: string | null
  correlation_id?: string | null
  tenant_id?: string | null
  
  // Flags
  is_sensitive?: boolean
  is_system_generated?: boolean
  retention_days?: number
}

/**
 * Extract IP address from request headers
 */
function extractIpAddress(request?: Request): string | null {
  if (!request) return null
  
  // Try multiple headers in order of preference
  const headers = [
    'x-forwarded-for',
    'x-real-ip',
    'cf-connecting-ip', // Cloudflare
    'x-client-ip',
    'x-forwarded',
    'forwarded-for',
    'forwarded'
  ]
  
  for (const header of headers) {
    const value = request.headers.get(header)
    if (value) {
      // x-forwarded-for can contain multiple IPs, get the first one
      const ip = value.split(',')[0].trim()
      if (ip && ip !== 'unknown') {
        return ip
      }
    }
  }
  
  return null
}

/**
 * Extract user agent from request
 */
function extractUserAgent(request?: Request): string | null {
  if (!request) return null
  return request.headers.get('user-agent') || null
}

/**
 * Get current user information from session
 */
async function getCurrentUserInfo(userId?: string) {
  if (!userId) return {}
  
  try {
    const supabase = getServiceClient()
    const { data: user } = await supabase.auth.admin.getUserById(userId)
    
    if (user.user) {
      return {
        user_email: user.user.email,
        user_name: user.user.user_metadata?.full_name || null,
        user_role: user.user.user_metadata?.role || null
      }
    }
  } catch (error) {
    console.error('Failed to get user info for logging:', error)
  }
  
  return {}
}

/**
 * Core logging function - logs to the unified audit_logs table
 */
export async function createAuditLog(
  logEntry: AuditLogEntry,
  request?: Request
): Promise<string | null> {
  try {
    const supabase = getServiceClient()
    
    // Extract network information from request
    const ip_address = extractIpAddress(request)
    const user_agent = extractUserAgent(request)
    
    // Get user information if userId is provided
    const userInfo = logEntry.user_id ? await getCurrentUserInfo(logEntry.user_id) : {}
    
    // Prepare the log entry
    const auditLog = {
      ...logEntry,
      ip_address: logEntry.ip_address || ip_address,
      user_agent: logEntry.user_agent || user_agent,
      request_method: request?.method || null,
      request_path: request ? new URL(request.url).pathname : null,
      created_at: new Date().toISOString(),
      ...userInfo
    }
    
    const { data, error } = await supabase
      .from('audit_logs')
      .insert(auditLog)
      .select('id')
      .single()
    
    if (error) {
      console.error('Failed to create audit log:', error)
      return null
    }
    
    return data?.id || null
  } catch (error) {
    console.error('Error in createAuditLog:', error)
    return null
  }
}

/**
 * Log user activities with full context
 */
export async function logUserActivity(
  userId: string,
  action: string,
  message: string,
  options: {
    resourceType?: string
    resourceId?: string
    resourceName?: string
    details?: AuditLogDetails
    level?: LogLevel
    request?: Request
    correlationId?: string
  } = {}
): Promise<string | null> {
  return createAuditLog({
    log_type: 'user_activity',
    level: options.level || 'INFO',
    action,
    message,
    user_id: userId,
    resource_type: options.resourceType || null,
    resource_id: options.resourceId || null,
    resource_name: options.resourceName || null,
    details: options.details || null,
    correlation_id: options.correlationId || null,
    is_system_generated: false
  }, options.request)
}

/**
 * Log system events
 */
export async function logSystemEvent(
  level: LogLevel,
  message: string,
  options: {
    action?: string
    module?: string
    details?: AuditLogDetails
    correlationId?: string
  } = {}
): Promise<string | null> {
  return createAuditLog({
    log_type: 'system',
    level,
    action: options.action || 'system_event',
    message,
    module: options.module || null,
    details: options.details || null,
    correlation_id: options.correlationId || null,
    is_system_generated: true
  })
}

/**
 * Log authentication events
 */
export async function logAuthEvent(
  action: string,
  message: string,
  options: {
    userId?: string
    level?: LogLevel
    details?: AuditLogDetails
    request?: Request
  } = {}
): Promise<string | null> {
  return createAuditLog({
    log_type: 'auth',
    level: options.level || 'INFO',
    action,
    message,
    user_id: options.userId || null,
    details: options.details || null,
    is_system_generated: false
  }, options.request)
}

/**
 * Log email events
 */
export async function logEmailEvent(
  action: string,
  message: string,
  options: {
    userId?: string
    recipient?: string
    subject?: string
    status?: 'sent' | 'failed' | 'pending'
    errorMessage?: string
    details?: AuditLogDetails
    level?: LogLevel
  } = {}
): Promise<string | null> {
  const emailDetails: AuditLogDetails = {
    recipient: options.recipient,
    subject: options.subject,
    status: options.status || 'sent',
    error_message: options.errorMessage,
    ...options.details
  }
  
  return createAuditLog({
    log_type: 'email',
    level: options.level || (options.status === 'failed' ? 'ERROR' : 'INFO'),
    action,
    message,
    user_id: options.userId || null,
    resource_type: 'email',
    details: emailDetails,
    is_system_generated: false
  })
}

/**
 * Log file operations
 */
export async function logFileOperation(
  userId: string,
  action: string,
  fileName: string,
  options: {
    fileSize?: number
    fileType?: string
    filePath?: string
    details?: AuditLogDetails
    level?: LogLevel
    request?: Request
  } = {}
): Promise<string | null> {
  const fileDetails: AuditLogDetails = {
    file_name: fileName,
    file_size: options.fileSize,
    file_type: options.fileType,
    file_path: options.filePath,
    ...options.details
  }
  
  return createAuditLog({
    log_type: 'file_operation',
    level: options.level || 'INFO',
    action,
    message: `File ${action}: ${fileName}`,
    user_id: userId,
    resource_type: 'file',
    resource_name: fileName,
    details: fileDetails,
    is_system_generated: false
  }, options.request)
}

/**
 * Log settings updates with old/new values
 */
export async function logSettingsUpdate(
  userId: string,
  userEmail: string,
  category: string,
  key: string,
  oldValue: string,
  newValue: string,
  request?: Request
): Promise<string | null> {
  const details: AuditLogDetails = {
    setting_category: category,
    setting_key: key,
    old_value: oldValue,
    new_value: newValue
  }
  
  return logUserActivity(
    userId,
    'SETTINGS_UPDATE',
    `Updated setting ${category}.${key}`,
    {
      resourceType: 'app_settings',
      resourceId: `${category}.${key}`,
      resourceName: `${category} - ${key}`,
      details,
      request
    }
  )
}

/**
 * Log security events
 */
export async function logSecurityEvent(
  level: LogLevel,
  action: string,
  message: string,
  options: {
    userId?: string
    details?: AuditLogDetails
    request?: Request
  } = {}
): Promise<string | null> {
  return createAuditLog({
    log_type: 'security',
    level,
    action,
    message,
    user_id: options.userId || null,
    details: options.details || null,
    is_system_generated: false,
    is_sensitive: true // Security logs are sensitive by default
  }, options.request)
}

/**
 * Query audit logs with filtering and pagination
 */
export async function getAuditLogs(options: {
  logType?: LogType
  level?: LogLevel
  userId?: string
  action?: string
  startDate?: string
  endDate?: string
  search?: string
  limit?: number
  offset?: number
} = {}) {
  try {
    const supabase = getServiceClient()
    
    let query = supabase
      .from('audit_logs_with_users') // Use the view that includes user data
      .select('*')
      .order('created_at', { ascending: false })
    
    // Apply filters
    if (options.logType) {
      query = query.eq('log_type', options.logType)
    }
    if (options.level) {
      query = query.eq('level', options.level)
    }
    if (options.userId) {
      query = query.eq('user_id', options.userId)
    }
    if (options.action) {
      query = query.eq('action', options.action)
    }
    if (options.startDate) {
      query = query.gte('created_at', options.startDate)
    }
    if (options.endDate) {
      query = query.lte('created_at', options.endDate)
    }
    if (options.search) {
      query = query.textSearch('message', options.search)
    }
    
    // Apply pagination
    if (options.limit || options.offset) {
      const limit = options.limit || 50
      const offset = options.offset || 0
      query = query.range(offset, offset + limit - 1)
    }
    
    const { data, error } = await query
    
    if (error) {
      console.error('Failed to get audit logs:', error)
      return []
    }
    
    return data || []
  } catch (error) {
    console.error('Error in getAuditLogs:', error)
    return []
  }
}

/**
 * Generate a correlation ID for linking related events
 */
export function generateCorrelationId(): string {
  return crypto.randomUUID()
}

// Export commonly used actions for consistency
export const ACTIONS = {
  // Authentication
  LOGIN: 'login',
  LOGOUT: 'logout',
  LOGIN_FAILED: 'login_failed',
  PASSWORD_CHANGE: 'password_change',
  PASSWORD_RESET: 'password_reset',
  
  // User Management
  USER_CREATE: 'user_create',
  USER_UPDATE: 'user_update',
  USER_DELETE: 'user_delete',
  USER_ACTIVATE: 'user_activate',
  USER_DEACTIVATE: 'user_deactivate',
  
  // Settings
  SETTINGS_UPDATE: 'settings_update',
  BRANDING_UPDATE: 'branding_update',
  
  // File Operations
  FILE_UPLOAD: 'file_upload',
  FILE_DELETE: 'file_delete',
  FILE_DOWNLOAD: 'file_download',
  
  // Reports
  REPORT_CREATE: 'report_create',
  REPORT_UPDATE: 'report_update',
  REPORT_DELETE: 'report_delete',
  REPORT_APPROVE: 'report_approve',
  REPORT_SUBMIT: 'report_submit',
  
  // Email
  EMAIL_SENT: 'email_sent',
  EMAIL_FAILED: 'email_failed',
  
  // System
  SYSTEM_STARTUP: 'system_startup',
  SYSTEM_SHUTDOWN: 'system_shutdown',
  SYSTEM_ERROR: 'system_error',
  DATABASE_BACKUP: 'database_backup',
  MAINTENANCE_START: 'maintenance_start',
  MAINTENANCE_END: 'maintenance_end'
} as const 