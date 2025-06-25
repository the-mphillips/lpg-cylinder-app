import { z } from 'zod'
import { authedProcedure, adminProcedure, createTRPCRouter } from '../server'
import { TRPCError } from '@trpc/server'

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
      .from('email_settings')
      .select('*')
      .limit(1)
      .single()

    if (error && error.code !== 'PGRST116') { // Not found is OK
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
    }

    return data || {
      smtp_server: '',
      smtp_port: 587,
      smtp_username: '',
      smtp_password: '',
      from_email: '',
      from_name: '',
      use_tls: true,
      use_ssl: false
    }
  }),

  updateEmailSettings: adminProcedure
    .input(z.object({
      smtp_server: z.string(),
      smtp_port: z.number().int().min(1).max(65535),
      smtp_username: z.string(),
      smtp_password: z.string(),
      from_email: z.string().email(),
      from_name: z.string(),
      use_tls: z.boolean(),
      use_ssl: z.boolean(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Check if settings exist
      const { data: existing } = await ctx.supabaseService
        .from('email_settings')
        .select('id')
        .limit(1)
        .single()

      if (existing) {
        // Update existing
        const { data, error } = await ctx.supabaseService
          .from('email_settings')
          .update({
            ...input,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id)
          .select()
          .single()

        if (error) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
        }
        return data
      } else {
        // Create new
        const { data, error } = await ctx.supabaseService
          .from('email_settings')
          .insert(input)
          .select()
          .single()

        if (error) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
        }
        return data
      }
    }),

  // System Logs
  getSystemLogs: adminProcedure
    .input(z.object({
      limit: z.number().int().min(1).max(100).default(50),
      offset: z.number().int().min(0).default(0),
      level: z.enum(['DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL']).optional(),
    }))
    .query(async ({ input, ctx }) => {
      let query = ctx.supabaseService
        .from('system_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .range(input.offset, input.offset + input.limit - 1)

      if (input.level) {
        query = query.eq('level', input.level)
      }

      const { data, error } = await query

      if (error) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      }

      return data || []
    }),

  // Activity Logs
  getActivityLogs: adminProcedure
    .input(z.object({
      limit: z.number().int().min(1).max(100).default(50),
      offset: z.number().int().min(0).default(0),
      user_id: z.string().uuid().optional(),
    }))
    .query(async ({ input, ctx }) => {
      let query = ctx.supabaseService
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .range(input.offset, input.offset + input.limit - 1)

      if (input.user_id) {
        query = query.eq('user_id', input.user_id)
      }

      const { data, error } = await query

      if (error) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      }

      return data || []
    }),

  // Email Logs
  getEmailLogs: adminProcedure
    .input(z.object({
      limit: z.number().int().min(1).max(100).default(50),
      offset: z.number().int().min(0).default(0),
      status: z.enum(['pending', 'sent', 'failed']).optional(),
    }))
    .query(async ({ input, ctx }) => {
      let query = ctx.supabaseService
        .from('email_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .range(input.offset, input.offset + input.limit - 1)

      if (input.status) {
        query = query.eq('status', input.status)
      }

      const { data, error } = await query

      if (error) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      }

      return data || []
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
      if (input.id) {
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

        return data
      } else if (input.category && input.key) {
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
      .eq('category', 'branding')

    if (error) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
    }

    // Convert array of settings to object
    const brandingSettings: Record<string, any> = {}
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