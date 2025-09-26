import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export function useTechnicianFarmData(farmId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['technician-farm-data', farmId, user?.id],
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

      // Buscar dados da fazenda
      const { data: farmData, error: farmError } = await supabase
        .from('farms')
        .select('id, name, location, total_area, created_at')
        .eq('id', farmId)
        .single();

      if (farmError) throw farmError;

      return farmData;
    },
    enabled: !!user?.email && !!farmId,
  });
}