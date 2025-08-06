import { getServiceClient } from '@/lib/supabase/service'

export type LogLevel = 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL'
export type LogType = 'system' | 'user_activity' | 'email' | 'auth' | 'security' | 'api' | 'file_operation'
export type ActivityAction = 
  | 'LOGIN' 
  | 'LOGOUT' 
  | 'SETTINGS_UPDATE' 
  | 'FILE_UPLOAD' 
  | 'FILE_DELETE'
  | 'USER_CREATE'
  | 'USER_UPDATE'
  | 'USER_DELETE'
  | 'REPORT_CREATE'
  | 'REPORT_UPDATE'
  | 'REPORT_DELETE'
  | 'REPORT_APPROVE'
  | 'EMAIL_SEND'
  | 'PASSWORD_CHANGE'
  | 'PROFILE_UPDATE'

export interface ActivityLogDetails {
  setting_category?: string
  setting_key?: string
  old_value?: string
  new_value?: string
  file_type?: string
  file_name?: string
  file_path?: string
  user_agent?: string
  ip_address?: string
  [key: string]: string | number | boolean | undefined
}

/**
 * Core unified logging function
 */
async function logToAuditTable(
  log_type: LogType,
  level: LogLevel,
  message: string,
  options?: {
    user_id?: string | null
    action?: ActivityAction
    resource_type?: string | null
    resource_id?: string | null
    details?: Record<string, unknown> | null
    error_details?: Record<string, unknown> | null
    email_to?: string[]
    email_subject?: string
    email_status?: string
    module?: string
    function_name?: string
    ip_address?: string
    user_agent?: string
    request_id?: string
  }
): Promise<void> {
  try {
    const supabase = getServiceClient()
    
    const logEntry = {
      log_type,
      level,
      message,
      user_id: options?.user_id || null,
      action: options?.action || null,
      resource_type: options?.resource_type || null,
      resource_id: options?.resource_id || null,
      details: options?.details || null,
      error_details: options?.error_details || null,
      email_to: options?.email_to || null,
      email_subject: options?.email_subject || null,
      email_status: options?.email_status || null,
      module: options?.module || null,
      function_name: options?.function_name || null,
      ip_address: options?.ip_address || null,
      user_agent: options?.user_agent || null,
      request_id: options?.request_id || null,
      created_at: new Date().toISOString()
    }

    const { error } = await supabase
      .from('audit_logs')
      .insert(logEntry)

    if (error) {
      console.error('Failed to log to audit table:', error)
    }
  } catch (error) {
    console.error('Error in logToAuditTable:', error)
  }
}

/**
 * Log a system event (for application-level events, errors, etc.)
 */
export async function logSystemEvent(
  level: LogLevel,
  message: string,
  module?: string,
  functionName?: string,
  errorDetails?: Record<string, unknown>
): Promise<void> {
  await logToAuditTable('system', level, message, {
    module,
    function_name: functionName,
    error_details: errorDetails
  })
}

/**
 * Log a user activity (for audit trail of user actions)
 */
export async function logUserActivity(
  userId: string | null,
  action: ActivityAction,
  resourceType?: string | null,
  resourceId?: string | null,
  details?: ActivityLogDetails | null,
  userEmail?: string,
  request?: Request
): Promise<void> {
  const ip_address = request ? 
    request.headers.get('x-forwarded-for') || 
    request.headers.get('x-real-ip') || 
    'unknown' : undefined

  const user_agent = request ? 
    request.headers.get('user-agent') || undefined : undefined

  await logToAuditTable('user_activity', 'INFO', `User action: ${action}`, {
    user_id: userId,
    action,
    resource_type: resourceType,
    resource_id: resourceId,
    details,
    ip_address,
    user_agent
  })
}

/**
 * Log authentication events
 */
export async function logAuthEvent(
  action: 'LOGIN' | 'LOGOUT',
  userId?: string,
  userEmail?: string,
  request?: Request,
  success: boolean = true
): Promise<void> {
  const ip_address = request ? 
    request.headers.get('x-forwarded-for') || 
    request.headers.get('x-real-ip') || 
    'unknown' : undefined

  const user_agent = request ? 
    request.headers.get('user-agent') || undefined : undefined

  const level: LogLevel = success ? 'INFO' : 'WARNING'
  const message = `${action} ${success ? 'successful' : 'failed'}${userEmail ? ` for ${userEmail}` : ''}`

  await logToAuditTable('auth', level, message, {
    user_id: userId,
    action: action as ActivityAction,
    resource_type: 'auth',
    details: { success, email: userEmail },
    ip_address,
    user_agent
  })
}

