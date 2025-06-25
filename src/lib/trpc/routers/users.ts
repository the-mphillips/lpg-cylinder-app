import { createTRPCRouter, authedProcedure, adminProcedure } from '@/lib/trpc/server'
import { z } from 'zod'
import { UserRole, getRolePermissions, userRoleSchema } from '@/lib/types/database'
import { getUserDisplayName } from '@/lib/auth/login-helpers'

export const usersRouter = createTRPCRouter({
  list: adminProcedure
    .query(async ({ ctx }) => {
      const { data, error } = await ctx.supabaseService.from('users').select('*')
      if (error) {
        throw new Error('Failed to fetch users')
      }
      return data.map(user => ({
        ...user,
        permissions: getRolePermissions(user.role as UserRole)
      }))
    }),

  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const { error } = await ctx.supabase
        .from('users')
        .delete()
        .match({ id: input.id })
      return { success: !error }
    }),

  getById: authedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      const { data: user, error } = await ctx.supabase
        .from('users')
        .select('*')
        .eq('id', input.id)
        .single()

      if (error) {
        throw new Error(`Failed to fetch user: ${error.message}`)
      }
      return {
        ...user,
        permissions: getRolePermissions(user.role as UserRole)
      }
    }),

  getSignatories: authedProcedure
    .query(async ({ ctx }) => {
      const { data, error } = await ctx.supabase
        .from('users')
        .select('id, username, first_name, last_name, role')
        .in('role', ['Admin', 'Super Admin', 'Authorised Signatory'])
        .order('last_name', { ascending: true })

      if (error) {
        throw new Error(`Failed to fetch signatories: ${error.message}`)
      }
      return data.map(u => ({ ...u, displayName: getUserDisplayName(u) }))
    }),

  updateUser: authedProcedure
    .input(z.object({
      id: z.string(),
      username: z.string().min(3).optional(),
      email: z.string().email().optional(),
      first_name: z.string().optional(),
      last_name: z.string().optional(),
      role: userRoleSchema.optional(),
      signature: z.string().optional()
    }))
    .mutation(async ({ input, ctx }) => {
      const { id, ...updateData } = input
      
      const { data: user, error } = await ctx.supabase
        .from('users')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        throw new Error('Failed to update user')
      }

      return user
    })
}) 