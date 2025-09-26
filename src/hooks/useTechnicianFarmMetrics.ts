import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export function useTechnicianFarmMetrics(farmId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['technician-farm-metrics', farmId, user?.id],
    queryFn: async () => {
      if (!user?.email || !farmId) return null;

      // Verificar se o usuário é técnico desta fazenda
      const { data: employeeData, error: employeeError } = await supabase
        .from('farm_employees')
        .select('farm_id')
        .eq('email', user.email)
        .eq('farm_id', farmId)
        .eq('role', 'Técnico')
        .eq('status', 'ativo')
        .single();

      if (employeeError || !employeeData) {
        throw new Error('Acesso negado a esta fazenda');
      }

      // Buscar total de viveiros
      const { data: totalPondsData, error: pondsError } = await supabase
        .from('ponds')
        .select('id')
        .eq('farm_id', farmId);

      if (pondsError) throw pondsError;

      // Buscar viveiros ativos com dados
      const { data: activePondsData, error: activePondsError } = await supabase
        .from('pond_batches')
        .select(`
          id,
          current_population,
          stocking_date,
          ponds!inner(
            id,
            name,
            farm_id
          ),
          batches!inner(
            survival_rate
          ),
          biometrics(
            average_weight,
            measurement_date
          )
        `)
        .eq('ponds.farm_id', farmId)
        .eq('cycle_status', 'active');

      if (activePondsError) throw activePondsError;

      // Calcular métricas
      const totalPonds = totalPondsData?.length || 0;
      const activePonds = activePondsData?.length || 0;
      
      let totalPopulation = 0;
      let totalBiomass = 0;
      let totalSurvivalRate = 0;

      activePondsData?.forEach((pond) => {
        const latestBiometry = pond.biometrics
          ?.sort((a, b) => new Date(b.measurement_date).getTime() - new Date(a.measurement_date).getTime())[0];
        
        const latestWeight = latestBiometry?.average_weight || 1;
        const biomass = (pond.current_population * latestWeight) / 1000;
        
        totalPopulation += pond.current_population;
        totalBiomass += biomass;
        totalSurvivalRate += pond.batches?.survival_rate || 85;
      });

      const averageSurvivalRate = activePonds > 0 ? totalSurvivalRate / activePonds : 0;

      return {
        totalPonds,
        activePonds,
        totalPopulation,
        totalBiomass,
        averageSurvivalRate
      };
    },
    enabled: !!user?.email && !!farmId,
  });
}