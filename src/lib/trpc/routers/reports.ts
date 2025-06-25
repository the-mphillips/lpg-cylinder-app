import { createTRPCRouter, authedProcedure } from '@/lib/trpc/server'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'

const reportSchema = z.object({
  customer_name: z.string().min(1, 'Customer name is required'),
  address: z.string().min(1, 'Address is required'),
  suburb: z.string().min(1, 'Suburb is required'),
  state: z.string().min(1, 'State is required'),
  postcode: z.string().min(4, 'Postcode is required'),
  cylinder_gas_type: z.string().min(1, 'Gas type is required'),
  gas_supplier: z.string().optional(),
  size: z.string().min(1, 'Cylinder size is required'),
  test_date: z.string().min(1, 'Test date is required'),
  tester_names: z.string().min(1, 'Tester name is required'),
  vehicle_id: z.string().min(1, 'Vehicle ID is required'),
  work_order: z.string().optional(),
  major_customer_id: z.string().optional(),
  // cylinder_data will be a JSON object
  cylinder_data: z.record(z.any()),
})

const updateReportSchema = reportSchema.extend({
  id: z.string(),
})

export const reportsRouter = createTRPCRouter({
  list: authedProcedure.query(async ({ ctx }) => {
    // We are not using Supabase auth at the moment, so we can't use RLS effectively
    // yet. We'll fetch directly. This assumes the 'reports' table is readable.
    const { data: reports, error } = await ctx.supabaseService.from('reports').select('*')

    if (error) {
      console.error('Failed to fetch reports from Supabase:', error)
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch reports.',
      })
    }

    return reports
  }),
  create: authedProcedure
    .input(reportSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const { data, error } = await ctx.supabase
          .from('reports')
          .insert({
            ...input,
            // TODO: Add user_id once JWT decoding is implemented
            // user_id: decodedToken.sub, 
          })
          .select()
          .single()

        if (error) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to create report in database.',
            cause: error,
          })
        }

        return data
      } catch (error) {
        console.error('Failed to create report:', error)
        if (error instanceof TRPCError) throw error
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred while creating the report.',
        })
      }
    }),
  getById: authedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      try {
        const { data, error } = await ctx.supabase
          .from('reports')
          .select('*')
          .eq('id', input.id)
          .single();

        if (error || !data) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: `Report with id '${input.id}' not found.`,
          });
        }
        return data;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch report.',
        });
      }
    }),
  update: authedProcedure
    .input(updateReportSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const { id, ...reportData } = input;
        const { data, error } = await ctx.supabase
          .from('reports')
          .update(reportData)
          .eq('id', id)
          .select()
          .single();

        if (error) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to update report in database.',
            cause: error,
          });
        }
        return data;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred while updating the report.',
        });
      }
    }),
}) 