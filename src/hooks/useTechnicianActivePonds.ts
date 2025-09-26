import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export function useTechnicianActivePonds(farmId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['technician-active-ponds', farmId, user?.id],
    queryFn: async () => {
      if (!user?.email || !farmId) return [];

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

      // Buscar viveiros ativos com dados do cultivo atual
      const { data, error } = await supabase
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
            id,
            name,
            survival_rate
          ),
          biometrics(
            average_weight,
            measurement_date
          )
        `)
        .eq('ponds.farm_id', farmId)
        .eq('cycle_status', 'active')
        .order('stocking_date', { ascending: false });

      if (error) throw error;

      // Processar dados para incluir métricas calculadas
      const processedData = data?.map((item) => {
        const latestBiometry = item.biometrics
          ?.sort((a, b) => new Date(b.measurement_date).getTime() - new Date(a.measurement_date).getTime())[0];
        
        const latestWeight = latestBiometry?.average_weight || 1;
        const currentBiomass = (item.current_population * latestWeight) / 1000;
        const doc = Math.floor((new Date().getTime() - new Date(item.stocking_date).getTime()) / (1000 * 60 * 60 * 24));
        
        // Calcular taxa de sobrevivência estimada (pode ser refinada com dados de mortalidade)
        const survivalRate = item.batches?.survival_rate || 85;

        return {
          id: item.id,
          pond_name: item.ponds?.name || '',
          batch_name: item.batches?.name || '',
          current_population: item.current_population,
          latest_weight: latestWeight,
          current_biomass: currentBiomass,
          doc,
          stocking_date: item.stocking_date,
          survival_rate: survivalRate
        };
      }) || [];

      return processedData;
    },
    enabled: !!user?.email && !!farmId,
  });
}