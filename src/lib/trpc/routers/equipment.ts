import { z } from "zod";
import { createTRPCRouter, authedProcedure } from "../server";
import { TRPCError } from "@trpc/server";

export const equipmentRouter = createTRPCRouter({
  list: authedProcedure.query(async ({ ctx }) => {
    const { data, error } = await ctx.supabase.from("equipment").select("*");
    if (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch equipment",
        cause: error,
      });
    }
    return data;
  }),

  create: authedProcedure
    .input(
      z.object({
        name: z.string().min(1, "Name is required"),
        description: z.string().optional(),
        cost_price: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { name, description, cost_price } = input;
      const insertData = {
        name,
        description: description || null,
        cost_price: (cost_price !== undefined && !isNaN(cost_price)) ? cost_price : null,
      };

      const { data, error } = await ctx.supabase
        .from("equipment")
        .insert(insertData)
        .select("*")
        .single();

      if (error) {
        if (error.code === "23505") {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Equipment with this name already exists",
          });
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create equipment",
          cause: error,
        });
      }
      return data;
    }),

  update: authedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1, "Name is required"),
        description: z.string().optional(),
        cost_price: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, name, description, cost_price } = input;
      const updateData = {
        name,
        description: description || null,
        cost_price: (cost_price !== undefined && !isNaN(cost_price)) ? cost_price : null,
      };

      const { data, error } = await ctx.supabase
        .from("equipment")
        .update(updateData)
        .eq("id", id)
        .select("*")
        .single();

      if (error) {
        if (error.code === "23505") {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Equipment with this name already exists",
          });
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update equipment",
          cause: error,
        });
      }
      return data;
    }),

  delete: authedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase
        .from("equipment")
        .delete()
        .eq("id", input.id);

      if (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete equipment",
          cause: error,
        });
      }
      return { success: true };
    }),

  getUsageStats: authedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const { id } = input;

      const { data: reports, error: reportsError } = await ctx.supabase
        .from("reports")
        .select("equipment_used, test_date");

      if (reportsError) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch reports for usage stats",
          cause: reportsError,
        });
      }

      const { data: equipment, error: equipmentError } = await ctx.supabase
        .from("equipment")
        .select("name")
        .eq("id", id)
        .single();

      if (equipmentError || !equipment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Equipment not found",
          cause: equipmentError,
        });
      }

      const equipmentName = equipment.name;
      let totalUsage = 0;
      let monthlyUsage = 0;
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      for (const report of reports) {
        if (report.equipment_used && Array.isArray(report.equipment_used)) {
          if (report.equipment_used.includes(equipmentName)) {
            totalUsage++;
            const testDate = new Date(report.test_date);
            if (testDate >= firstDayOfMonth) {
              monthlyUsage++;
            }
          }
        }
      }

      return { totalUsage, monthlyUsage };
    }),
});
