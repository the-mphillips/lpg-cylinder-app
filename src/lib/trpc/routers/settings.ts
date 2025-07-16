import { createTRPCRouter, authedProcedure } from '@/lib/trpc/server'
import { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod'
import { TRPCError } from '@trpc/server';

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

  getFormDefaults: authedProcedure.query(async ({ ctx }) => {
    try {
      // Get all form-related settings in one query for performance
      const { data: settings, error } = await ctx.supabaseService
        .from('app_settings')
        .select('category, key, value')
        .in('category', ['reports'])
        .in('key', ['default_gas_types', 'default_cylinder_sizes', 'default_gas_suppliers', 'default_vehicle_ids', 'default_equipment_options']);

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch form defaults',
          cause: error,
        });
      }

      // Transform into easy-to-use format
      const defaults = {
        gasTypes: [] as string[],
        cylinderSizes: [] as string[],
        gasSuppliers: [] as string[],
        vehicleIds: [] as string[],
        equipmentOptions: [] as string[],
        stateOptions: [
          { label: 'Victoria', value: 'VIC' },
          { label: 'New South Wales', value: 'NSW' },
          { label: 'Queensland', value: 'QLD' },
          { label: 'Western Australia', value: 'WA' },
          { label: 'South Australia', value: 'SA' },
          { label: 'Tasmania', value: 'TAS' },
          { label: 'Australian Capital Territory', value: 'ACT' },
          { label: 'Northern Territory', value: 'NT' },
        ]
      };

      // Parse settings data with robust handling
      settings?.forEach(setting => {
        let value: string[] = [];
        
        if (Array.isArray(setting.value)) {
          value = setting.value;
        } else if (typeof setting.value === 'string') {
          try {
            // Try to parse as JSON
            const parsed = JSON.parse(setting.value);
            value = Array.isArray(parsed) ? parsed : [];
          } catch {
            // If not JSON, split by comma
            value = setting.value.split(',').map(v => v.trim()).filter(v => v);
          }
        }
        
        switch (setting.key) {
          case 'default_gas_types':
            defaults.gasTypes = value;
            break;
          case 'default_cylinder_sizes':
            defaults.cylinderSizes = value;
            break;
          case 'default_gas_suppliers':
            defaults.gasSuppliers = value;
            break;
          case 'default_vehicle_ids':
            defaults.vehicleIds = value;
            break;
          case 'default_equipment_options':
            defaults.equipmentOptions = value;
            break;
        }
      });

      // Add "Other" option to arrays that support it
      defaults.gasTypes.push('Other');
      defaults.cylinderSizes.push('Other');
      defaults.gasSuppliers.push('Other');
      defaults.vehicleIds.push('Other');

      return defaults;
    } catch (error) {
      console.error('Error fetching form defaults:', error);
      if (error instanceof TRPCError) throw error;
      
      // Fallback to hardcoded values if database fails
      return {
        gasTypes: ['LPG', 'Refrigerant Gas', 'Other'],
        cylinderSizes: ['4kg', '9kg', '15kg', '45kg', '90kg', '190kg', '210kg', 'Other'],
        gasSuppliers: ['SUPAGAS', 'ELGAS', 'ORIGIN', 'Other'],
        vehicleIds: ['BWA-01', 'BWA-02', 'BWA-03', 'BWA-04', 'BWA-05', 'BWA-06', 'BWA-07', 'BWA-08', 'BWA-TAS', 'Other'],
        equipmentOptions: ['Pressure Gauge', 'Test Pump', 'Safety Equipment', 'Inspection Tools', 'Measuring Equipment', 'Weighing Scale', 'Valve Testing Equipment', 'Leak Detection Equipment'],
        stateOptions: [
          { label: 'Victoria', value: 'VIC' },
          { label: 'New South Wales', value: 'NSW' },
          { label: 'Queensland', value: 'QLD' },
          { label: 'Western Australia', value: 'WA' },
          { label: 'South Australia', value: 'SA' },
          { label: 'Tasmania', value: 'TAS' },
          { label: 'Australian Capital Territory', value: 'ACT' },
          { label: 'Northern Territory', value: 'NT' },
        ]
      };
    }
  }),
}) 