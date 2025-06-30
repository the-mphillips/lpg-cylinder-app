import { createTRPCRouter, authedProcedure } from '@/lib/trpc/server';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';

export const dashboardRouter = createTRPCRouter({
  getDashboardStats: authedProcedure.query(async ({ ctx }) => {
    try {
      // Get current user information
      const { data: currentUser, error: userError } = await ctx.supabaseService
        .from('users')
        .select('id, first_name, last_name, role')
        .eq('id', ctx.user.id)
        .single();

      if (userError) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch user information.',
          cause: userError,
        });
      }

      // Get detailed report information
      const { data: reports, error: reportsError } = await ctx.supabaseService
        .from('reports')
        .select(`
          id, 
          status, 
          created_at, 
          updated_at,
          report_number,
          customer,
          address,
          gas_type,
          test_date,
          tester_names,
          approved_signatory,
          vehicle_id,
          work_order,
          user_id,
          major_customer_id
        `)
        .order('created_at', { ascending: false });

      if (reportsError) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch reports for stats.',
          cause: reportsError,
        });
      }
      
      const reportStatistics = {
        total: reports.length,
        pending: reports.filter((r) => r.status === 'submitted').length,
        approved: reports.filter((r) => r.status === 'approved').length,
        draft: reports.filter((r) => r.status === 'draft').length,
        rejected: reports.filter((r) => r.status === 'rejected').length,
      };

      // Get user statistics for admin users
      let userStatistics = null;
      if (currentUser.role === 'Super Admin' || currentUser.role === 'Admin') {
        const { data: users, error: usersError } = await ctx.supabaseService
          .from('users')
          .select('id, role, is_active');

        if (!usersError && users) {
          userStatistics = {
            total: users.length,
            admins: users.filter(u => u.role === 'Admin' || u.role === 'Super Admin').length,
            regularUsers: users.filter(u => u.role === 'Tester' || u.role === 'Authorised Signatory').length,
            active: users.filter(u => u.is_active).length,
          };
        }
      }

      // Get recent reports with more details (last 10)
      const recentReports = reports.slice(0, 10).map(report => ({
        ...report,
        formatted_date: new Date(report.created_at).toLocaleDateString(),
        status_display: report.status === 'submitted' ? 'Pending' : 
                       report.status === 'approved' ? 'Approved' : 
                       report.status === 'rejected' ? 'Rejected' : 'Draft'
      }));

      // Enhanced trend data (count per day for the last 30 days)
      const trend = Array.from({ length: 30 }).map((_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateString = date.toISOString().split('T')[0];
        
        const count = reports.filter(
          (r) => r.created_at.startsWith(dateString)
        ).length;

        return { 
          date: dateString, 
          count,
          formatted_date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        };
      }).reverse();

      // Get notifications (recent activity and system alerts)
      const notifications = [];
      
      // Recent submissions (last 24 hours)
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);
      const recentSubmissions = reports.filter(r => 
        new Date(r.created_at) > oneDayAgo && r.status === 'submitted'
      );
      
      if (recentSubmissions.length > 0) {
        notifications.push({
          type: 'info',
          message: `${recentSubmissions.length} new report${recentSubmissions.length > 1 ? 's' : ''} submitted in the last 24 hours`,
          timestamp: new Date().toISOString()
        });
      }

      // Pending approvals for signatories
      if (currentUser.role === 'Authorised Signatory' || currentUser.role === 'Admin' || currentUser.role === 'Super Admin') {
        const pendingCount = reportStatistics.pending;
        if (pendingCount > 0) {
          notifications.push({
            type: 'warning',
            message: `${pendingCount} report${pendingCount > 1 ? 's' : ''} awaiting approval`,
            timestamp: new Date().toISOString()
          });
        }
      }

      return {
        user: {
          id: currentUser.id,
          full_name: `${currentUser.first_name || ''} ${currentUser.last_name || ''}`.trim() || 'User',
          role: currentUser.role,
        },
        reportStatistics,
        userStatistics,
        recentReports,
        reportTrend: trend,
        notifications,
        completionRate: reportStatistics.total > 0 
          ? Math.round((reportStatistics.approved / reportStatistics.total) * 100) 
          : 0
      };
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      if (error instanceof TRPCError) throw error;
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred while fetching dashboard stats.',
      });
    }
  }),

  getReportDetails: authedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      try {
        const { data: report, error } = await ctx.supabaseService
          .from('reports')
          .select(`
            id,
            report_number,
            status,
            customer,
            address,
            gas_type,
            test_date,
            tester_names,
            approved_signatory,
            vehicle_id,
            work_order,
            created_at,
            updated_at
          `)
          .eq('id', input.id)
          .single();

        if (error || !report) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Report not found.',
          });
        }

        return {
          ...report,
          formatted_date: new Date(report.created_at).toLocaleDateString(),
          status_display: report.status === 'submitted' ? 'Pending' : 
                         report.status === 'approved' ? 'Approved' : 
                         report.status === 'rejected' ? 'Rejected' : 'Draft'
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch report details.',
        });
      }
    }),
}); 