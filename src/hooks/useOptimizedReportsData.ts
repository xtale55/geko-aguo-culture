import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useMemo } from 'react';

export function useOptimizedReportsData(farmId?: string) {
  const { user } = useAuth();

  // Combined query for all reports data
  const { data: reportsData, isLoading, error } = useQuery({
    queryKey: ['reports-combined', farmId, user?.id],
    queryFn: async () => {
      if (!farmId) throw new Error('Farm ID required');

      // Execute all queries in parallel
      const [
        farmsResult,
        pondsResult,
        batchesResult,
        pondBatchesResult,
        biometricsResult,
        mortalityResult,
        feedingResult,
        harvestResult,
        inputApplicationsResult,
        operationalCostsResult
      ] = await Promise.all([
        supabase.from('farms').select('*').eq('user_id', user?.id),
        supabase.from('ponds').select('*').eq('farm_id', farmId),
        supabase.from('batches').select('*').eq('farm_id', farmId),
        supabase.from('pond_batches').select('*'),
        supabase.from('biometrics').select('*'),
        supabase.from('mortality_records').select('*'),
        supabase.from('feeding_records').select('*'),
        supabase.from('harvest_records').select('*'),
        supabase.from('input_applications').select('*'),
        supabase.from('operational_costs').select('*').eq('farm_id', farmId)
      ]);

      // Check for errors
      if (farmsResult.error) throw farmsResult.error;
      if (pondsResult.error) throw pondsResult.error;
      if (batchesResult.error) throw batchesResult.error;
      if (biometricsResult.error) throw biometricsResult.error;
      if (mortalityResult.error) throw mortalityResult.error;
      if (feedingResult.error) throw feedingResult.error;
      if (harvestResult.error) throw harvestResult.error;
      if (inputApplicationsResult.error) throw inputApplicationsResult.error;
      if (operationalCostsResult.error) throw operationalCostsResult.error;

      return {
        farms: farmsResult.data || [],
        ponds: pondsResult.data || [],
        batches: batchesResult.data || [],
        pondBatches: pondBatchesResult.data || [],
        biometrics: biometricsResult.data || [],
        mortality: mortalityResult.data || [],
        feeding: feedingResult.data || [],
        harvest: harvestResult.data || [],
        inputApplications: inputApplicationsResult.data || [],
        operationalCosts: operationalCostsResult.data || []
      };
    },
    enabled: !!farmId && !!user,
    staleTime: 2 * 60 * 1000, // 2 minutes for reports data
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  // Memoized processed data to avoid recalculations
  const processedData = useMemo(() => {
    if (!reportsData) return null;

    const { farms, ponds, batches, pondBatches, biometrics, mortality, feeding, harvest, inputApplications, operationalCosts } = reportsData;

    // Build lookup maps
    const pondsById = new Map<string, any>();
    ponds.forEach((p: any) => pondsById.set(p.id, p));

    const batchesById = new Map<string, any>();
    batches.forEach((b: any) => batchesById.set(b.id, b));

    const pbMeta = new Map<string, { pondName?: string; batchName?: string }>();
    pondBatches.forEach((pb: any) => {
      pbMeta.set(pb.id, {
        pondName: pondsById.get(pb.pond_id)?.name,
        batchName: batchesById.get(pb.batch_id)?.name,
      });
    });

    // Group data by pond batches for efficient processing
    const pondBatchMap = new Map<string, any>();
    
    
    // Process each data type and group by pond_batch_id
    biometrics.forEach((record: any) => {
      const pondBatchId = record.pond_batch_id;
      if (!pondBatchId) return;
      
      if (!pondBatchMap.has(pondBatchId)) {
        const meta = pbMeta.get(pondBatchId);
        pondBatchMap.set(pondBatchId, {
          pondName: meta?.pondName || 'N/A',
          batchName: meta?.batchName || 'N/A',
          biometrics: [],
          mortality: [],
          feeding: [],
          harvest: [],
          inputApplications: []
        });
      }
      pondBatchMap.get(pondBatchId).biometrics.push(record);
    });

    mortality.forEach((record: any) => {
      const pondBatchId = record.pond_batch_id;
      if (pondBatchId && pondBatchMap.has(pondBatchId)) {
        pondBatchMap.get(pondBatchId).mortality.push(record);
      }
    });

    feeding.forEach((record: any) => {
      const pondBatchId = record.pond_batch_id;
      if (pondBatchId && pondBatchMap.has(pondBatchId)) {
        pondBatchMap.get(pondBatchId).feeding.push(record);
      }
    });

    harvest.forEach((record: any) => {
      const pondBatchId = record.pond_batch_id;
      if (pondBatchId && pondBatchMap.has(pondBatchId)) {
        pondBatchMap.get(pondBatchId).harvest.push(record);
      }
    });

    inputApplications.forEach((record: any) => {
      const pondBatchId = record.pond_batch_id;
      if (pondBatchId && pondBatchMap.has(pondBatchId)) {
        pondBatchMap.get(pondBatchId).inputApplications.push(record);
      }
    });

    return {
      farms,
      ponds,
      batches,
      pondBatchMap,
      operationalCosts,
      rawData: reportsData
    };
  }, [reportsData]);

  return {
    data: processedData,
    isLoading,
    error,
    refetch: () => {
      // Invalidate and refetch
    }
  };
}

export function useActivePondsOptimized(farmId?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['active-ponds-optimized', farmId, user?.id],
    queryFn: async () => {
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
            )
          )
        `)
        .eq('farm_id', farmId!)
        .eq('status', 'in_use')
        .eq('pond_batches.cycle_status', 'active')
        .gt('pond_batches.current_population', 0)
        .order('name');

      if (result.error) throw result.error;
      return result.data;
    },
    enabled: !!farmId && !!user,
    staleTime: 3 * 60 * 1000, // 3 minutes for active ponds
    gcTime: 10 * 60 * 1000,
  });
}