import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export function useOperatorPermissions() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['operator-permissions', user?.id],
    queryFn: async () => {
      if (!user) return null;

      // Buscar permissões com dados da fazenda
      const { data: permissions } = await supabase
        .from('operator_permissions')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      // Buscar membership como fallback
      const { data: membership } = await supabase
        .from('organization_members')
        .select('farm_id')
        .eq('user_id', user.id)
        .maybeSingle();

      const farmId = permissions?.farm_id || membership?.farm_id;
      
      if (!farmId) return null;

      // Buscar dados da fazenda
      const { data: farm } = await supabase
        .from('farms')
        .select('id, name')
        .eq('id', farmId)
        .maybeSingle();

      return {
        ...permissions,
        farm_id: farmId,
        farm_name: farm?.name || null
      };
    },
    enabled: !!user
  });
}
