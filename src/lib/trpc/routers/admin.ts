import { z } from 'zod'
import { authedProcedure, adminProcedure, createTRPCRouter } from '../server'
import { TRPCError } from '@trpc/server'
import { logSettingsUpdate } from '@/lib/utils/unified-logging'

// Helper function to get descriptions for email settings
function getEmailSettingDescription(key: string): string {
  const descriptions: Record<string, string> = {
    smtp_host: 'SMTP server hostname',
    smtp_port: 'SMTP server port',
    smtp_username: 'SMTP authentication username',
    smtp_password: 'SMTP authentication password (encrypted)',
    from_email: 'Default sender email address',
    from_name: 'Default sender name',
    reply_to_email: 'Reply-to email address',
    email_signature: 'Email signature template',
    use_tls: 'Enable TLS encryption',
    use_ssl: 'Enable SSL encryption',
    is_enabled: 'Enable/disable email functionality',
    subject_prefix: 'Email subject prefix'
  }
  return descriptions[key] || `Email setting: ${key}`
}

export const adminRouter = createTRPCRouter({
  // User Management
  getAllUsers: adminProcedure.query(async ({ ctx }) => {
    const { data, error } = await ctx.supabaseService
      .from('users')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
    }

    return data
  }),

  updateUser: adminProcedure
    .input(z.object({
      id: z.string().uuid(),
      email: z.string().email().optional(),
      first_name: z.string().optional(),
      last_name: z.string().optional(),
      username: z.string().optional(),
      phone: z.string().optional(),
      department: z.string().optional(),
      role: z.enum(['User', 'Admin', 'Super Admin']).optional(),
      is_active: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { id, ...updateData } = input

      const { data, error } = await ctx.supabaseService
        .from('users')
        .update({
          ...updateData,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      }

      return data
    }),

  createUser: adminProcedure
    .input(z.object({
      email: z.string().email(),
      first_name: z.string().min(1),
      last_name: z.string().min(1),
      username: z.string().min(1),
      password_hash: z.string().min(1), // Should be hashed on frontend
      phone: z.string().optional(),
      department: z.string().optional(),
      role: z.enum(['Tester', 'Admin', 'Super Admin', 'Authorised Signatory']).default('Tester'),
    }))
    .mutation(async ({ input, ctx }) => {
      const { data, error } = await ctx.supabaseService
        .from('users')
        .insert(input)
        .select()
        .single()

      if (error) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      }

      return data
    }),

  deleteUser: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      const { error } = await ctx.supabaseService
        .from('users')
        .delete()
        .eq('id', input.id)

      if (error) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      }

      return { success: true }
    }),

  // Signatories & Testers Management (from users table by role)
  getSignatories: authedProcedure.query(async ({ ctx }) => {
    const { data, error } = await ctx.supabaseService
      .from('users')
      .select('id, first_name, last_name, email, signature, signature_path, is_active, role')
      .in('role', ['Admin', 'Super Admin', 'Authorised Signatory']) // Signatories are admins or authorized signatories
      .eq('is_active', true)
      .order('first_name', { ascending: true })

    if (error) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
    }

    return data?.map(user => ({
      ...user,
      name: `${user.first_name} ${user.last_name}`,
    })) || []
  }),

  getTesters: authedProcedure.query(async ({ ctx }) => {
    const { data, error } = await ctx.supabaseService
      .from('users')
      .select('id, first_name, last_name, email, department, is_active, role')
      .in('role', ['Tester', 'Admin', 'Super Admin', 'Authorised Signatory']) // All users can be testers
      .eq('is_active', true)
      .order('first_name', { ascending: true })

    if (error) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
    }

    return data?.map(user => ({
      ...user,
      name: `${user.first_name} ${user.last_name}`,
    })) || []
  }),

  // Major Customers Management
  getAllCustomers: authedProcedure.query(async ({ ctx }) => {
    const { data, error } = await ctx.supabaseService
      .from('major_customers')
      .select('*')
      .order('name', { ascending: true })

    if (error) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
    }

    return data
  }),

  createCustomer: adminProcedure
    .input(z.object({
      name: z.string().min(1),
      contact_email: z.string().email().optional(),
      contact_phone: z.string().optional(),
      contact_person: z.string().optional(),
      address: z.string().optional(),
      billing_address: z.string().optional(),
      website: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { data, error } = await ctx.supabaseService
        .from('major_customers')
        .insert(input)
        .select()
        .single()

      if (error) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      }

      return data
    }),

  updateCustomer: adminProcedure
    .input(z.object({
      id: z.string().uuid(),
      name: z.string().min(1).optional(),
      contact_email: z.string().email().optional(),
      contact_phone: z.string().optional(),
      contact_person: z.string().optional(),
      address: z.string().optional(),
      billing_address: z.string().optional(),
      website: z.string().optional(),
      is_active: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { id, ...updateData } = input

      const { data, error } = await ctx.supabaseService
        .from('major_customers')
        .update({
          ...updateData,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      }

      return data
    }),

  deleteCustomer: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      const { error } = await ctx.supabaseService
        .from('major_customers')
        .delete()
        .eq('id', input.id)

      if (error) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      }

      return { success: true }
    }),

  // Email Configuration 
  getEmailSettings: adminProcedure.query(async ({ ctx }) => {
    const { data, error } = await ctx.supabaseService
      .from('app_settings')
      .select('key, value')
      .eq('category', 'email')

    if (error) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
    }

    // Convert app_settings format to expected email settings format
    const emailSettings: Record<string, unknown> = {}
    data?.forEach(setting => {
      emailSettings[setting.key] = setting.value
    })

    // Return with defaults if settings don't exist
    return {
      smtp_host: emailSettings.smtp_host || '',
      smtp_port: emailSettings.smtp_port || 587,
      smtp_username: emailSettings.smtp_username || '',
      smtp_password: emailSettings.smtp_password || '',
      from_email: emailSettings.from_email || '',
      from_name: emailSettings.from_name || '',
      reply_to_email: emailSettings.reply_to_email || '',
      email_signature: emailSettings.email_signature || '',
      use_tls: emailSettings.use_tls !== undefined ? emailSettings.use_tls : true,
      use_ssl: emailSettings.use_ssl !== undefined ? emailSettings.use_ssl : false,
      is_enabled: emailSettings.is_enabled !== undefined ? emailSettings.is_enabled : true,
      subject_prefix: emailSettings.subject_prefix || ''
    }
  }),

  updateEmailSettings: adminProcedure
    .input(z.object({
      smtp_host: z.string().optional(),
      smtp_port: z.number().int().min(1).max(65535).optional(),
      smtp_username: z.string().optional(),
      smtp_password: z.string().optional(),
      from_email: z.string().email().optional(),
      from_name: z.string().optional(),
      reply_to_email: z.string().email().optional(),
      email_signature: z.string().optional(),
      use_tls: z.boolean().optional(),
      use_ssl: z.boolean().optional(),
      is_enabled: z.boolean().optional(),
      subject_prefix: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const results = []
      
      // Update each setting in app_settings table
      for (const [key, value] of Object.entries(input)) {
        if (value !== undefined) {
          // Check if setting exists
          const { data: existing } = await ctx.supabaseService
            .from('app_settings')
            .select('id')
            .eq('category', 'email')
            .eq('key', key)
            .single()

          if (existing) {
            // Update existing setting
            const { error } = await ctx.supabaseService
              .from('app_settings')
              .update({
                value: value,
                updated_at: new Date().toISOString(),
                updated_by: ctx.user?.email
              })
              .eq('id', existing.id)

            if (error) {
              throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: `Failed to update ${key}: ${error.message}` })
            }
          } else {
            // Create new setting
            const { error } = await ctx.supabaseService
              .from('app_settings')
              .insert({
                category: 'email',
                key: key,
                value: value,
                description: getEmailSettingDescription(key),
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                created_by: ctx.user?.email,
                updated_by: ctx.user?.email
              })

            if (error) {
              throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: `Failed to create ${key}: ${error.message}` })
            }
          }
          
          results.push({ key, value, status: 'updated' })
        }
      }

      return { success: true, updated: results }
    }),

  // Unified Audit Logs (NEW - replaces system_logs, activity_logs, email_logs)
  getUnifiedLogs: adminProcedure
    .input(z.object({
      limit: z.number().int().min(1).max(100).default(50),
      offset: z.number().int().min(0).default(0),
      log_type: z.enum(['system', 'user_activity', 'email', 'auth', 'security', 'api', 'file_operation']).optional(),
      level: z.enum(['DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL']).optional(),
      user_id: z.string().uuid().optional(),
      action: z.string().optional(),
      search: z.string().optional(),
      start_date: z.string().optional(),
      end_date: z.string().optional(),
    }))
    .query(async ({ input, ctx }) => {
      let query = ctx.supabaseService
        .from('unified_logs_with_user_info') // Use the updated view with public.users
        .select('*')
        .order('created_at', { ascending: false })
        .range(input.offset, input.offset + input.limit - 1)

      // Apply filters
      if (input.log_type) {
        query = query.eq('log_type', input.log_type)
      }
      if (input.level) {
        query = query.eq('level', input.level)
      }
      if (input.user_id) {
        query = query.eq('user_id', input.user_id)
      }
      if (input.action) {
        query = query.eq('action', input.action)
      }
      if (input.start_date) {
        query = query.gte('created_at', input.start_date)
      }
      if (input.end_date) {
        query = query.lte('created_at', input.end_date)
      }
      if (input.search) {
        // Search across message, action, username, and user email
        query = query.or(`message.ilike.%${input.search}%, action.ilike.%${input.search}%, username.ilike.%${input.search}%, user_email.ilike.%${input.search}%`)
      }

      const { data, error } = await query

      if (error) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      }

      return data || []
    }),

  // Legacy endpoints removed - use getUnifiedLogs instead

  // Email Logs (Updated to use unified audit logs)
  getEmailLogs: adminProcedure
    .input(z.object({
      limit: z.number().int().min(1).max(100).default(50),
      offset: z.number().int().min(0).default(0),
      status: z.string().optional(),
    }))
    .query(async ({ input, ctx }) => {
      let query = ctx.supabaseService
        .from('unified_logs_with_user_info')
        .select('*')
        .eq('log_type', 'email') // Only get email-related logs
        .order('created_at', { ascending: false })
        .range(input.offset, input.offset + input.limit - 1)

      if (input.status) {
        query = query.eq('email_status', input.status)
      }

      const { data, error } = await query

      if (error) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      }

      // Transform the data to match the expected email logs format
      const emailLogs = data?.map(log => ({
        id: log.id,
        recipient_email: log.email_to?.[0] || 'Unknown', // Take first recipient
        subject: log.email_subject || log.message || 'No subject',
        status: log.email_status || 'unknown',
        sent_at: log.created_at,
        created_at: log.created_at,
        error_message: log.error_details?.message || null,
        message_id: log.details?.message_id || null,
        provider: log.details?.provider || 'system',
        user_email: log.user_email,
        username: log.username,
        user_display_name: log.user_display_name
      })) || []

      return emailLogs
    }),

  // Test Email
  sendTestEmail: adminProcedure
    .input(z.object({
      to: z.string().email(),
      subject: z.string().default('Test Email from BWA GAS'),
      body: z.string().default('This is a test email from BWA GAS Reports System.'),
    }))
    .mutation(async ({ input }) => {
      // For now, just simulate sending
      // TODO: Implement actual email sending logic
      console.log('Test email would be sent to:', input.to)
      return { success: true, message: 'Test email sent successfully' }
    }),

  // App Settings Management
  getAllAppSettings: adminProcedure.query(async ({ ctx }) => {
    const { data, error } = await ctx.supabaseService
      .from('app_settings')
      .select('*')
      .order('category', { ascending: true })

    if (error) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
    }

    return data || []
  }),

  updateAppSetting: adminProcedure
    .input(z.object({
      id: z.string().uuid().optional(),
      category: z.string().optional(),
      key: z.string().optional(),
      value: z.unknown(), // Allow any JSON value
    }))
    .mutation(async ({ input, ctx }) => {
      let oldValue = ''
      
      if (input.id) {
        // Get the old value first for logging
        const { data: existing } = await ctx.supabaseService
          .from('app_settings')
          .select('value, category, key')
          .eq('id', input.id)
          .single()
        
        oldValue = existing ? JSON.stringify(existing.value) : ''
        
        // Update by ID
        const { data, error } = await ctx.supabaseService
          .from('app_settings')
          .update({
            value: input.value,
            updated_at: new Date().toISOString(),
            updated_by: ctx.user?.email
          })
          .eq('id', input.id)
          .select()
          .single()

        if (error) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
        }

        // Log the settings update
        if (ctx.user?.id && ctx.user?.email && existing) {
          await logSettingsUpdate(
            ctx.user.id,
            ctx.user.email,
            existing.category,
            existing.key,
            oldValue,
            JSON.stringify(input.value)
          )
        }

        return data
      } else if (input.category && input.key) {
        // Get the old value first for logging
        const { data: existing } = await ctx.supabaseService
          .from('app_settings')
          .select('value')
          .eq('category', input.category)
          .eq('key', input.key)
          .maybeSingle()
        
        oldValue = existing ? JSON.stringify(existing.value) : ''
        
        // Update or insert by category and key
        const { data, error } = await ctx.supabaseService
          .from('app_settings')
          .upsert({
            category: input.category,
            key: input.key,
            value: input.value,
            updated_at: new Date().toISOString(),
            updated_by: ctx.user?.email
          }, {
            onConflict: 'category,key'
          })
          .select()
          .single()

        if (error) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
        }

        // Log the settings update
        if (ctx.user?.id && ctx.user?.email) {
          await logSettingsUpdate(
            ctx.user.id,
            ctx.user.email,
            input.category,
            input.key,
            oldValue,
            JSON.stringify(input.value)
          )
        }

        return data
      } else {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Either id or both category and key must be provided' })
      }
    }),

  // User Profile Update with Signature Upload
  updateUserProfile: adminProcedure
    .input(z.object({
      id: z.string().uuid(),
      first_name: z.string().optional(),
      last_name: z.string().optional(),
      email: z.string().email().optional(),
      username: z.string().optional(),
      phone: z.string().optional(),
      department: z.string().optional(),
      role: z.enum(['Tester', 'Admin', 'Super Admin', 'Authorised Signatory']).optional(),
      is_active: z.boolean().optional(),
      signature_path: z.string().optional(),
      signature: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { id, ...updateData } = input

      const { data, error } = await ctx.supabaseService
        .from('users')
        .update({
          ...updateData,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      }

      return data
    }),

  // Branding Settings
  getBrandingSettings: adminProcedure.query(async ({ ctx }) => {
    const { data, error } = await ctx.supabaseService
      .from('app_settings')
      .select('*')
      .in('category', ['branding', 'reports']) // Include both branding and reports categories

    if (error) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
    }

    // Convert array of settings to object
    const brandingSettings: Record<string, unknown> = {}
    data?.forEach(setting => {
      try {
        brandingSettings[setting.key] = typeof setting.value === 'string' 
          ? JSON.parse(setting.value) 
          : setting.value
      } catch {
        brandingSettings[setting.key] = setting.value
      }
    })

    return brandingSettings
  }),


}) 