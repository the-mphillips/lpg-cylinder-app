import { createTRPCRouter, authedProcedure, adminProcedure } from '@/lib/trpc/server'
import { z } from 'zod'
import { TRPCError } from '@trpc/server'

export const notificationsRouter = createTRPCRouter({
  list: authedProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).optional().default(20),
      offset: z.number().min(0).optional().default(0),
      unreadOnly: z.boolean().optional().default(false),
    }).optional())
    .query(async ({ ctx, input }) => {
      const { limit = 20, offset = 0, unreadOnly = false } = input || {}
      let query = ctx.supabase
        .from('notifications')
        .select('*')
        .eq('user_id', ctx.user.id)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)
      if (unreadOnly) query = query.is('read_at', null)
      const { data, error } = await query
      if (error) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to fetch notifications' })
      }
      const { count: unreadCount } = await ctx.supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', ctx.user.id)
        .is('read_at', null)
      return { items: data || [], unreadCount: unreadCount || 0 }
    }),

  markRead: authedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', input.id)
        .eq('user_id', ctx.user.id)
      if (error) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to mark as read' })
      }
      return { success: true }
    }),

  markAllRead: authedProcedure.mutation(async ({ ctx }) => {
    const { error } = await ctx.supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .is('read_at', null)
      .eq('user_id', ctx.user.id)
    if (error) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to mark all as read' })
    }
    return { success: true }
  }),

  create: adminProcedure
    .input(z.object({ userId: z.string(), type: z.enum(['info','success','warning','error','system']), title: z.string(), message: z.string(), link: z.string().optional(), meta: z.record(z.unknown()).optional() }))
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabaseService
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
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to create notification' })
      return { id: data?.id }
    }),

  getSettings: authedProcedure.query(async ({ ctx }) => {
    // Prefer users.notification_settings JSONB
    const { data: userRow } = await ctx.supabaseService
      .from('users')
      .select('notification_settings')
      .eq('id', ctx.user.id)
      .maybeSingle()
    const defaults = { mute_all: false, toast_enabled: true, email_enabled: false, types: { info: true, success: true, warning: true, error: true, system: true } }
    return (userRow?.notification_settings as any) || defaults
  }),

  updateSettings: authedProcedure
    .input(z.object({
      mute_all: z.boolean().optional(),
      toast_enabled: z.boolean().optional(),
      email_enabled: z.boolean().optional(),
      types: z.record(z.boolean()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Merge into users.notification_settings
      const { data: current } = await ctx.supabaseService
        .from('users')
        .select('notification_settings')
        .eq('id', ctx.user.id)
        .maybeSingle()
      const merged = { ...(current?.notification_settings || {}), ...input }
      const { error } = await ctx.supabaseService
        .from('users')
        .update({ notification_settings: merged, updated_at: new Date().toISOString() })
        .eq('id', ctx.user.id)
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to save notification settings' })
      return { success: true }
    }),
})


