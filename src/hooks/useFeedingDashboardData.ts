import { useMemo } from 'react';
import { useSupabaseQuery } from './useSupabaseQuery';
import { supabase } from '@/integrations/supabase/client';

interface FeedingDashboardData {
  totalPlanned: number;    // kg
  totalActual: number;     // kg  
  percentage: number;      // %
  isComplete: boolean;     // >= 100%
  activePonds: number;     // quantity
}

interface PondBatchData {
  pond_id: string;
  pond_name: string;
  pond_batch_id: string;
  current_population: number;
  stocking_date: string;
  pl_size: number;
  latest_biometry?: {
    average_weight: number;
  };
}

export function useFeedingDashboardData(farmId?: string) {
  // Get today's date string
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split('T')[0];
  
  return useSupabaseQuery(
    ['feeding-dashboard-data', farmId, todayStr],
    async () => {
      if (!farmId) {
        return { 
          data: { 
            totalPlanned: 0, 
            totalActual: 0, 
            percentage: 0, 
            isComplete: false, 
            activePonds: 0 
          }, 
          error: null 
        };
      }

      // Get active ponds with batch and biometry data (similar to Feeding page)
      const { data: pondsData, error: pondsError } = await supabase
        .from('ponds')
        .select(`
          id,
          name,
          pond_batches!inner(
            id,
            current_population,
            stocking_date,
            cycle_status,
            created_at,
            batches!inner(name, pl_size),
            biometrics(
              average_weight,
              measurement_date,
              created_at
            )
          )
        `)
        .eq('farm_id', farmId)
        .eq('status', 'in_use')
        .eq('pond_batches.cycle_status', 'active')
        .order('name');

      if (pondsError) {
        throw pondsError;
      }

      // Process pond data - get only the most recent active batch per pond
      const pondBatchesData: PondBatchData[] = [];
      
      if (pondsData) {
        pondsData.forEach(pond => {
          // Sort pond batches by created_at DESC to get the most recent first
          const sortedBatches = pond.pond_batches
            .filter(batch => batch.cycle_status === 'active')
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          
          const latestBatch = sortedBatches[0];
          
          if (latestBatch) {
            const latestBiometry = latestBatch.biometrics
              .sort((a, b) => new Date(b.created_at || b.measurement_date).getTime() - new Date(a.created_at || a.measurement_date).getTime())[0];
            
            pondBatchesData.push({
              pond_id: pond.id,
              pond_name: pond.name,
              pond_batch_id: latestBatch.id,
              current_population: latestBatch.current_population,
              stocking_date: latestBatch.stocking_date,
              pl_size: latestBatch.batches.pl_size,
              latest_biometry: latestBiometry ? { average_weight: latestBiometry.average_weight } : undefined
            });
          }
        });
      }

      // Calculate planned feed for each pond
      let totalPlanned = 0;
      
      for (const pondBatch of pondBatchesData) {
        // Calculate weight: use biometry if available, otherwise estimate from pl_size
        let averageWeight = 0;
        
        if (pondBatch.latest_biometry) {
          averageWeight = pondBatch.latest_biometry.average_weight;
        } else if (pondBatch.pl_size) {
          // Calculate initial weight from pl_size (1g / pl_size)
          averageWeight = 1 / pondBatch.pl_size;
        }
        
        if (averageWeight > 0) {
          const biomass = (pondBatch.current_population * averageWeight) / 1000; // kg
          
          // Get feeding rate for this pond
          const feedingRate = await getFeedingRate(pondBatch.pond_batch_id, averageWeight, farmId);
          const dailyFeed = biomass * (feedingRate / 100);
          
          totalPlanned += dailyFeed;
        }
      }

      // Get actual feeding records for today
      const pondBatchIds = pondBatchesData.map(pb => pb.pond_batch_id);
      let totalActual = 0;
      
      if (pondBatchIds.length > 0) {
        const { data: feedingRecords, error: feedingError } = await supabase
          .from('feeding_records')
          .select('actual_amount')
          .in('pond_batch_id', pondBatchIds)
          .eq('feeding_date', todayStr);

        if (feedingError) {
          throw feedingError;
        }

        totalActual = feedingRecords?.reduce((sum, record) => 
          sum + (record.actual_amount / 1000), 0) || 0; // Convert to kg
      }

      const percentage = totalPlanned > 0 ? Math.round((totalActual / totalPlanned) * 100) : 0;

      return {
        data: {
          totalPlanned,
          totalActual,
          percentage: Math.min(percentage, 100),
          isComplete: percentage >= 100,
          activePonds: pondBatchesData.length
        },
        error: null
      };
    },
    { enabled: !!farmId }
  );
}

// Helper function to get feeding rate (copied from Feeding page)
async function getFeedingRate(pondBatchId: string, weight: number, farmId: string): Promise<number> {
  try {
    // First check for pond-specific rates
    const { data: pondSpecific } = await supabase
      .from('feeding_rates')
      .select('feeding_percentage')
      .eq('pond_batch_id', pondBatchId)
      .lte('weight_range_min', weight)
      .gte('weight_range_max', weight)
      .order('weight_range_min', { ascending: false })
      .limit(1);

    if (pondSpecific && pondSpecific.length > 0) {
      return pondSpecific[0].feeding_percentage;
    }

    // Then check for farm templates
    const { data: farmTemplate } = await supabase
      .from('feeding_rates')
      .select('feeding_percentage')
      .eq('farm_id', farmId)
      .is('pond_batch_id', null)
      .lte('weight_range_min', weight)
      .gte('weight_range_max', weight)
      .order('weight_range_min', { ascending: false })
      .limit(1);

    if (farmTemplate && farmTemplate.length > 0) {
      return farmTemplate[0].feeding_percentage;
    }
  } catch (error) {
    console.error('Error getting feeding rate:', error);
  }

  // Default feeding rate based on weight
  if (weight < 1) return 10;
  if (weight < 5) return 8;
  if (weight < 10) return 6;
  if (weight < 20) return 4;
  return 3;
}

export function useFeedingDashboardStats(farmId?: string): FeedingDashboardData {
  const { data: feedingData, isLoading, error } = useFeedingDashboardData(farmId);
  
  return useMemo(() => {
    if (isLoading || error || !feedingData) {
      return {
        totalPlanned: 0,
        totalActual: 0,
        percentage: 0,
        isComplete: false,
        activePonds: 0
      };
    }
    
    return feedingData;
  }, [feedingData, isLoading, error]);
}