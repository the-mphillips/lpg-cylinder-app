import { createTRPCRouter, authedProcedure, adminProcedure } from '@/lib/trpc/server'
import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { createClient } from '@supabase/supabase-js'

// Create admin client for Supabase Auth operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // This is the service role key, not the anon key
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

function getEmailSettingDescription(key: string): string {
  const descriptions: Record<string, string> = {
    'email_smtp_host': 'SMTP server hostname (e.g., smtp.gmail.com)',
    'email_smtp_port': 'SMTP server port (usually 587 for TLS or 465 for SSL)',
    'email_smtp_username': 'SMTP username (usually your email address)',
    'email_smtp_password': 'SMTP password or app-specific password',
    'email_smtp_encryption': 'Encryption method (TLS, SSL, or STARTTLS)',
    'email_from_address': 'Default sender email address',
    'email_from_name': 'Default sender name',
    'email_reply_to': 'Reply-to email address',
    'email_subject_prefix': 'Prefix to add to all email subjects',
    'email_footer_text': 'Text to include in email footers',
    'email_max_retries': 'Maximum number of retry attempts for failed emails',
    'email_retry_delay': 'Delay between retry attempts (in seconds)',
    'email_batch_size': 'Number of emails to send in each batch',
    'email_rate_limit': 'Maximum emails per minute',
    'email_enable_logging': 'Whether to log all email activities',
    'email_notification_recipients': 'Comma-separated list of email addresses for system notifications'
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
      role: z.enum(['Tester', 'Admin', 'Super Admin', 'Authorised Signatory']).optional(),
      is_active: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { id, ...updateData } = input

      // Update user in public.users table
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

      // If email is being updated, also update it in auth.users
      if (updateData.email) {
        const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(id, {
          email: updateData.email
        })
        
        if (authError) {
          console.error('Failed to update email in auth.users:', authError)
          // Don't throw error here as the public.users update succeeded
        }
      }

      return data
    }),

  updateUserSignature: adminProcedure
    .input(z.object({
      id: z.string().uuid(),
      signature: z.string().nullable(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { id, signature } = input

      // Update user signature in public.users table
      const { data, error } = await ctx.supabaseService
        .from('users')
        .update({
          signature,
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
      password: z.string().min(6, 'Password must be at least 6 characters'),
      first_name: z.string().min(1),
      last_name: z.string().min(1),
      username: z.string().min(1),
      phone: z.string().optional(),
      department: z.string().optional(),
      role: z.enum(['Tester', 'Admin', 'Super Admin', 'Authorised Signatory']).default('Tester'),
    }))
    .mutation(async ({ input }) => {
      try {
        // First, create the user in Supabase Auth
        const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: input.email,
          password: input.password,
          email_confirm: true, // Auto-confirm email
          user_metadata: {
            first_name: input.first_name,
            last_name: input.last_name,
            username: input.username,
            role: input.role,
            phone: input.phone,
            department: input.department
          }
        })

        if (authError) {
          throw new TRPCError({ 
            code: 'INTERNAL_SERVER_ERROR', 
            message: `Failed to create user in auth: ${authError.message}` 
          })
        }

        if (!authUser.user) {
          throw new TRPCError({ 
            code: 'INTERNAL_SERVER_ERROR', 
            message: 'No user returned from auth creation' 
          })
        }

        // The trigger should automatically create the user in public.users
        // But let's verify and create manually if needed
        const { data: publicUser, error: publicError } = await supabaseAdmin
          .from('users')
          .select('*')
          .eq('id', authUser.user.id)
          .single()

        if (publicError || !publicUser) {
          // Trigger didn't work, create manually
          const { data: createdUser, error: createError } = await supabaseAdmin
            .from('users')
            .insert({
              id: authUser.user.id,
              email: input.email,
              first_name: input.first_name,
              last_name: input.last_name,
              username: input.username,
              role: input.role,
              is_active: true,
              phone: input.phone,
              department: input.department
            })
            .select()
            .single()

          if (createError) {
            // Clean up the auth user if public.users creation failed
            await supabaseAdmin.auth.admin.deleteUser(authUser.user.id)
            throw new TRPCError({ 
              code: 'INTERNAL_SERVER_ERROR', 
              message: `Failed to create user in public.users: ${createError.message}` 
            })
          }

          return createdUser
        }

        return publicUser
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error
        }
        throw new TRPCError({ 
          code: 'INTERNAL_SERVER_ERROR', 
          message: `Failed to create user: ${error instanceof Error ? error.message : 'Unknown error'}` 
        })
      }
    }),

  deleteUser: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input }) => {
      try {
        // First, delete the user from Supabase Auth
        const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(input.id)
        
        if (authError) {
          throw new TRPCError({ 
            code: 'INTERNAL_SERVER_ERROR', 
            message: `Failed to delete user from auth: ${authError.message}` 
          })
        }

        // The trigger should automatically clean up public.users and related data
        // But let's verify the cleanup happened
        const { data: remainingUser } = await supabaseAdmin
          .from('users')
          .select('id')
          .eq('id', input.id)
          .single()

        if (remainingUser) {
          // Trigger didn't work, clean up manually
          await supabaseAdmin
            .from('users')
            .delete()
            .eq('id', input.id)
        }

        return { success: true }
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error
        }
        throw new TRPCError({ 
          code: 'INTERNAL_SERVER_ERROR', 
          message: `Failed to delete user: ${error instanceof Error ? error.message : 'Unknown error'}` 
        })
      }
    }),

  // Signatories & Testers Management (from users table by role)
  getSignatories: authedProcedure.query(async ({ ctx }) => {
    const { data, error } = await ctx.supabaseService
      .from('users')
      .select('id, first_name, last_name, email, is_active, role, signature')
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
    }))
    .mutation(async ({ input, ctx }) => {
      const { id, ...updateData } = input

      const { data, error } = await ctx.supabaseService
        .from('major_customers')
        .update(updateData)
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

  // Email Settings Management
  getEmailSettings: adminProcedure.query(async ({ ctx }) => {
    const { data, error } = await ctx.supabaseService
      .from('app_settings')
      .select('*')
      .eq('category', 'email')
      .order('key')

    if (error) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
    }

    return data
  }),

  updateEmailSetting: adminProcedure
    .input(z.object({
      key: z.string(),
      value: z.string(),
      description: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { data, error } = await ctx.supabaseService
        .from('app_settings')
        .upsert({
          key: input.key,
          value: input.value,
          description: input.description || getEmailSettingDescription(input.key),
          category: 'email',
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      }

      return data
    }),

  // System Settings Management
  getSystemSettings: adminProcedure.query(async ({ ctx }) => {
    const { data, error } = await ctx.supabaseService
      .from('app_settings')
      .select('*')
      .eq('category', 'system')
      .order('key')

    if (error) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
    }

    return data
  }),

  updateSystemSetting: adminProcedure
    .input(z.object({
      key: z.string(),
      value: z.string(),
      description: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { data, error } = await ctx.supabaseService
        .from('app_settings')
        .upsert({
          key: input.key,
          value: input.value,
          description: input.description,
          category: 'system',
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      }

      return data
    }),

  // Security Settings Management
  getSecuritySettings: adminProcedure.query(async ({ ctx }) => {
    const { data, error } = await ctx.supabaseService
      .from('app_settings')
      .select('*')
      .eq('category', 'security')
      .order('key')

    if (error) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
    }

    return data
  }),

  updateSecuritySetting: adminProcedure
    .input(z.object({
      key: z.string(),
      value: z.string(),
      description: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { data, error } = await ctx.supabaseService
        .from('app_settings')
        .upsert({
          key: input.key,
          value: input.value,
          description: input.description,
          category: 'security',
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      }

      return data
    }),

  // Logs Management
  getLogs: adminProcedure
    .input(z.object({
      logType: z.enum(['system', 'user_activity', 'email', 'auth', 'security', 'api', 'file_operations']).optional(),
      limit: z.number().min(1).max(1000).default(100),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ input, ctx }) => {
      let query = ctx.supabaseService
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(input.limit)
        .range(input.offset, input.offset + input.limit - 1)

      if (input.logType) {
        query = query.eq('log_type', input.logType)
      }

      const { data, error } = await query

      if (error) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      }

      return data
    }),

  clearLogs: adminProcedure
    .input(z.object({
      logType: z.enum(['system', 'user_activity', 'email', 'auth', 'security', 'api', 'file_operations']).optional(),
      olderThanDays: z.number().min(1).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      let query = ctx.supabaseService
        .from('audit_logs')
        .delete()

      if (input.logType) {
        query = query.eq('log_type', input.logType)
      }

      if (input.olderThanDays) {
        const cutoffDate = new Date()
        cutoffDate.setDate(cutoffDate.getDate() - input.olderThanDays)
        query = query.lt('created_at', cutoffDate.toISOString())
      }

      const { error } = await query

      if (error) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      }

      return { success: true }
    }),
}) 