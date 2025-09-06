import { useSupabaseQuery } from './useSupabaseQuery';
import { supabase } from '@/integrations/supabase/client';

export function useRecentManagementData(farmId?: string) {
  // Recent biometrics
  const { data: recentBiometrics } = useSupabaseQuery(
    ['recent-biometrics', farmId],
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
        .order('created_at', { ascending: false })
        .limit(4);
      return result;
    },
    { enabled: !!farmId }
  );

  // Recent water quality
  const { data: recentWaterQuality } = useSupabaseQuery(
    ['recent-water-quality', farmId],
    async () => {
      const result = await supabase
        .from('water_quality')
        .select(`
          *,
          ponds!inner(name, farm_id)
        `)
        .eq('ponds.farm_id', farmId!)
        .order('created_at', { ascending: false })
        .limit(4);
      return result;
    },
    { enabled: !!farmId }
  );

  // Recent input applications
  const { data: recentInputs } = useSupabaseQuery(
    ['recent-inputs', farmId],
    async () => {
      const result = await supabase
        .from('input_applications')
        .select(`
          *,
          pond_batches!inner(
            ponds!inner(name, farm_id),
            batches!inner(name)
          )
        `)
        .eq('pond_batches.ponds.farm_id', farmId!)
        .order('created_at', { ascending: false })
        .limit(4);
      return result;
    },
    { enabled: !!farmId }
  );

  // Recent mortality records
  const { data: recentMortality } = useSupabaseQuery(
    ['recent-mortality', farmId],
    async () => {
      const result = await supabase
        .from('mortality_records')
        .select(`
          *,
          pond_batches!inner(
            ponds!inner(name, farm_id),
            batches!inner(name)
          )
        `)
        .eq('pond_batches.ponds.farm_id', farmId!)
        .order('created_at', { ascending: false })
        .limit(4);
      return result;
    },
    { enabled: !!farmId }
  );

  // Recent harvest records
  const { data: recentHarvest } = useSupabaseQuery(
    ['recent-harvest', farmId],
    async () => {
      const result = await supabase
        .from('harvest_records')
        .select(`
          *,
          pond_batches!inner(
            ponds!inner(name, farm_id),
            batches!inner(name)
          )
        `)
        .eq('pond_batches.ponds.farm_id', farmId!)
        .order('created_at', { ascending: false })
        .limit(4);
      return result;
    },
    { enabled: !!farmId }
  );

  // Recent operational costs
  const { data: recentCosts } = useSupabaseQuery(
    ['recent-costs', farmId],
    async () => {
      const result = await supabase
        .from('operational_costs')
        .select('*')
        .eq('farm_id', farmId!)
        .order('created_at', { ascending: false })
        .limit(4);
      return result;
    },
    { enabled: !!farmId }
  );

  return {
    recentBiometrics: recentBiometrics || [],
    recentWaterQuality: recentWaterQuality || [],
    recentInputs: recentInputs || [],
    recentMortality: recentMortality || [],
    recentHarvest: recentHarvest || [],
    recentCosts: recentCosts || []
  };
}