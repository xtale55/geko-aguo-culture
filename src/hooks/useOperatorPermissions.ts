import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export function useOperatorPermissions() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['operator-permissions', user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data } = await supabase
        .from('operator_permissions')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      return data;
    },
    enabled: !!user
  });
}
