import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export function useTechnicianFarms() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['technician-farms', user?.id],
    queryFn: async () => {
      if (!user?.email) return [];

      const { data, error } = await supabase
        .from('farm_employees')
        .select(`
          farm_id,
          role,
          farms!farm_employees_farm_id_fkey (
            id,
            name,
            location,
            total_area,
            created_at
          )
        `)
        .eq('email', user.email)
        .eq('role', 'Técnico')
        .eq('status', 'ativo');

      if (error) throw error;
      return data;
    },
    enabled: !!user?.email,
  });
}