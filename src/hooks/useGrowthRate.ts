import { useMemo } from 'react';
import { useSupabaseQuery } from './useSupabaseQuery';
import { supabase } from '@/integrations/supabase/client';

interface GrowthRateData {
  weeklyGrowthRate: number;
  activePonds: number;
  averageWeight: number;
  trend: 'up' | 'down' | 'stable';
}

export function useGrowthRateData(farmId?: string) {
  return useSupabaseQuery(
    ['growth-rate', farmId],
    async () => {
      const result = await supabase
        .from('biometrics')
        .select(`
          average_weight,
          measurement_date,
          pond_batches!inner(
            stocking_date,
            ponds!inner(farm_id)
          )
        `)
        .eq('pond_batches.ponds.farm_id', farmId!)
        .gte('measurement_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .order('measurement_date', { ascending: false });
      
      return result;
    },
    { enabled: !!farmId }
  );
}

export function useGrowthRate(farmId?: string): GrowthRateData {
  const { data: biometrics, isLoading, error } = useGrowthRateData(farmId);
  
  return useMemo(() => {
    if (isLoading || error || !biometrics || biometrics.length < 2) {
      return {
        weeklyGrowthRate: 0,
        activePonds: 0,
        averageWeight: 0,
        trend: 'stable'
      };
    }
    
    // Group biometrics by pond and calculate growth rates
    const pondGrowthRates: number[] = [];
    const pondsMap = new Map();
    
    biometrics.forEach(bio => {
      const pondBatch = bio.pond_batches as any;
      const pondId = pondBatch?.id;
      if (!pondId) return;
      
      if (!pondsMap.has(pondId)) {
        pondsMap.set(pondId, []);
      }
      pondsMap.get(pondId).push(bio);
    });
    
    pondsMap.forEach(pondBiometrics => {
      if (pondBiometrics.length < 2) return;
      
      // Sort by date
      pondBiometrics.sort((a: any, b: any) => 
        new Date(a.measurement_date).getTime() - new Date(b.measurement_date).getTime()
      );
      
      const latest = pondBiometrics[pondBiometrics.length - 1];
      const previous = pondBiometrics[pondBiometrics.length - 2];
      
      const daysDiff = (new Date(latest.measurement_date).getTime() - 
                       new Date(previous.measurement_date).getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysDiff > 0) {
        const weightGrowth = latest.average_weight - previous.average_weight;
        const dailyGrowthRate = (weightGrowth / previous.average_weight) * 100 / daysDiff;
        const weeklyGrowthRate = dailyGrowthRate * 7;
        
        if (weeklyGrowthRate > -50 && weeklyGrowthRate < 200) { // Sanity check
          pondGrowthRates.push(weeklyGrowthRate);
        }
      }
    });
    
    const averageGrowthRate = pondGrowthRates.length > 0 
      ? pondGrowthRates.reduce((sum, rate) => sum + rate, 0) / pondGrowthRates.length
      : 0;
    
    const averageWeight = biometrics.reduce((sum, bio) => sum + bio.average_weight, 0) / biometrics.length;
    
    const trend = averageGrowthRate > 5 ? 'up' : averageGrowthRate < -2 ? 'down' : 'stable';
    
    return {
      weeklyGrowthRate: Math.round(averageGrowthRate * 10) / 10,
      activePonds: pondsMap.size,
      averageWeight: Math.round(averageWeight * 10) / 10,
      trend
    };
  }, [biometrics]);
}