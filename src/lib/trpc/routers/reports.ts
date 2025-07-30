import { createTRPCRouter, authedProcedure, adminProcedure } from '@/lib/trpc/server'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { logUserActivity } from '@/lib/utils/unified-logging'

// Base schema for required fields
const baseReportSchema = z.object({
  customer: z.string().optional(),
  address: z.object({
    street: z.string().optional(),
    suburb: z.string().optional(),
    state: z.string().optional(),
    postcode: z.string().optional(),
  }).optional(),
  gas_type: z.string().optional(),
  gas_supplier: z.string().optional(),
  size: z.string().optional(),
  test_date: z.string().optional(),
  tester_names: z.array(z.string()).optional(),
  vehicle_id: z.string().optional(),
  work_order: z.string().optional(),
  major_customer_id: z.string().optional(),
  status: z.enum(['draft', 'pending']).optional().default('pending'),
  // Office-only fields (not included in printed reports)
  notes: z.string().optional(),
  equipment_used: z.array(z.string()).optional(),
  images: z.array(z.string()).optional().default([]),
  // cylinder_data will be an array of objects
  cylinder_data: z.array(z.object({
    cylinderNo: z.string().optional(),
    cylinderSpec: z.string().optional(),
    wc: z.string().optional(),
    extExam: z.enum(['PASS', 'FAIL']).optional(),
    intExam: z.enum(['PASS', 'FAIL']).optional(),
    barcode: z.string().optional(),
    remarks: z.string().optional(),
    recordedBy: z.string().optional(),
  })).optional(),
})

