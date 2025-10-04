import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface CreateEvaluationParams {
  pondBatchId: string;
  amountOffered: number;
  consumptionEvaluation: string;
  leftoverPercentage?: number;
  adjustmentAmount: number;
  adjustmentPercentage: number;
  notes?: string;
}

export function useFeedingEvaluations(pondBatchId?: string) {
  const queryClient = useQueryClient();

  const { data: evaluations, isLoading } = useQuery({
    queryKey: ['feeding-evaluations', pondBatchId],
    queryFn: async () => {
      if (!pondBatchId) return [];

      const { data, error } = await supabase
        .from('feeding_evaluations')
        .select('*')
        .eq('pond_batch_id', pondBatchId)
        .order('evaluation_date', { ascending: false })
        .order('evaluation_time', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!pondBatchId,
  });

  const createEvaluation = useMutation({
    mutationFn: async (params: CreateEvaluationParams) => {
      const { data, error } = await supabase
        .from('feeding_evaluations')
        .insert({
          pond_batch_id: params.pondBatchId,
          amount_offered: params.amountOffered,
          consumption_evaluation: params.consumptionEvaluation,
          leftover_percentage: params.leftoverPercentage,
          adjustment_amount: params.adjustmentAmount,
          adjustment_percentage: params.adjustmentPercentage,
          notes: params.notes,
          evaluated_by: (await supabase.auth.getUser()).data.user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feeding-evaluations'] });
    },
  });

  return {
    evaluations: evaluations || [],
    isLoading,
    createEvaluation: createEvaluation.mutateAsync,
  };
}
