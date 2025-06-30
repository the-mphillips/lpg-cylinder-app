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

      // Use optimized dashboard stats view instead of processing all reports
      const { data: statsData, error: statsError } = await ctx.supabaseService
        .from('dashboard_stats_view')
        .select('*')
        .single();

      if (statsError) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch dashboard statistics.',
          cause: statsError,
        });
      }

      // Use optimized recent reports view
      const { data: recentReports, error: reportsError } = await ctx.supabaseService
        .from('recent_reports_view')
        .select('*');

      if (reportsError) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch recent reports.',
          cause: reportsError,
        });
      }

      const reportStatistics = {
        total: statsData.total_reports || 0,
        pending: statsData.pending_reports || 0,
        approved: statsData.approved_reports || 0,
        draft: statsData.draft_reports || 0,
        rejected: statsData.rejected_reports || 0,
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

      // Format recent reports
      const formattedRecentReports = (recentReports || []).map(report => ({
        ...report,
        formatted_date: new Date(report.created_at).toLocaleDateString(),
        status_display: report.status === 'pending' ? 'Pending' : 
                       report.status === 'approved' ? 'Approved' : 
                       report.status === 'rejected' ? 'Rejected' : 'Draft'
      }));

      // Enhanced trend data using monthly trends view
      const { data: monthlyTrends, error: trendsError } = await ctx.supabaseService
        .from('monthly_report_trends')
        .select('*')
        .limit(12);

      let reportTrend: Array<{
        date: string;
        count: number;
        approved: number;
        formatted_date: string;
      }> = [];
      if (!trendsError && monthlyTrends) {
        reportTrend = monthlyTrends.map(trend => ({
          date: trend.month,
          count: trend.report_count,
          approved: trend.approved_count,
          formatted_date: new Date(trend.month).toLocaleDateString('en-US', { 
            month: 'short', 
            year: 'numeric' 
          })
        })).reverse(); // Show oldest to newest for chart
      }

      // Get notifications (recent activity and system alerts)
      const notifications = [];
      
      // Recent submissions check (last 24 hours) - only for pending reports
      if (reportStatistics.pending > 0) {
        // Get actual recent submissions count
        const oneDayAgo = new Date();
        oneDayAgo.setDate(oneDayAgo.getDate() - 1);
        
        const { data: recentSubmissions } = await ctx.supabaseService
          .from('reports')
          .select('id')
          .eq('status', 'pending')
          .gte('created_at', oneDayAgo.toISOString());
        
        const recentCount = recentSubmissions?.length || 0;
        if (recentCount > 0) {
          notifications.push({
            type: 'info',
            message: `${recentCount} new report${recentCount > 1 ? 's' : ''} submitted in the last 24 hours`,
            timestamp: new Date().toISOString()
          });
        }
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
        recentReports: formattedRecentReports,
        reportTrend,
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
    .mutation(async ({ ctx, input }) => {
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
          status_display: report.status === 'pending' ? 'Pending' : 
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