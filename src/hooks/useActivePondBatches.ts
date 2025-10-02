import { supabase } from '@/integrations/supabase/client';
import { useSupabaseQuery } from './useSupabaseQuery';

interface ActivePondBatch {
  pond_batch_id: string;
  pond_id: string;
  pond_name: string;
  batch_id: string;
  batch_name: string;
  current_population: number;
  stocking_date: string;
}

export function useActivePondBatches(farmId?: string) {
  return useSupabaseQuery(
    ['active-pond-batches', farmId],
    async () => {
      if (!farmId) {
        return { data: [], error: null };
      }

      const { data, error } = await supabase
        .from('pond_batches')
        .select(`
          id,
          pond_id,
          batch_id,
          current_population,
          stocking_date,
          cycle_status,
          ponds!inner (
            id,
            name,
            farm_id
          ),
          batches!inner (
            id,
            name
          )
        `)
        .eq('ponds.farm_id', farmId)
        .eq('cycle_status', 'active')
        .order('ponds.name');

      if (error) throw error;

      const activePonds: ActivePondBatch[] = (data || []).map((pb: any) => ({
        pond_batch_id: pb.id,
        pond_id: pb.ponds.id,
        pond_name: pb.ponds.name,
        batch_id: pb.batches.id,
        batch_name: pb.batches.name,
        current_population: pb.current_population,
        stocking_date: pb.stocking_date,
      }));

      return { data: activePonds, error: null };
    },
    { 
      enabled: !!farmId,
    }
  );
}
