import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function usePondHistory(pondBatchId: string) {
  return useQuery({
    queryKey: ['pond-history', pondBatchId],
    queryFn: async () => {
      if (!pondBatchId) return null;

      // Buscar dados do cultivo atual
      const { data: currentCycle, error: currentError } = await supabase
        .from('pond_batches')
        .select(`
          id,
          current_population,
          stocking_date,
          cycle_status,
          ponds(name),
          batches(name, survival_rate),
          biometrics(
            id,
            average_weight,
            measurement_date,
            sample_size
          )
        `)
        .eq('id', pondBatchId)
        .single();

      if (currentError) throw currentError;

      // Calcular métricas do cultivo atual
      const latestBiometry = currentCycle.biometrics
        ?.sort((a, b) => new Date(b.measurement_date).getTime() - new Date(a.measurement_date).getTime())[0];
      
      const latestWeight = latestBiometry?.average_weight || 1;
      const currentBiomass = (currentCycle.current_population * latestWeight) / 1000;
      const doc = Math.floor((new Date().getTime() - new Date(currentCycle.stocking_date).getTime()) / (1000 * 60 * 60 * 24));
      
      const processedCurrentCycle = {
        ...currentCycle,
        batch_name: currentCycle.batches?.name || '',
        pond_name: currentCycle.ponds?.name || '',
        latest_weight: latestWeight,
        current_biomass: currentBiomass,
        doc,
        survival_rate: currentCycle.batches?.survival_rate || 85
      };

      // Buscar histórico de cultivos finalizados no mesmo viveiro
      const pondId = currentCycle.ponds ? currentCycle.ponds[0]?.id : null;
      let completedCycles = [];

      if (pondId) {
        const { data: completedData, error: completedError } = await supabase
          .from('pond_batches')
          .select(`
            id,
            stocking_date,
            final_population,
            final_biomass,
            final_average_weight,
            final_survival_rate,
            cycle_status,
            batches(name)
          `)
          .eq('pond_id', pondId)
          .eq('cycle_status', 'completed')
          .order('stocking_date', { ascending: false })
          .limit(5);

        if (completedError) throw completedError;

        completedCycles = completedData?.map(cycle => ({
          ...cycle,
          batch_name: cycle.batches?.name || ''
        })) || [];
      }

      return {
        currentCycle: processedCurrentCycle,
        biometrics: currentCycle.biometrics || [],
        completedCycles
      };
    },
    enabled: !!pondBatchId,
  });
}