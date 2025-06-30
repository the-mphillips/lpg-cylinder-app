import { createTRPCRouter, authedProcedure } from '@/lib/trpc/server'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'

const reportSchema = z.object({
  customer: z.string().min(1, 'Customer name is required'),
  address: z.object({
    street: z.string().min(1, 'Address is required'),
    suburb: z.string().min(1, 'Suburb is required'),
    state: z.string().min(1, 'State is required'),
    postcode: z.string().min(4, 'Postcode is required'),
  }),
  gas_type: z.string().min(1, 'Gas type is required'),
  gas_supplier: z.string().optional(),
  size: z.string().min(1, 'Cylinder size is required'),
  test_date: z.string().min(1, 'Test date is required'),
  tester_names: z.array(z.string()).min(1, 'At least one tester is required'),
  vehicle_id: z.string().min(1, 'Vehicle ID is required'),
  work_order: z.string().optional(),
  major_customer_id: z.string().optional(),
  // cylinder_data will be an array of objects
  cylinder_data: z.array(z.object({
    cylinderNo: z.string().min(1, 'Cylinder number is required'),
    cylinderSpec: z.string().min(1, 'Cylinder spec is required'),
    wc: z.string().min(1, 'Water capacity is required'),
    extExam: z.enum(['PASS', 'FAIL']),
    intExam: z.enum(['PASS', 'FAIL']),
    barcode: z.string().min(1, 'Barcode is required'),
    remarks: z.string().optional(),
    recordedBy: z.string().optional(),
  })).min(1, 'At least one cylinder is required'),
})

const updateReportSchema = reportSchema.extend({
  id: z.string(),
}).partial().extend({
  id: z.string(), // id is always required for updates
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
            user_id: ctx.user.id,
            status: 'draft', // Default status
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

  // Get major customers for the dropdown
  getMajorCustomers: authedProcedure.query(async ({ ctx }) => {
    try {
      const { data: customers, error } = await ctx.supabaseService
        .from('major_customers')
        .select('id, name, contact_person, contact_email')
        .eq('is_active', true)
        .order('name');

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch major customers.',
          cause: error,
        });
      }

      return customers || [];
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch major customers.',
      });
    }
  }),

  // Get testers for the dropdown
  getTesters: authedProcedure.query(async ({ ctx }) => {
    try {
      const { data: testers, error } = await ctx.supabaseService
        .from('users')
        .select('id, first_name, last_name, role')
        .in('role', ['Tester', 'Admin', 'Super Admin', 'Authorised Signatory'])
        .eq('is_active', true)
        .order('first_name');

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch testers.',
          cause: error,
        });
      }

      // Format the testers with full names
      const formattedTesters = (testers || []).map(tester => ({
        id: tester.id,
        name: `${tester.first_name || ''} ${tester.last_name || ''}`.trim() || 'Unknown',
        role: tester.role,
      }));

      return formattedTesters;
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch testers.',
      });
    }
  }),

  // Get next report number
  getNextReportNumber: authedProcedure.query(async ({ ctx }) => {
    try {
      const { data: reports, error } = await ctx.supabaseService
        .from('reports')
        .select('report_number')
        .order('report_number', { ascending: false })
        .limit(1);

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch next report number.',
          cause: error,
        });
      }

      const lastReportNumber = reports && reports.length > 0 ? reports[0].report_number : 0;
      const nextNumber = (lastReportNumber || 0) + 1;
      
      return `BWA-${String(nextNumber).padStart(4, '0')}`;
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to generate next report number.',
      });
    }
  }),

  // Approve report
  approve: authedProcedure
    .input(z.object({
      reportId: z.string(),
      signatoryName: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const { data, error } = await ctx.supabase
          .from('reports')
          .update({
            status: 'approved',
            approved_signatory: input.signatoryName,
            updated_at: new Date().toISOString(),
          })
          .eq('id', input.reportId)
          .select()
          .single();

        if (error) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to approve report.',
            cause: error,
          });
        }

        return data;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to approve report.',
        });
      }
    }),

  // Delete report
  delete: authedProcedure
    .input(z.object({
      reportId: z.string(),
      password: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        // Note: In a real implementation, you would verify the password here
        // For now, we'll just delete the report if password is provided
        if (!input.password) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Password is required.',
          });
        }

        const { error } = await ctx.supabase
          .from('reports')
          .delete()
          .eq('id', input.reportId);

        if (error) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to delete report.',
            cause: error,
          });
        }

        return { success: true };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to delete report.',
        });
      }
    }),

  // Send report via email
  sendEmail: authedProcedure
    .input(z.object({
      reportId: z.string(),
      customerEmail: z.string().email(),
      emailBody: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        // First, get the report details
        const { data: report, error: reportError } = await ctx.supabase
          .from('reports')
          .select('*')
          .eq('id', input.reportId)
          .single();

        if (reportError || !report) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Report not found.',
          });
        }

        // Log the email in audit logs
        const { error: logError } = await ctx.supabase
          .from('audit_logs')
          .insert({
            log_type: 'email',
            action: 'report_email_sent',
            details: `Report ${report.report_number} sent to ${input.customerEmail}`,
            metadata: {
              report_id: input.reportId,
              customer_email: input.customerEmail,
              email_body: input.emailBody,
            },
            user_id: ctx.user.id,
            ip_address: 'unknown',
            user_agent: 'unknown',
          });

        if (logError) {
          console.error('Failed to log email:', logError);
        }

        // Note: In a real implementation, you would integrate with an email service here
        // For now, we'll just simulate the email sending
        console.log(`Email would be sent to ${input.customerEmail} for report ${report.report_number}`);

        return { success: true };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to send email.',
        });
      }
    }),
}) 