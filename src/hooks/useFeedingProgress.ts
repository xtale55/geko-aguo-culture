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
      const result = await supabase
        .from('feeding_records')
        .select(`
          planned_amount,
          actual_amount,
          pond_batches!inner(
            ponds!inner(farm_id)
          )
        `)
        .eq('pond_batches.ponds.farm_id', farmId!)
        .eq('feeding_date', today);
      
      return result;
    },
    { enabled: !!farmId }
  );
}

export function useFeedingProgressStats(farmId?: string): FeedingProgress {
  const { data: feedingRecords } = useFeedingProgress(farmId);
  
  return useMemo(() => {
    if (!feedingRecords || feedingRecords.length === 0) {
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