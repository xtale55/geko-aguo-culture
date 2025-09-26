import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseQuery } from './useSupabaseQuery';

interface PendingEvaluation {
  id: string;
  pond_batch_id: string;
  feeding_date: string;
  feeding_time: string;
  actual_amount: number;
  planned_amount: number;
  pond_name: string;
  batch_name: string;
  evaluation_due_time: string;
}

export function usePendingFeedingEvaluations(farmId?: string) {
  return useSupabaseQuery(
    ['pending-feeding-evaluations', farmId],
    async () => {
      if (!farmId) {
        return { data: [], error: null };
      }

      // Get feeding records from today that need evaluation (2 hours after feeding time)
      const today = new Date().toISOString().split('T')[0];
      const now = new Date();
      
      const { data, error } = await supabase
        .from('feeding_records')
        .select(`
          id,
          pond_batch_id,
          feeding_date,
          feeding_time,
          actual_amount,
          planned_amount,
          consumption_evaluation
        `)
        .eq('feeding_date', today)
        .is('consumption_evaluation', null);

      if (error) throw error;

      // Get pond and batch info separately
      const recordsWithDetails = await Promise.all(
        (data || []).map(async (record) => {
          const { data: batchData } = await supabase
            .from('pond_batches')
            .select(`
              ponds!inner (
                name,
                farm_id
              ),
              batches!inner (
                name
              )
            `)
            .eq('id', record.pond_batch_id)
            .eq('ponds.farm_id', farmId)
            .single();

          return batchData ? {
            ...record,
            pond_name: batchData.ponds.name,
            batch_name: batchData.batches.name,
          } : null;
        })
      );

      if (error) throw error;

      // Filter records that are due for evaluation (2+ hours after feeding)
      const pendingEvaluations = recordsWithDetails
        .filter(record => record !== null)
        .map(record => {
          const feedingDateTime = new Date(`${record.feeding_date}T${record.feeding_time}`);
          const evaluationDueTime = new Date(feedingDateTime.getTime() + 2 * 60 * 60 * 1000); // +2 hours
          
          return {
            id: record.id,
            pond_batch_id: record.pond_batch_id,
            feeding_date: record.feeding_date,
            feeding_time: record.feeding_time,
            actual_amount: record.actual_amount,
            planned_amount: record.planned_amount,
            pond_name: record.pond_name,
            batch_name: record.batch_name,
            evaluation_due_time: evaluationDueTime.toISOString(),
          };
        })
        .filter(evaluation => {
          const dueTime = new Date(evaluation.evaluation_due_time);
          return now >= dueTime; // Only show evaluations that are due
        });

      return { data: pendingEvaluations, error: null };
    },
    { 
      enabled: !!farmId,
    }
  );
}

export function useFeedingConsumptionTrends(farmId?: string, days: number = 7) {
  return useSupabaseQuery(
    ['feeding-consumption-trends', farmId, days.toString()],
    async () => {
      if (!farmId) {
        return { data: [], error: null };
      }

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      const startDateStr = startDate.toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('feeding_records')
        .select(`
          feeding_date,
          consumption_evaluation,
          leftover_percentage,
          next_feeding_adjustment,
          adjustment_reason,
          pond_batches!inner (
            ponds!inner (
              name,
              farm_id
            ),
            batches!inner (
              name
            )
          )
        `)
        .eq('pond_batches.ponds.farm_id', farmId)
        .gte('feeding_date', startDateStr)
        .not('consumption_evaluation', 'is', null)
        .order('feeding_date', { ascending: false });

      if (error) throw error;

      // Group data by date and consumption type
      const trendsData = data?.reduce((acc: any, record) => {
        const date = record.feeding_date;
        if (!acc[date]) {
          acc[date] = {
            date,
            consumed_all: 0,
            left_little: 0,
            partial_consumption: 0,
            no_consumption: 0,
            excess_leftover: 0,
            total: 0,
          };
        }
        
        acc[date][record.consumption_evaluation as keyof typeof acc[typeof date]]++;
        acc[date].total++;
        
        return acc;
      }, {});

      const trends = Object.values(trendsData || {}).map((day: any) => ({
        ...day,
        consumed_all_pct: (day.consumed_all / day.total) * 100,
        problematic_pct: ((day.no_consumption + day.excess_leftover) / day.total) * 100,
      }));

      return { data: trends, error: null };
    },
    { enabled: !!farmId }
  );
}

export function useFeedingAdjustmentHistory(pondBatchId?: string) {
  return useSupabaseQuery(
    ['feeding-adjustment-history', pondBatchId],
    async () => {
      if (!pondBatchId) {
        return { data: [], error: null };
      }

      const { data, error } = await supabase
        .from('feeding_records')
        .select(`
          feeding_date,
          feeding_time,
          planned_amount,
          actual_amount,
          consumption_evaluation,
          leftover_percentage,
          next_feeding_adjustment,
          adjustment_reason,
          evaluation_time
        `)
        .eq('pond_batch_id', pondBatchId)
        .not('consumption_evaluation', 'is', null)
        .order('feeding_date', { ascending: false })
        .order('feeding_time', { ascending: false })
        .limit(10);

      if (error) throw error;

      return { data: data || [], error: null };
    },
    { enabled: !!pondBatchId }
  );
}