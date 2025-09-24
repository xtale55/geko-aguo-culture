import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useRealtimeFeedingUpdates(farmId?: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!farmId) return;

    console.log('Setting up realtime feeding updates for farm:', farmId);

    // Configurar realtime para feeding_records
    const feedingChannel = supabase
      .channel('feeding-records-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'feeding_records'
        },
        (payload) => {
          console.log('Feeding record change detected:', payload);
          
          // Invalidar caches relacionados
          queryClient.invalidateQueries({ queryKey: ['feeding-dashboard-data', farmId] });
          queryClient.invalidateQueries({ queryKey: ['feeding-progress', farmId] });
          queryClient.invalidateQueries({ queryKey: ['feeding-records'] });
        }
      )
      .subscribe((status) => {
        console.log('Feeding realtime status:', status);
      });

    // Configurar realtime para inventory (atualizações de estoque)
    const inventoryChannel = supabase
      .channel('inventory-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'inventory'
        },
        (payload) => {
          console.log('Inventory change detected:', payload);
          
          // Invalidar cache de inventário
          queryClient.invalidateQueries({ queryKey: ['inventory', farmId] });
        }
      )
      .subscribe((status) => {
        console.log('Inventory realtime status:', status);
      });

    return () => {
      console.log('Cleaning up realtime subscriptions');
      supabase.removeChannel(feedingChannel);
      supabase.removeChannel(inventoryChannel);
    };
  }, [farmId, queryClient]);
}