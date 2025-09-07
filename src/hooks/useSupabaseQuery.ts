import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export function useSupabaseQuery<T>(
  queryKey: string[],
  queryFn: () => Promise<{ data: T | null; error: any }>,
  options?: {
    enabled?: boolean;
    staleTime?: number;
    gcTime?: number;
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
    staleTime: options?.staleTime || 5 * 60 * 1000, // 5 minutes
    gcTime: options?.gcTime || 10 * 60 * 1000, // 10 minutes
  });
}

export function useFarmsQuery() {
  const { user } = useAuth();
  
  return useSupabaseQuery(
    ['farms'],
    async () => {
      const result = await supabase
        .from('farms')
        .select('*')
        .eq('user_id', user?.id);
      return result;
    },
    { staleTime: 10 * 60 * 1000 } // Cache farms longer
  );
}

export function useActivePondsQuery(farmId?: string) {
  return useSupabaseQuery(
    ['active-ponds', farmId],
    async () => {
      const result = await supabase
        .from('ponds')
        .select(`
          *,
          pond_batches!inner(
            id,
            current_population,
            stocking_date,
            cycle_status,
            batches!inner(name),
            biometrics(
              average_weight,
              measurement_date,
              uniformity,
              created_at
            ),
            mortality_records(
              dead_count,
              record_date
            )
          )
        `)
        .eq('farm_id', farmId!)
        .eq('status', 'in_use')
        .eq('pond_batches.cycle_status', 'active')
        .gt('pond_batches.current_population', 0)
        .order('name');
      return result;
    },
    { enabled: !!farmId }
  );
}

export function useInventoryQuery(farmId?: string) {
  return useSupabaseQuery(
    ['inventory', farmId],
    async () => {
      const result = await supabase
        .from('inventory')
        .select('*')
        .eq('farm_id', farmId!)
        .order('entry_date', { ascending: false });
      return result;
    },
    { enabled: !!farmId }
  );
}

export function useWaterQualityQuery(pondIds: string[]) {
  return useSupabaseQuery(
    ['water-quality', pondIds.join(',')],
    async () => {
      const result = await supabase
        .from('water_quality')
        .select('*')
        .in('pond_id', pondIds)
        .order('measurement_date', { ascending: false })
        .limit(10);
      return result;
    },
    { enabled: pondIds.length > 0 }
  );
}

export function useBiometryHistoryQuery(farmId?: string) {
  return useSupabaseQuery(
    ['biometry-history', farmId],
    async () => {
      const result = await supabase
        .from('biometrics')
        .select(`
          *,
          pond_batches!inner(
            ponds!inner(name, farm_id),
            batches!inner(name)
          )
        `)
        .eq('pond_batches.ponds.farm_id', farmId!)
        .order('created_at', { ascending: false });
      return result;
    },
    { enabled: !!farmId }
  );
}