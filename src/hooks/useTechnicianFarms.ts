import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export function useTechnicianFarms() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['technician-farms', user?.id],
    queryFn: async () => {
      if (!user?.email) return [];

      // First get farm_employees for this technician
      const { data: employeeData, error: employeeError } = await supabase
        .from('farm_employees')
        .select('farm_id, role')
        .eq('email', user.email)
        .eq('role', 'Técnico')
        .eq('status', 'ativo');

      if (employeeError) throw employeeError;
      if (!employeeData || employeeData.length === 0) return [];

      // Get farm IDs
      const farmIds = employeeData.map(emp => emp.farm_id);

      // Then get farm details
      const { data: farmsData, error: farmsError } = await supabase
        .from('farms')
        .select('id, name, location, total_area, created_at')
        .in('id', farmIds);

      if (farmsError) throw farmsError;

      // Combine the data
      return employeeData.map(emp => ({
        farm_id: emp.farm_id,
        role: emp.role,
        farms: farmsData?.find(farm => farm.id === emp.farm_id) || null
      }));
    },
    enabled: !!user?.email,
  });
}