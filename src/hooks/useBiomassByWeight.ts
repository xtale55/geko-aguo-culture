import { useMemo } from 'react';
import { useSupabaseQuery } from './useSupabaseQuery';
import { supabase } from '@/integrations/supabase/client';

interface BiomassRange {
  range: string;
  biomass: number;
  pondCount: number;
}

export function useBiomassByWeightData(farmId?: string) {
  return useSupabaseQuery(
    ['biomass-by-weight', farmId],
    async () => {
      const result = await supabase
        .from('pond_batches')
        .select(`
          current_population,
          ponds!inner(farm_id, name),
          biometrics(
            average_weight,
            measurement_date
          )
        `)
        .eq('ponds.farm_id', farmId!)
        .eq('cycle_status', 'active')
        .gt('current_population', 0)
        .order('created_at', { ascending: false });
      
      return result;
    },
    { enabled: !!farmId }
  );
}

export function useBiomassByWeight(farmId?: string): BiomassRange[] {
  const { data: pondBatches } = useBiomassByWeightData(farmId);
  
  return useMemo(() => {
    if (!pondBatches || pondBatches.length === 0) {
      return [];
    }
    
    const biomassRanges = new Map<string, { biomass: number; pondCount: number }>();
    
    pondBatches.forEach(batch => {
      // Get latest biometry for this pond
      const latestBiometry = batch.biometrics?.sort((a: any, b: any) => 
        new Date(b.measurement_date).getTime() - new Date(a.measurement_date).getTime()
      )[0];
      
      if (!latestBiometry || !batch.current_population) return;
      
      const averageWeight = latestBiometry.average_weight;
      const biomassKg = (batch.current_population * averageWeight) / 1000;
      
      // Determine weight range
      let range: string;
      if (averageWeight <= 5) {
        range = '0-5g';
      } else {
        const lowerBound = Math.floor((averageWeight - 5) / 2) * 2 + 5;
        const upperBound = lowerBound + 2;
        range = `${lowerBound}-${upperBound}g`;
      }
      
      const existing = biomassRanges.get(range) || { biomass: 0, pondCount: 0 };
      biomassRanges.set(range, {
        biomass: existing.biomass + biomassKg,
        pondCount: existing.pondCount + 1
      });
    });
    
    // Convert to array and sort by weight range
    const rangesArray = Array.from(biomassRanges.entries()).map(([range, data]) => ({
      range,
      biomass: Math.round(data.biomass * 10) / 10,
      pondCount: data.pondCount
    }));
    
    // Sort by the lower bound of each range
    rangesArray.sort((a, b) => {
      const getMinWeight = (range: string) => {
        if (range === '0-5g') return 0;
        return parseInt(range.split('-')[0]);
      };
      
      return getMinWeight(a.range) - getMinWeight(b.range);
    });
    
    return rangesArray;
  }, [pondBatches]);
}