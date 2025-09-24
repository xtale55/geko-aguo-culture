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
  // Use local date to avoid timezone issues
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split('T')[0];
  
  return useSupabaseQuery(
    ['feeding-progress', farmId, todayStr],
    async () => {
      if (!farmId) {
        return { data: [], error: null };
      }

      console.log('Fetching feeding progress for farm:', farmId, 'date:', todayStr);

      // Get all ponds for this farm
      const pondsResult = await supabase
        .from('ponds')
        .select('id')
        .eq('farm_id', farmId);

      if (pondsResult.error) {
        console.error('Error fetching ponds:', pondsResult.error);
        throw pondsResult.error;
      }

      if (!pondsResult.data?.length) {
        console.log('No ponds found for farm');
        return { data: [], error: null };
      }

      const pondIds = pondsResult.data.map(p => p.id);

      // Get active pond_batches for these ponds
      const pondBatchesResult = await supabase
        .from('pond_batches')
        .select('id')
        .in('pond_id', pondIds)
        .eq('cycle_status', 'active');

      if (pondBatchesResult.error) {
        console.error('Error fetching pond batches:', pondBatchesResult.error);
        throw pondBatchesResult.error;
      }

      if (!pondBatchesResult.data?.length) {
        console.log('No active pond batches found');
        return { data: [], error: null };
      }

      const pondBatchIds = pondBatchesResult.data.map(pb => pb.id);

      // Get feeding records for today
      const feedingResult = await supabase
        .from('feeding_records')
        .select('planned_amount, actual_amount, pond_batch_id')
        .in('pond_batch_id', pondBatchIds)
        .eq('feeding_date', todayStr);
      
      if (feedingResult.error) {
        console.error('Error fetching feeding records:', feedingResult.error);
        throw feedingResult.error;
      }

      console.log('Found feeding records:', feedingResult.data?.length || 0);
      console.log('Feeding records data:', feedingResult.data);
      
      return feedingResult;
    },
    { 
      enabled: !!farmId,
      staleTime: 30 * 1000 // 30 segundos para dados de alimentação
    }
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