/**
 * Log email events
 */
export async function logEmailEvent(
  subject: string,
  recipients: string[],
  status: 'sent' | 'failed' | 'pending',
  userId?: string,
  errorDetails?: Record<string, unknown>
): Promise<void> {
  const level: LogLevel = status === 'failed' ? 'ERROR' : 'INFO'
  const message = `Email ${status}: ${subject} to ${recipients.length} recipient(s)`

  await logToAuditTable('email', level, message, {
    user_id: userId,
    action: 'EMAIL_SEND',
    email_to: recipients,
    email_subject: subject,
    email_status: status,
    error_details: status === 'failed' ? errorDetails : null
  })
}

/**
 * Log file operations
 */
export async function logFileOperation(
  action: 'upload' | 'delete' | 'update',
  fileName: string,
  fileType: string,
  filePath: string,
  userId: string,
  userEmail: string,
  request?: Request
): Promise<void> {
  const ip_address = request ? 
    request.headers.get('x-forwarded-for') || 
    request.headers.get('x-real-ip') || 
    'unknown' : undefined

  const user_agent = request ? 
    request.headers.get('user-agent') || undefined : undefined

  const actionMap = {
    upload: 'FILE_UPLOAD',
    delete: 'FILE_DELETE',
    update: 'FILE_UPDATE'
  } as const

  await logToAuditTable('file_operation', 'INFO', `File ${action}: ${fileName}`, {
    user_id: userId,
    action: actionMap[action] as ActivityAction,
    resource_type: 'file',
    resource_id: filePath,
    details: {
      file_type: fileType,
      file_name: fileName,
      file_path: filePath,
      user_email: userEmail
    },
    ip_address,
    user_agent
  })
}

/**
 * Log security events
 */
export async function logSecurityEvent(
  level: LogLevel,
  message: string,
  userId?: string,
  details?: Record<string, unknown>,
  request?: Request
): Promise<void> {
  const ip_address = request ? 
    request.headers.get('x-forwarded-for') || 
    request.headers.get('x-real-ip') || 
    'unknown' : undefined

  const user_agent = request ? 
    request.headers.get('user-agent') || undefined : undefined

  await logToAuditTable('security', level, message, {
    user_id: userId,
    details,
    ip_address,
    user_agent
  })
}

/**
 * Log API events
 */
export async function logApiEvent(
  level: LogLevel,
  message: string,
  endpoint: string,
  method: string,
  userId?: string,
  request?: Request,
  responseStatus?: number
): Promise<void> {
  const ip_address = request ? 
    request.headers.get('x-forwarded-for') || 
    request.headers.get('x-real-ip') || 
    'unknown' : undefined

  const user_agent = request ? 
    request.headers.get('user-agent') || undefined : undefined

  await logToAuditTable('api', level, message, {
    user_id: userId,
    resource_type: 'api_endpoint',
    resource_id: endpoint,
    details: {
      method,
      endpoint,
      response_status: responseStatus
    },
    ip_address,
    user_agent
  })
}

/**
 * Legacy function wrappers for backwards compatibility
 */

/**
 * Log settings updates with before/after values
 */
export async function logSettingsUpdate(
  userId: string,
  userEmail: string,
  category: string,
  key: string,
  oldValue: string,
  newValue: string,
  request?: Request
): Promise<void> {
  const details: ActivityLogDetails = {
    setting_category: category,
    setting_key: key,
    old_value: oldValue,
    new_value: newValue,
    user_email: userEmail
  }

  await logUserActivity(
    userId,
    'SETTINGS_UPDATE',
    'app_settings',
    `${category}.${key}`,
    details,
    userEmail,
    request
  )

  // Also log as system event for important settings changes
  if (['branding', 'email', 'security'].includes(category)) {
    await logSystemEvent(
      'INFO',
      `Settings updated: ${category}.${key} by ${userEmail}`,
      'settings'
    )
  }
}

/**
 * Log file upload activities
 */
export async function logFileUpload(
  userId: string,
  userEmail: string,
  fileType: string,
  fileName: string,
  filePath: string,
  request?: Request
): Promise<void> {
  await logFileOperation('upload', fileName, fileType, filePath, userId, userEmail, request)
}

/**
 * Log file deletion activities
 */
export async function logFileDelete(
  userId: string,
  userEmail: string,
  fileType: string,
  fileName: string,
  filePath: string,
  request?: Request
): Promise<void> {
  await logFileOperation('delete', fileName, fileType, filePath, userId, userEmail, request)
} 