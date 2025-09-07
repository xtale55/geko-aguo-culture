import { useMemo } from 'react';
import { useSupabaseQuery } from './useSupabaseQuery';
import { supabase } from '@/integrations/supabase/client';

interface FeedingProgress {
  totalPlanned: number;
  totalActual: number;
  percentage: number;
  isComplete: boolean;
}

export function useFeedingProgress(farmId?: string) {
  const today = new Date().toISOString().split('T')[0];
  
  return useSupabaseQuery(
    ['feeding-progress', farmId, today],
    async () => {
      // First get all pond_batches for this farm
      const pondBatchesResult = await supabase
        .from('pond_batches')
        .select(`
          id,
          ponds!inner(farm_id)
        `)
        .eq('ponds.farm_id', farmId!)
        .eq('cycle_status', 'active');

      if (pondBatchesResult.error) {
        throw pondBatchesResult.error;
      }

      const pondBatchIds = pondBatchesResult.data?.map(pb => pb.id) || [];
      
      if (pondBatchIds.length === 0) {
        return { data: [], error: null };
      }

      // Then get feeding records for those pond batches
      const result = await supabase
        .from('feeding_records')
        .select('planned_amount, actual_amount, pond_batch_id')
        .in('pond_batch_id', pondBatchIds)
        .eq('feeding_date', today);
      
      return result;
    },
    { enabled: !!farmId }
  );
}

export function useFeedingProgressStats(farmId?: string): FeedingProgress {
  const { data: feedingRecords, isLoading, error } = useFeedingProgress(farmId);
  
  return useMemo(() => {
    if (isLoading || error || !feedingRecords || feedingRecords.length === 0) {
      return {
        totalPlanned: 0,
        totalActual: 0,
        percentage: 0,
        isComplete: false
      };
    }
    
    const totalPlanned = feedingRecords.reduce((sum, record) => 
      sum + (record.planned_amount / 1000), 0); // Convert to kg
    
    const totalActual = feedingRecords.reduce((sum, record) => 
      sum + (record.actual_amount / 1000), 0); // Convert to kg
    
    const percentage = totalPlanned > 0 ? Math.round((totalActual / totalPlanned) * 100) : 0;
    
    return {
      totalPlanned,
      totalActual,
      percentage: Math.min(percentage, 100),
      isComplete: percentage >= 100
    };
  }, [feedingRecords]);
}