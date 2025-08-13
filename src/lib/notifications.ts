import { getServiceClient } from '@/lib/supabase/service'

export interface CreateNotificationInput {
  userId: string
  type: 'info' | 'success' | 'warning' | 'error' | 'system'
  title: string
  message: string
  link?: string
  meta?: Record<string, unknown>
}

export async function createNotificationForUser(input: CreateNotificationInput): Promise<string | null> {
  try {
    const supabase = getServiceClient()
    const { data, error } = await supabase
      .from('notifications')
      .insert({
        user_id: input.userId,
        type: input.type,
        title: input.title,
        message: input.message,
        link: input.link || null,
        meta: input.meta || {},
      })
      .select('id')
      .single()
    if (error) return null
    return data?.id ?? null
  } catch {
    return null
  }
}

export async function markAllNotificationsRead(userId: string): Promise<boolean> {
  try {
    const supabase = getServiceClient()
    const { error } = await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .is('read_at', null)
      .eq('user_id', userId)
    return !error
  } catch {
    return false
  }
}


