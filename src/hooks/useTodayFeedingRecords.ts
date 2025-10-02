import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface TodayFeedingRecord {
  id: string;
  pond_batch_id: string;
  feeding_date: string;
  feeding_time: string;
  actual_amount: number;
  feed_type_name?: string;
  consumption_evaluation?: string;
}

export function useTodayFeedingRecords(pondBatchId?: string) {
  return useQuery({
    queryKey: ['today-feeding-records', pondBatchId],
    queryFn: async () => {
      if (!pondBatchId) return [];

      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('feeding_records')
        .select('id, pond_batch_id, feeding_date, feeding_time, actual_amount, feed_type_name, consumption_evaluation')
        .eq('pond_batch_id', pondBatchId)
        .eq('feeding_date', today)
        .order('feeding_time', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!pondBatchId,
  });
}

export function useUnevaluatedFeedings(pondBatchId?: string) {
  return useQuery({
    queryKey: ['unevaluated-feedings', pondBatchId],
    queryFn: async () => {
      if (!pondBatchId) return [];

      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('feeding_records')
        .select('id, feeding_date, feeding_time, actual_amount, feed_type_name')
        .eq('pond_batch_id', pondBatchId)
        .eq('feeding_date', today)
        .is('consumption_evaluation', null)
        .order('feeding_time', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!pondBatchId,
  });
}

export function useLastEvaluationTime(pondBatchId?: string) {
  return useQuery({
    queryKey: ['last-evaluation-time', pondBatchId],
    queryFn: async () => {
      if (!pondBatchId) return null;

      const { data, error } = await supabase
        .from('feeding_evaluations')
        .select('evaluation_date, evaluation_time')
        .eq('pond_batch_id', pondBatchId)
        .order('evaluation_date', { ascending: false })
        .order('evaluation_time', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        const date = new Date(data.evaluation_date);
        return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) + ' ' + data.evaluation_time.substring(0, 5);
      }
      
      return null;
    },
    enabled: !!pondBatchId,
  });
}
