import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export function useTechnicianFarms() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['technician-farms', user?.id],
    queryFn: async () => {
      if (!user?.email) {
        console.log('❌ useTechnicianFarms: Sem email do usuário');
        return [];
      }

      console.log('🔍 useTechnicianFarms: Buscando fazendas para email:', user.email);

      // First get farm_employees for this technician
      const { data: employeeData, error: employeeError } = await supabase
        .from('farm_employees')
        .select('farm_id, role, email, name')
        .eq('email', user.email)
        .eq('role', 'Técnico')
        .eq('status', 'ativo');

      console.log('📋 farm_employees query result:', { employeeData, employeeError });

      if (employeeError) {
        console.error('❌ Erro ao buscar farm_employees:', employeeError);
        throw employeeError;
      }
      
      if (!employeeData || employeeData.length === 0) {
        console.log('⚠️ Nenhum registro encontrado na tabela farm_employees para este email');
        return [];
      }

      // Get farm IDs
      const farmIds = employeeData.map(emp => emp.farm_id);
      console.log('🏢 Farm IDs encontrados:', farmIds);

      // Then get farm details
      const { data: farmsData, error: farmsError } = await supabase
        .from('farms')
        .select('id, name, location, total_area, created_at')
        .in('id', farmIds);

      console.log('🏠 farms query result:', { farmsData, farmsError });

      if (farmsError) {
        console.error('❌ Erro ao buscar farms:', farmsError);
        throw farmsError;
      }

      // Combine the data
      const result = employeeData.map(emp => ({
        farm_id: emp.farm_id,
        role: emp.role,
        farms: farmsData?.find(farm => farm.id === emp.farm_id) || null
      }));

      console.log('✅ Resultado final do useTechnicianFarms:', result);
      return result;
    },
    enabled: !!user?.email,
  });
}