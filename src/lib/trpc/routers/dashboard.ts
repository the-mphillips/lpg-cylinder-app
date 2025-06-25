import { createTRPCRouter, authedProcedure } from '@/lib/trpc/server';
import { TRPCError } from '@trpc/server';

export const dashboardRouter = createTRPCRouter({
  getDashboardStats: authedProcedure.query(async ({ ctx }) => {
    try {
      const { data: reports, error: reportsError } = await ctx.supabaseService
        .from('reports')
        .select('id, status, created_at, report_number')
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
      };

      const recentReports = reports.slice(0, 5);

      // Simple trend data (count per day for the last 7 days)
      const trend = Array.from({ length: 7 }).map((_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateString = date.toISOString().split('T')[0];
        
        const count = reports.filter(
          (r) => r.created_at.startsWith(dateString)
        ).length;

        return { date: dateString, count };
      }).reverse();

      return {
        reportStatistics,
        recentReports,
        reportTrend: trend,
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
}); 