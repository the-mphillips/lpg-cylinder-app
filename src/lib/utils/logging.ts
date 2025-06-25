import { getServiceClient } from '@/lib/supabase/service'

export type LogLevel = 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL'
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
 * Log a system event (for application-level events, errors, etc.)
 */
export async function logSystemEvent(
  level: LogLevel,
  message: string,
  module?: string
): Promise<void> {
  try {
    const supabase = getServiceClient()
    
    const { error } = await supabase
      .from('system_logs')
      .insert({
        level: level.toLowerCase(),
        message,
        module,
        created_at: new Date().toISOString()
      })

    if (error) {
      console.error('Failed to log system event:', error)
    }
  } catch (error) {
    console.error('Error in logSystemEvent:', error)
  }
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
  userEmail?: string
): Promise<void> {
  try {
    const supabase = getServiceClient()
    
    const { error } = await supabase
      .from('activity_logs')
      .insert({
        user_id: userId,
        action,
        resource_type: resourceType,
        resource_id: resourceId,
        details: details ? JSON.stringify(details) : null,
        created_at: new Date().toISOString()
      })

    if (error) {
      console.error('Failed to log user activity:', error)
      // Also log as system event if activity logging fails
      await logSystemEvent('ERROR', `Failed to log user activity: ${action} by ${userEmail || userId}`)
    }
  } catch (error) {
    console.error('Error in logUserActivity:', error)
  }
}

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
    new_value: newValue
  }

  if (request) {
    details.user_agent = request.headers.get('user-agent') || undefined
    details.ip_address = request.headers.get('x-forwarded-for') || 
                        request.headers.get('x-real-ip') || 
                        'unknown'
  }

  await logUserActivity(
    userId,
    'SETTINGS_UPDATE',
    'app_settings',
    `${category}.${key}`,
    details,
    userEmail
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
  const details: ActivityLogDetails = {
    file_type: fileType,
    file_name: fileName,
    file_path: filePath
  }

  if (request) {
    details.user_agent = request.headers.get('user-agent') || undefined
    details.ip_address = request.headers.get('x-forwarded-for') || 
                        request.headers.get('x-real-ip') || 
                        'unknown'
  }

  await logUserActivity(
    userId,
    'FILE_UPLOAD',
    'file',
    filePath,
    details,
    userEmail
  )

  await logSystemEvent(
    'INFO',
    `File uploaded: ${fileName} (${fileType}) by ${userEmail}`,
    'file_management'
  )
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
  const details: ActivityLogDetails = {
    file_type: fileType,
    file_name: fileName,
    file_path: filePath
  }

  if (request) {
    details.user_agent = request.headers.get('user-agent') || undefined
    details.ip_address = request.headers.get('x-forwarded-for') || 
                        request.headers.get('x-real-ip') || 
                        'unknown'
  }

  await logUserActivity(
    userId,
    'FILE_DELETE',
    'file',
    filePath,
    details,
    userEmail
  )

  await logSystemEvent(
    'INFO',
    `File deleted: ${fileName} (${fileType}) by ${userEmail}`,
    'file_management'
  )
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
  const details: ActivityLogDetails = {
    success: success.toString()
  }

  if (request) {
    details.user_agent = request.headers.get('user-agent') || undefined
    details.ip_address = request.headers.get('x-forwarded-for') || 
                        request.headers.get('x-real-ip') || 
                        'unknown'
  }

  await logUserActivity(
    userId || null,
    action,
    'auth',
    userEmail || 'unknown',
    details,
    userEmail
  )

  await logSystemEvent(
    success ? 'INFO' : 'WARNING',
    `${action} ${success ? 'successful' : 'failed'} for ${userEmail || 'unknown user'}`,
    'authentication'
  )
} 