// Schema for final submission (all required fields)
const finalReportSchema = z.object({
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
  status: z.enum(['draft', 'pending']).optional().default('pending'),
  // Office-only fields (not included in printed reports)
  notes: z.string().optional(),
  equipment_used: z.array(z.string()).optional(),
  images: z.array(z.string()).optional().default([]),
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

// Dynamic schema that validates based on status
const reportSchema = z.discriminatedUnion('status', [
  // Draft schema - minimal validation
  baseReportSchema.extend({
    status: z.literal('draft'),
  }),
  // Final submission schema - full validation
  finalReportSchema.extend({
    status: z.literal('pending'),
  }),
]).or(
  // Default to final schema if no status specified
  finalReportSchema
)

const updateReportSchema = baseReportSchema.extend({
  id: z.string(),
  status: z.enum(['draft', 'pending', 'approved', 'rejected']).optional(),
}).partial().extend({
  id: z.string(), // id is always required for updates
})

export const reportsRouter = createTRPCRouter({
  list: authedProcedure.query(async ({ ctx }) => {
    // Fetch active (non-archived) reports only
    const { data: reports, error } = await ctx.supabaseService
      .from('reports')
      .select('*')
      .is('deleted_at', null)  // Exclude soft deleted reports
      .order('created_at', { ascending: false })

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
        // Get the next report number
        const { data: reports, error: numberError } = await ctx.supabaseService
          .from('reports')
          .select('report_number')
          .order('report_number', { ascending: false })
          .limit(1);

        if (numberError) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to generate report number.',
            cause: numberError,
          });
        }

        const lastReportNumber = reports && reports.length > 0 ? parseInt(reports[0].report_number) : 10000;
        const nextReportNumber = lastReportNumber + 1;

        const { data, error } = await ctx.supabase
          .from('reports')
          .insert({
            ...input,
            user_id: ctx.user.id,
            created_by: ctx.user.id,
            status: input.status || 'pending', // Use provided status or default to 'pending'
            report_number: nextReportNumber,
          })
          .select()
          .single()

        if (error) {
          console.error('Database error during report creation:', error);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to create report in database.',
            cause: error,
          })
        }

        // Log the report creation action
        try {
          await logUserActivity(
            ctx.user.id,
            'REPORT_CREATED',
            `Report #${data.report_number} created for customer: ${data.customer}`,
            {
              resourceType: 'report',
              resourceId: data.id,
              resourceName: `Report #${data.report_number}`,
              details: {
                report_number: data.report_number,
                customer: data.customer,
                gas_type: data.gas_type,
                vehicle_id: data.vehicle_id,
                cylinder_count: data.cylinder_data?.length || 0,
              },
              level: 'INFO'
            }
          );
        } catch (logError) {
          console.error('Failed to log report creation:', logError);
          // Continue with the operation even if logging fails
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

        // Get the signature for the approved signatory
        let approved_signatory_signature = null;
        if (data.approved_signatory) {
          console.log(`[SIGNATURE DEBUG] Looking for signature for signatory: ${data.approved_signatory}`);
          
          try {
            // Split the full name to search first and last names separately
            const nameParts = data.approved_signatory.trim().split(' ');
            const firstName = nameParts[0];
            const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
            
            console.log(`[SIGNATURE DEBUG] Searching for first_name: "${firstName}", last_name: "${lastName}"`);
            
            // Use service client to bypass RLS policies that might cause recursion
            let query = ctx.supabaseService
              .from('users')
              .select('signature, first_name, last_name')
              .eq('is_active', true);
            
            // Search for exact match on first name and last name
            if (firstName) {
              query = query.ilike('first_name', firstName);
            }
            if (lastName) {
              query = query.ilike('last_name', lastName);
            }
            
            const { data: signatoryUser, error: signatoryError } = await query.maybeSingle();
            
            if (signatoryError) {
              console.error('[SIGNATURE DEBUG] Error fetching signatory:', signatoryError);
            } else if (signatoryUser?.signature) {
              approved_signatory_signature = signatoryUser.signature;
              console.log(`[SIGNATURE DEBUG] Found signature: ${approved_signatory_signature}`);
              console.log(`[SIGNATURE DEBUG] For user: ${signatoryUser.first_name} ${signatoryUser.last_name}`);
            } else {
              console.log(`[SIGNATURE DEBUG] No signature found for signatory: ${data.approved_signatory}`);
              if (signatoryUser) {
                console.log(`[SIGNATURE DEBUG] User found but no signature: ${signatoryUser.first_name} ${signatoryUser.last_name}`);
              } else {
                console.log(`[SIGNATURE DEBUG] No user found matching name pattern`);
              }
            }
          } catch (sigError) {
            console.error('[SIGNATURE DEBUG] Exception during signature fetch:', sigError);
          }
        } else {
          console.log('[SIGNATURE DEBUG] No approved signatory set on report');
        }

        return {
          ...data,
          approved_signatory_signature
        };
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
        
        // Get original report for logging purposes
        const { data: originalReport } = await ctx.supabase
          .from('reports')
          .select('*')
          .eq('id', id)
          .single();
        
        // Remove undefined values to avoid Supabase issues
        const cleanData = Object.fromEntries(
          Object.entries(reportData).filter(([, value]) => value !== undefined)
        );

        const { data, error } = await ctx.supabase
          .from('reports')
          .update({
            ...cleanData,
            updated_at: new Date().toISOString(),
            updated_by: ctx.user.id,
          })
          .eq('id', id)
          .select()
          .single();

        if (error) {
          console.error('Database error during report update:', error);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to update report in database.',
            cause: error,
          });
        }

        // Log the report update action
        try {
          await logUserActivity(
            ctx.user.id,
            'REPORT_UPDATED',
            `Report #${data.report_number} updated`,
            {
              resourceType: 'report',
              resourceId: id,
              resourceName: `Report #${data.report_number}`,
              details: {
                report_number: data.report_number,
                customer: data.customer,
                changes_made: Object.keys(cleanData),
                before_state: originalReport ? {
                  customer: originalReport.customer,
                  gas_type: originalReport.gas_type,
                  status: originalReport.status,
                } : null,
                after_state: {
                  customer: data.customer,
                  gas_type: data.gas_type,
                  status: data.status,
                },
              },
              level: 'INFO'
            }
          );
        } catch (logError) {
          console.error('Failed to log report update:', logError);
          // Continue with the operation even if logging fails
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

  // Duplicate report
  duplicate: authedProcedure
    .input(z.object({ reportId: z.string() }))
    .query(async ({ ctx, input }) => {
      try {
        const { data: originalReport, error } = await ctx.supabase
          .from('reports')
          .select('*')
          .eq('id', input.reportId)
          .single();

        if (error || !originalReport) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Report not found.',
          });
        }

        // Return the report data without ID and status for duplication
        const duplicateData = {
          customer: originalReport.customer,
          address: originalReport.address,
          gas_type: originalReport.gas_type,
          gas_supplier: originalReport.gas_supplier,
          size: originalReport.size,
          test_date: originalReport.test_date,
          tester_names: originalReport.tester_names,
          vehicle_id: originalReport.vehicle_id,
          work_order: originalReport.work_order,
          major_customer_id: originalReport.major_customer_id,
          cylinder_data: originalReport.cylinder_data,
        };

        return duplicateData;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to duplicate report.',
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

      const lastReportNumber = reports && reports.length > 0 ? parseInt(reports[0].report_number) : 10000;
      const nextNumber = lastReportNumber + 1;
      
      return nextNumber;
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to generate next report number.',
      });
    }
  }),

  // Approve report
  approve: adminProcedure
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
            approved_by: ctx.user.id,
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

        // Log the report approval action
        try {
          await logUserActivity(
            ctx.user.id,
            'REPORT_APPROVED',
            `Report #${data.report_number} approved by ${input.signatoryName}`,
            {
              resourceType: 'report',
              resourceId: input.reportId,
              resourceName: `Report #${data.report_number}`,
              details: {
                report_number: data.report_number,
                customer: data.customer,
                approved_signatory: input.signatoryName,
                approval_timestamp: new Date().toISOString(),
              },
              level: 'INFO'
            }
          );
        } catch (logError) {
          console.error('Failed to log report approval:', logError);
          // Continue with the operation even if logging fails
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

  // Unapprove report
  unapprove: adminProcedure
    .input(z.object({
      reportId: z.string(),
      password: z.string().min(1, 'Password is required'),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        console.log('Unapprove request for report:', input.reportId);
        // Verify admin password
        const { data: settings, error: settingsError } = await ctx.supabaseService
          .from('app_settings')
          .select('value')
          .eq('key', 'admin_password')
          .eq('category', 'security')
          .single();

        if (settingsError || !settings) {
          console.error('Admin password settings error:', settingsError);
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Admin password not configured.',
          });
        }

        // Handle potential JSON string value
        const adminPassword = typeof settings.value === 'string' 
          ? settings.value.replace(/"/g, '') 
          : settings.value;

        console.log('Password verification - Input:', input.password, 'Admin:', adminPassword);

        if (input.password !== adminPassword) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'Invalid admin password.',
          });
        }

        console.log('Password verified successfully');

        console.log('Updating report status to pending...');
        const { data, error } = await ctx.supabase
          .from('reports')
          .update({
            status: 'pending',
            approved_signatory: null,
            updated_at: new Date().toISOString(),
            updated_by: ctx.user.id,  // Add the user who performed the unapproval
          })
          .eq('id', input.reportId)
          .select()
          .single();

        if (error) {
          console.error('Database error during unapprove:', error);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to unapprove report.',
            cause: error,
          });
        }

        console.log('Report unapproved successfully:', data);

        // Log the unapproval action (don't let logging errors break the operation)
        try {
          await logUserActivity(
            ctx.user.id,
            'report_unapproved',
            `Report ${data.report_number} was unapproved by admin`,
            {
              resourceType: 'report',
              resourceId: input.reportId,
              resourceName: `Report #${data.report_number}`,
              details: {
                report_id: input.reportId,
                report_number: data.report_number,
                admin_action: true,
              },
              level: 'INFO'
            }
          );
        } catch (logError) {
          console.error('Failed to log unapproval action:', logError);
          // Continue with the operation even if logging fails
        }

        return data;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to unapprove report.',
        });
      }
    }),

  // Delete report
  delete: adminProcedure
    .input(z.object({
      reportId: z.string(),
      password: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        // Get report details for logging before deletion
        const { data: report } = await ctx.supabase
          .from('reports')
          .select('*')
          .eq('id', input.reportId)
          .single();

        // Verify admin password
        const { data: settings, error: settingsError } = await ctx.supabaseService
          .from('app_settings')
          .select('value')
          .eq('key', 'admin_password')
          .eq('category', 'security')
          .single();

        if (settingsError || !settings) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Admin password not configured.',
          });
        }

        // Handle potential JSON string value
        const adminPassword = typeof settings.value === 'string' 
          ? settings.value.replace(/"/g, '') 
          : settings.value;

        if (input.password !== adminPassword) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'Invalid admin password.',
          });
        }

        // Delete associated images from storage before deleting the report
        if (report?.images && Array.isArray(report.images) && report.images.length > 0) {
          try {
            console.log(`Deleting ${report.images.length} images for report ${report.report_number}`);
            
            const deletePromises = report.images.map(async (imagePath: string) => {
              try {
                const { error: deleteError } = await ctx.supabaseService.storage
                  .from('app-data')
                  .remove([imagePath]);
                
                if (deleteError) {
                  console.error(`Failed to delete image ${imagePath}:`, deleteError);
                } else {
                  console.log(`Successfully deleted image: ${imagePath}`);
                }
              } catch (error) {
                console.error(`Error deleting image ${imagePath}:`, error);
              }
            });

            await Promise.allSettled(deletePromises);
          } catch (error) {
            console.error('Error during image cleanup:', error);
            // Continue with report deletion even if image cleanup fails
          }
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

        // Log the permanent deletion action
        try {
          await logUserActivity(
            ctx.user.id,
            'REPORT_DELETED',
            `Report #${report?.report_number || 'Unknown'} permanently deleted`,
            {
              resourceType: 'report',
              resourceId: input.reportId,
              resourceName: `Report #${report?.report_number || 'Unknown'}`,
              details: {
                report_number: report?.report_number,
                customer: report?.customer,
                deletion_type: 'permanent',
                admin_action: true,
                password_verified: true,
              },
              level: 'WARNING'
            }
          );
        } catch (logError) {
          console.error('Failed to log report deletion:', logError);
          // Continue with the operation even if logging fails
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

  // Archive/Restore functionality
  archiveReport: adminProcedure
    .input(z.object({ 
      id: z.string(),
      reason: z.string().optional()
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const { data: report, error: fetchError } = await ctx.supabaseService
          .from('reports')
          .select('id, status, customer')
          .eq('id', input.id)
          .single();

        if (fetchError || !report) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Report not found',
          });
        }

        // Soft delete - set deleted_at and deleted_by
        const { error: updateError } = await ctx.supabaseService
          .from('reports')
          .update({
            deleted_at: new Date().toISOString(),
            deleted_by: ctx.user.id,
            updated_at: new Date().toISOString(),
            updated_by: ctx.user.id,
          })
          .eq('id', input.id);

        if (updateError) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to archive report',
            cause: updateError,
          });
        }

        // Log the action
        await logUserActivity(
          ctx.user.id,
          'archive_report',
          `Archived report for customer: ${report.customer}`,
          {
            resourceType: 'report',
            resourceId: input.id,
            details: { 
              customer: report.customer,
              reason: input.reason || 'No reason provided'
            }
          }
        );

        return { success: true, message: 'Report archived successfully' };
      } catch (error) {
        console.error('Error archiving report:', error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to archive report',
        });
      }
    }),

  restoreReport: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const { data: report, error: fetchError } = await ctx.supabaseService
          .from('reports')
          .select('id, customer, deleted_at')
          .eq('id', input.id)
          .single();

        if (fetchError || !report) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Archived report not found',
          });
        }

        if (!report.deleted_at) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Report is not archived',
          });
        }

        // Restore - clear deleted_at and deleted_by
        const { error: updateError } = await ctx.supabaseService
          .from('reports')
          .update({
            deleted_at: null,
            deleted_by: null,
            updated_at: new Date().toISOString(),
            updated_by: ctx.user.id,
          })
          .eq('id', input.id);

        if (updateError) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to restore report',
            cause: updateError,
          });
        }

        // Log the action
        await logUserActivity(
          ctx.user.id,
          'restore_report',
          `Restored report for customer: ${report.customer}`,
          {
            resourceType: 'report',
            resourceId: input.id,
            details: { customer: report.customer }
          }
        );

        return { success: true, message: 'Report restored successfully' };
      } catch (error) {
        console.error('Error restoring report:', error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to restore report',
        });
      }
    }),

  permanentlyDeleteReport: adminProcedure
    .input(z.object({ 
      id: z.string(),
      adminPassword: z.string()
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        // Verify admin password
        const { data: settings, error: settingsError } = await ctx.supabaseService
          .from('app_settings')
          .select('value')
          .eq('category', 'security')
          .eq('key', 'admin_password')
          .single();

        if (settingsError || !settings) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to verify admin password',
          });
        }

        const adminPassword = typeof settings.value === 'string' 
          ? settings.value.replace(/"/g, '') 
          : settings.value;

        if (adminPassword !== input.adminPassword) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'Invalid admin password',
          });
        }

        // Get report details before deletion for logging
        const { data: report, error: fetchError } = await ctx.supabaseService
          .from('reports')
          .select('id, report_number, customer, deleted_at')
          .eq('id', input.id)
          .single();

        if (fetchError || !report) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Report not found',
          });
        }

        if (!report.deleted_at) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Report must be archived before permanent deletion',
          });
        }

        // Permanently delete the report
        const { error: deleteError } = await ctx.supabaseService
          .from('reports')
          .delete()
          .eq('id', input.id);

        if (deleteError) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to permanently delete report',
            cause: deleteError,
          });
        }

        // Log the action
        await logUserActivity(
          ctx.user.id,
          'permanently_delete_report',
          `Permanently deleted report ${report.report_number} for customer: ${report.customer}`,
          {
            resourceType: 'report',
            resourceId: input.id,
            details: { 
              report_number: report.report_number,
              customer: report.customer 
            },
            level: 'WARNING'
          }
        );

        return { success: true, message: 'Report permanently deleted' };
      } catch (error) {
        console.error('Error permanently deleting report:', error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to permanently delete report',
        });
      }
    }),

    getArchivedReports: adminProcedure.query(async ({ ctx }) => {
      try {
        const { data: reports, error } = await ctx.supabaseService
          .from('reports')
          .select(`
            id,
            report_number,
            customer,
            status,
            created_at,
            deleted_at,
            deleted_by,
            test_date,
            gas_type,
            size,
            vehicle_id,
            work_order
          `)
          .not('deleted_at', 'is', null)
          .order('deleted_at', { ascending: false });
  
        if (error) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to fetch archived reports',
            cause: error,
          });
        }
  
        // Get user names for deleted_by field
        const userIds = [...new Set(reports?.map(r => r.deleted_by).filter(Boolean))];
        let users: Array<{ id: string; first_name: string; last_name: string }> = [];
        
        if (userIds.length > 0) {
          const { data: usersData } = await ctx.supabaseService
            .from('users')
            .select('id, first_name, last_name')
            .in('id', userIds);
          users = usersData || [];
        }
  
        const formattedReports = (reports || []).map(report => {
          const deletedByUser = users.find(u => u.id === report.deleted_by);
          return {
            ...report,
            deleted_by_name: deletedByUser 
              ? `${deletedByUser.first_name} ${deletedByUser.last_name}`.trim() 
              : 'Unknown User',
            formatted_deleted_date: new Date(report.deleted_at).toLocaleDateString(),
            formatted_created_date: new Date(report.created_at).toLocaleDateString(),
          };
        });
  
        return formattedReports;
      } catch (error) {
        console.error('Error fetching archived reports:', error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch archived reports',
        });
      }
    }),
  }) 