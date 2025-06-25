import { createTRPCRouter, authedProcedure } from '@/lib/trpc/server'
import { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod'

interface DbSetting {
  category: string;
  key: string;
  value: unknown;
  description: string;
}

// This would typically come from a database query
const getAppSettingsFromDb = async (supabase: SupabaseClient) => {
    const { data, error } = await supabase.from('app_settings').select('*');
    if (error) {
        console.error("Error fetching settings:", error)
        return {};
    }

    const settingsByCategory = data.reduce((acc: Record<string, Record<string, { value: unknown; description: string }>>, setting: DbSetting) => {
        const { category, key, value, description } = setting;
        if (!acc[category]) {
            acc[category] = {};
        }
        acc[category][key] = { value, description };
        return acc;
    }, {});

    return settingsByCategory;
}

const updateAppSettingsInDb = async (supabase: SupabaseClient, category: string, settings: Record<string, unknown>) => {
    const updatePromises = Object.entries(settings).map(([key, value]) => {
        return supabase
            .from('app_settings')
            .update({ value })
            .match({ category, key });
    });
    const results = await Promise.all(updatePromises);
    const hasError = results.some(res => res.error);
    if (hasError) {
        throw new Error("Failed to update one or more settings.")
    }
    return { success: true };
}


export const settingsRouter = createTRPCRouter({
  getAll: authedProcedure
    .query(async ({ ctx }) => {
        const settings = await getAppSettingsFromDb(ctx.supabase);
        return settings;
    }),
  
  update: authedProcedure
    .input(z.object({
        category: z.string(),
        settings: z.record(z.unknown()),
    }))
    .mutation(async ({ ctx, input }) => {
        await updateAppSettingsInDb(ctx.supabase, input.category, input.settings);
        return { success: true };
    }),
}) 