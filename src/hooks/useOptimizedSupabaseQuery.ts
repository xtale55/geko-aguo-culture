import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

// Enhanced version of useSupabaseQuery with aggressive caching and optimization
export function useOptimizedSupabaseQuery<T>(
  queryKey: string[],
  queryFn: () => Promise<{ data: T | null; error: any }>,
  options?: {
    enabled?: boolean;
    staleTime?: number;
    gcTime?: number;
    refetchOnWindowFocus?: boolean;
    background?: boolean;
  }
) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: [...queryKey, user?.id],
    queryFn: async () => {
      const result = await queryFn();
      if (result.error) {
        throw result.error;
      }
      return result.data;
    },
    enabled: !!user && (options?.enabled !== false),
    staleTime: options?.staleTime || 30 * 60 * 1000, // 30 minutes default
    gcTime: options?.gcTime || 60 * 60 * 1000, // 1 hour
    refetchOnWindowFocus: options?.refetchOnWindowFocus ?? false,
    ...(options?.background && {
      // Background refetching options
      refetchInterval: 5 * 60 * 1000, // 5 minutes
      refetchIntervalInBackground: false,
    }),
  });
}

// Optimized farms query with longer cache
export function useOptimizedFarmsQuery() {
  const { user } = useAuth();
  
  return useOptimizedSupabaseQuery(
    ['farms-optimized'],
    async () => {
      const result = await supabase
        .from('farms')
        .select('id, name, total_area')
        .eq('user_id', user?.id);
      return result;
    },
    { 
      staleTime: 60 * 60 * 1000, // 1 hour - farms rarely change
      gcTime: 2 * 60 * 60 * 1000, // 2 hours
    }
  );
}

// Optimized feeding metrics using database function
export function useOptimizedFeedingMetrics(farmId?: string) {
  return useOptimizedSupabaseQuery(
    ['feeding-metrics-optimized', farmId],
    async () => {
      const { data, error } = await supabase.rpc('calculate_feeding_metrics', {
        farm_id_param: farmId
      });
      
      return { data, error };
    },
    { 
      enabled: !!farmId,
      staleTime: 5 * 60 * 1000, // 5 minutes - feeding data changes more frequently
      background: true,
    }
  );
}

// Optimized dashboard summary with minimal data
export function useOptimizedDashboardSummary(farmId?: string) {
  return useOptimizedSupabaseQuery(
    ['dashboard-summary', farmId],
    async () => {
      // Get basic counts and metrics in one query
      const { data: summary, error } = await supabase
        .from('active_pond_summary')
        .select('pond_batch_id, current_population, latest_weight, current_biomass, doc')
        .eq('farm_id', farmId!);
      
      if (error) return { data: null, error };
      
      // Calculate aggregated metrics
      const activePonds = summary?.length || 0;
      const totalBiomass = summary?.reduce((sum, item) => sum + (item.current_biomass || 0), 0) || 0;
      const avgWeight = summary?.length 
        ? summary.reduce((sum, item) => sum + (item.latest_weight || 0), 0) / summary.length
        : 0;
      
      return {
        data: {
          activePonds,
          totalBiomass,
          avgWeight,
          summary
        },
        error: null
      };
    },
    { 
      enabled: !!farmId,
      staleTime: 10 * 60 * 1000, // 10 minutes
      background: true,
    }
  );
}

// Optimized biometry data with pagination
export function useOptimizedBiometryHistory(farmId?: string, limit = 10) {
  return useOptimizedSupabaseQuery(
    ['biometry-history-optimized', farmId, limit.toString()],
    async () => {
      const { data, error } = await supabase
        .from('biometrics')
        .select(`
          id,
          measurement_date,
          average_weight,
          pond_batch_id,
          pond_batches!inner(
            ponds!inner(name, farm_id),
            batches!inner(name)
          )
        `)
        .eq('pond_batches.ponds.farm_id', farmId!)
        .order('measurement_date', { ascending: false })
        .limit(limit);
      
      return { data, error };
    },
    { 
      enabled: !!farmId,
      staleTime: 15 * 60 * 1000, // 15 minutes
    }
  );
}

// Optimized feeding records with pagination and date range
export function useOptimizedFeedingHistory(farmId?: string, days = 30, limit = 50) {
  return useOptimizedSupabaseQuery(
    ['feeding-history-optimized', farmId, days.toString(), limit.toString()],
    async () => {
      const dateThreshold = new Date();
      dateThreshold.setDate(dateThreshold.getDate() - days);
      
      const { data, error } = await supabase
        .from('feeding_records')
        .select(`
          id,
          feeding_date,
          feeding_time,
          actual_amount,
          planned_amount,
          unit_cost,
          feed_type_name,
          pond_batch_id
        `)
        .gte('feeding_date', dateThreshold.toISOString().split('T')[0])
        .order('feeding_date', { ascending: false })
        .order('feeding_time', { ascending: false })
        .limit(limit);
      
      return { data, error };
    },
    { 
      enabled: !!farmId,
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  );
}

// Optimized inventory with filtering and caching
export function useOptimizedInventory(farmId?: string) {
  return useOptimizedSupabaseQuery(
    ['inventory-optimized', farmId],
    async () => {
      const { data, error } = await supabase
        .from('inventory')
        .select('id, name, category, quantity, unit_price, minimum_stock_threshold')
        .eq('farm_id', farmId!)
        .order('name');
      
      return { data, error };
    },
    { 
      enabled: !!farmId,
      staleTime: 20 * 60 * 1000, // 20 minutes - inventory changes less frequently
    }
  );
}

// Optimized management data with smart batching
export function useOptimizedRecentManagementData(farmId?: string) {
  return useOptimizedSupabaseQuery(
    ['recent-management-optimized', farmId],
    async () => {
      if (!farmId) return { data: null, error: null };
      
      // Parallel queries for better performance
      const [biometrics, waterQuality, mortality, harvests] = await Promise.all([
        supabase
          .from('biometrics')
          .select('measurement_date, average_weight, pond_batches!inner(ponds!inner(name, farm_id))')
          .eq('pond_batches.ponds.farm_id', farmId)
          .order('measurement_date', { ascending: false })
          .limit(4),
        
        supabase
          .from('water_quality')
          .select('measurement_date, ph_level, temperature, ponds!inner(name, farm_id)')
          .eq('ponds.farm_id', farmId)
          .order('measurement_date', { ascending: false })
          .limit(4),
        
        supabase
          .from('mortality_records')
          .select('record_date, dead_count, pond_batches!inner(ponds!inner(name, farm_id))')
          .eq('pond_batches.ponds.farm_id', farmId)
          .order('record_date', { ascending: false })
          .limit(4),
        
        supabase
          .from('harvest_records')
          .select('harvest_date, biomass_harvested, pond_batches!inner(ponds!inner(name, farm_id))')
          .eq('pond_batches.ponds.farm_id', farmId)
          .order('harvest_date', { ascending: false })
          .limit(4)
      ]);
      
      return {
        data: {
          biometrics: biometrics.data || [],
          waterQuality: waterQuality.data || [],
          mortality: mortality.data || [],
          harvests: harvests.data || [],
        },
        error: null
      };
    },
    { 
      enabled: !!farmId,
      staleTime: 10 * 60 * 1000, // 10 minutes
    }
  );
}