import { createTRPCRouter, publicProcedure, authedProcedure } from '@/lib/trpc/server'
import { z } from 'zod'
import { isUsernameAvailable, isEmailAvailable, getUserDisplayName, createUser, changePassword } from '@/lib/auth/login-helpers'
import { UserRole, getRolePermissions } from '@/lib/types/database'
import { createClient } from '@/lib/supabase/client'
import isEmail from 'validator/lib/isEmail'
import { logAuthEvent } from '@/lib/utils/unified-logging'

export const authRouter = createTRPCRouter({
  getSession: publicProcedure.query(async ({ ctx }) => {
    const { data } = await ctx.supabase.auth.getSession()
    return data.session
  }),

  getCurrentUser: authedProcedure.query(async ({ ctx }) => {
    return {
      ...ctx.user,
      permissions: getRolePermissions(ctx.user.role as UserRole),
      displayName: getUserDisplayName(ctx.user)
    }
  }),

  login: publicProcedure
    .input(z.object({
      identifier: z.string().min(1, 'Username or email is required'),
      password: z.string().min(1, 'Password is required')
    }))
    .mutation(async ({ input, ctx }) => {
      // Supabase's signInWithPassword requires an email.
      // If the user provides a username, we first need to look up their email.
      const isEmailIdentifier = isEmail(input.identifier)
      let email = input.identifier;

      if (!isEmailIdentifier) {
        // It's a username, so find the corresponding email.
        const { data: user, error: userError } = await ctx.supabase
          .from('users')
          .select('email')
          .eq('username', input.identifier)
          .single();

        if (userError || !user) {
          throw new Error('Invalid username or password');
        }
        email = user.email;
      }

      // Now, sign in with the email and password.
      const { data, error } = await ctx.supabase.auth.signInWithPassword({
        email: email,
        password: input.password,
      });

      if (error) {
        // Log failed login attempt
        await logAuthEvent('LOGIN', `Login failed for ${email}`, {
          userId: undefined,
          level: 'WARNING',
          details: { email, failed_reason: error.message },
          request: ctx.req
        })
        // Provide a generic error to avoid leaking information.
        throw new Error('Invalid username or password');
      }

      // Log successful login
      await logAuthEvent('LOGIN', `Successful login for ${email}`, {
        userId: data.user?.id,
        level: 'INFO',
        details: { email },
        request: ctx.req
      })

      return { success: true };
    }),

  logout: authedProcedure.mutation(async ({ ctx }) => {
    // Log logout attempt
    await logAuthEvent('LOGOUT', `User logout: ${ctx.user?.email}`, {
      userId: ctx.user?.id,
      level: 'INFO',
      details: { email: ctx.user?.email },
      request: ctx.req
    })
    
    const { error } = await ctx.supabase.auth.signOut()
    if (error) {
      throw new Error('Failed to logout')
    }
    return { success: true }
  }),

  checkUsernameAvailability: publicProcedure
    .input(z.object({
      username: z.string().min(3, 'Username must be at least 3 characters'),
      excludeUserId: z.string().optional()
    }))
    .query(async ({ input }) => {
      const isAvailable = await isUsernameAvailable(input.username, input.excludeUserId)
      return { available: isAvailable }
    }),

  checkEmailAvailability: publicProcedure
    .input(z.object({
      email: z.string().email('Invalid email format'),
      excludeUserId: z.string().optional()
    }))
    .query(async ({ input }) => {
      const isAvailable = await isEmailAvailable(input.email, input.excludeUserId)
      return { available: isAvailable }
    }),

  updateProfile: authedProcedure
    .input(z.object({
      first_name: z.string().optional(),
      last_name: z.string().optional(),
      username: z.string().min(3).optional(),
      phone: z.string().optional(),
      department: z.string().optional()
    }))
    .mutation(async ({ input, ctx }) => {
      const { data: { user: authUser } } = await ctx.supabase.auth.getUser()
      if (!authUser) throw new Error('Not authenticated')
      
      // Check username availability if username is being updated
      if (input.username) {
        const isAvailable = await isUsernameAvailable(input.username, authUser.id)
        if (!isAvailable) {
          throw new Error('Username is already taken')
        }
      }

      const { data: user, error } = await ctx.supabase
        .from('users')
        .update({
          ...input,
          updated_at: new Date().toISOString()
        })
        .eq('id', authUser.id)
        .select()
        .single()

      if (error) {
        throw new Error('Failed to update profile')
      }

      return {
        ...user,
        permissions: getRolePermissions(user.role as UserRole),
        displayName: getUserDisplayName(user)
      }
    }),

  register: publicProcedure
    .input(z.object({
      username: z.string().min(3, 'Username must be at least 3 characters'),
      email: z.string().email('Invalid email format'),
      password: z.string().min(6, 'Password must be at least 6 characters'),
      first_name: z.string().optional(),
      last_name: z.string().optional(),
      role: z.enum(['Super Admin', 'Admin', 'Authorised Signatory', 'Tester']).default('Tester')
    }))
    .mutation(async ({ input }) => {
      try {
        // Check if username is available
        const usernameAvailable = await isUsernameAvailable(input.username)
        if (!usernameAvailable) {
          throw new Error('Username is already taken')
        }

        // Check if email is available
        const emailAvailable = await isEmailAvailable(input.email)
        if (!emailAvailable) {
          throw new Error('Email is already registered')
        }

        const user = await createUser(input)
        if (!user) {
          throw new Error('Failed to create user')
        }

        return {
          success: true,
          user: {
            ...user,
            permissions: getRolePermissions(user.role as UserRole),
            displayName: getUserDisplayName(user)
          }
        }
      } catch (error) {
        throw new Error(error instanceof Error ? error.message : 'Registration failed')
      }
    }),

  changePassword: publicProcedure
    .input(z.object({
      userId: z.string(),
      currentPassword: z.string().min(1, 'Current password is required'),
      newPassword: z.string().min(6, 'New password must be at least 6 characters')
    }))
    .mutation(async ({ input }) => {
      try {
        // First verify current password by attempting login
        // This is a simple way to verify the current password
        const { data: user } = await createClient()
          .from('users')
          .select('username, password_hash')
          .eq('id', input.userId)
          .single()

        if (!user) {
          throw new Error('User not found')
        }

        // Verify current password (placeholder - should use bcrypt)
        if (input.currentPassword !== user.password_hash) {
          throw new Error('Current password is incorrect')
        }

        const success = await changePassword(input.userId, input.newPassword)
        if (!success) {
          throw new Error('Failed to change password')
        }

        return { success: true }
      } catch (error) {
        throw new Error(error instanceof Error ? error.message : 'Password change failed')
      }
    })
}) 