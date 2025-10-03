import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useFeedingBaseAmount(pondBatchId?: string) {
  const queryClient = useQueryClient();

  const { data: baseAmount, isLoading } = useQuery({
    queryKey: ['feeding-base-amount', pondBatchId],
    queryFn: async () => {
      if (!pondBatchId) return null;

      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('feeding_base_amounts')
        .select('*')
        .eq('pond_batch_id', pondBatchId)
        .eq('date', today)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!pondBatchId,
  });

  const updateBaseAmount = useMutation({
    mutationFn: async ({ 
      pondBatchId, 
      baseAmountPerMeal, 
      lastEvaluationId 
    }: { 
      pondBatchId: string; 
      baseAmountPerMeal: number;
      lastEvaluationId?: string;
    }) => {
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('feeding_base_amounts')
        .upsert({
          pond_batch_id: pondBatchId,
          date: today,
          base_amount_per_meal: baseAmountPerMeal,
          last_evaluation_id: lastEvaluationId,
        }, {
          onConflict: 'pond_batch_id,date'
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feeding-base-amount'] });
    },
  });

  return {
    baseAmount: baseAmount?.base_amount_per_meal,
    isLoading,
    updateBaseAmount: updateBaseAmount.mutateAsync,
  };
}
