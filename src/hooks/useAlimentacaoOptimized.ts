import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getCurrentDateForInput } from '@/lib/utils';

export interface OptimizedPondData {
  id: string;
  name: string;
  area: number;
  status: string;
  farm_id: string;
  current_batch?: {
    id: string;
    batch_name: string;
    stocking_date: string;
    current_population: number;
    current_biomass: number;
    average_weight: number;
    latest_feeding: {
      feeding_date: string;
      total_daily: number;
      meals_completed: number;
      meals_per_day: number;
      planned_total_daily: number;
      planned_per_meal: number;
      feeding_percentage: number;
    };
  };
}

export interface FeedingHistoryRecord {
  id: string;
  feeding_date: string;
  feeding_time: string;
  actual_amount: number;
  planned_amount: number;
  notes?: string;
  pond_name: string;
  batch_name: string;
  pond_batch_id: string;
  feed_type_name?: string;
}

export interface FeedType {
  id: string;
  name: string;
  quantity: number;
  unit_price: number;
}

interface AlimentacaoData {
  ponds: OptimizedPondData[];
  feedingHistory: FeedingHistoryRecord[];
  availableFeeds: FeedType[];
  farmId: string;
}

const getFeedingRate = (weight: number): number => {
  if (weight < 1) return 10;
  if (weight < 3) return 8;
  if (weight < 5) return 6;
  if (weight < 10) return 4;
  if (weight < 15) return 2.5;
  return 2;
};

const getMealsPerDay = (weight: number): number => {
  if (weight < 1) return 5;
  if (weight < 3) return 4;
  if (weight < 10) return 3;
  return 2;
};

export function useAlimentacaoOptimized(userId?: string) {
  return useQuery({
    queryKey: ['alimentacao-optimized', userId],
    queryFn: async (): Promise<AlimentacaoData> => {
      if (!userId) {
        throw new Error('User ID required');
      }

      const today = getCurrentDateForInput();

      // Get farm ID first
      const { data: farmsData, error: farmsError } = await supabase
        .from('farms')
        .select('id')
        .eq('user_id', userId)
        .limit(1)
        .single();

      if (farmsError) throw farmsError;
      if (!farmsData) throw new Error('No farm found');

      const farmId = farmsData.id;

      // Execute all queries in parallel
      const [pondsResult, historyResult, feedsResult, feedingRatesResult] = await Promise.all([
        // 1. Get active ponds with batches and biometries
        supabase
          .from('ponds')
          .select(`
            id,
            name,
            area,
            status,
            farm_id,
            pond_batches!inner(
              id,
              current_population,
              stocking_date,
              cycle_status,
              batches!inner(name)
            )
          `)
          .eq('farm_id', farmId)
          .eq('status', 'in_use')
          .eq('pond_batches.cycle_status', 'active')
          .gt('pond_batches.current_population', 0)
          .order('name'),

        // 2. Get feeding history - simplified query
        supabase
          .from('feeding_records')
          .select('id, feeding_date, feeding_time, actual_amount, planned_amount, notes, pond_batch_id, feed_type_name')
          .order('feeding_date', { ascending: false })
          .order('feeding_time', { ascending: false })
          .limit(100),

        // 3. Get available feeds
        supabase
          .from('inventory')
          .select('id, name, quantity, unit_price, category')
          .eq('farm_id', farmId)
          .in('category', ['Ração', 'Mistura'])
          .gt('quantity', 0)
          .order('name'),

        // 4. Get feeding rates for all ponds
        supabase
          .from('feeding_rates')
          .select('pond_batch_id, farm_id, feeding_percentage, meals_per_day, weight_range_min, weight_range_max')
          .or(`farm_id.eq.${farmId},pond_batch_id.not.is.null`)
      ]);

      if (pondsResult.error) throw pondsResult.error;
      if (historyResult.error) throw historyResult.error;
      if (feedsResult.error) throw feedsResult.error;

      // Get pond batch IDs for biometry and feeding records queries
      const pondBatchIds = pondsResult.data?.map(p => p.pond_batches[0]?.id).filter(Boolean) || [];

      if (pondBatchIds.length === 0) {
        return {
          ponds: [],
          feedingHistory: [],
          availableFeeds: feedsResult.data?.map(f => ({
            id: f.id,
            name: f.name,
            quantity: f.quantity / 1000,
            unit_price: f.unit_price
          })) || [],
          farmId
        };
      }

      // Get biometries and today's feeding records in parallel
      const [biometriesResult, todayFeedingsResult, lastFeedingsResult] = await Promise.all([
        supabase
          .from('biometrics')
          .select('pond_batch_id, average_weight, measurement_date')
          .in('pond_batch_id', pondBatchIds)
          .order('measurement_date', { ascending: false }),

        supabase
          .from('feeding_records')
          .select('pond_batch_id, actual_amount')
          .in('pond_batch_id', pondBatchIds)
          .eq('feeding_date', today),

        supabase
          .from('feeding_records')
          .select('pond_batch_id, actual_amount, consumption_evaluation, next_feeding_adjustment, feeding_date, feeding_time')
          .in('pond_batch_id', pondBatchIds)
          .order('feeding_date', { ascending: false })
          .order('feeding_time', { ascending: false })
      ]);

      if (biometriesResult.error) throw biometriesResult.error;
      if (todayFeedingsResult.error) throw todayFeedingsResult.error;
      if (lastFeedingsResult.error) throw lastFeedingsResult.error;

      // Create lookup maps for efficiency
      const biometryMap = new Map<string, number>();
      biometriesResult.data?.forEach(bio => {
        if (!biometryMap.has(bio.pond_batch_id)) {
          biometryMap.set(bio.pond_batch_id, bio.average_weight);
        }
      });

      const todayFeedingsMap = new Map<string, number[]>();
      todayFeedingsResult.data?.forEach(feed => {
        const existing = todayFeedingsMap.get(feed.pond_batch_id) || [];
        todayFeedingsMap.set(feed.pond_batch_id, [...existing, feed.actual_amount]);
      });

      const lastFeedingMap = new Map<string, any>();
      lastFeedingsResult.data?.forEach(feed => {
        if (!lastFeedingMap.has(feed.pond_batch_id)) {
          lastFeedingMap.set(feed.pond_batch_id, feed);
        }
      });

      const feedingRatesMap = new Map<string, { percentage: number; meals: number }>();
      feedingRatesResult.data?.forEach(rate => {
        const key = rate.pond_batch_id || `farm_${farmId}`;
        if (!feedingRatesMap.has(key)) {
          feedingRatesMap.set(key, {
            percentage: rate.feeding_percentage,
            meals: rate.meals_per_day
          });
        }
      });

      // Process ponds data
      const ponds: OptimizedPondData[] = pondsResult.data?.map(pond => {
        const activeBatch = pond.pond_batches[0];
        if (!activeBatch) return null;

        const avgWeight = biometryMap.get(activeBatch.id) || 1;
        const biomass = (activeBatch.current_population * avgWeight) / 1000; // kg
        
        // Get feeding rates (pond-specific or farm template)
        const pondRates = feedingRatesMap.get(activeBatch.id);
        const farmRates = feedingRatesMap.get(`farm_${farmId}`);
        const feedingPercentage = pondRates?.percentage || farmRates?.percentage || getFeedingRate(avgWeight);
        const mealsPerDay = pondRates?.meals || farmRates?.meals || getMealsPerDay(avgWeight);

        // Calculate today's feeding summary
        const todayFeedings = todayFeedingsMap.get(activeBatch.id) || [];
        const totalDaily = todayFeedings.reduce((sum, amount) => sum + amount, 0);
        const mealsCompleted = todayFeedings.length;

        // Calculate planned amounts
        let plannedPerMeal = 0;
        let plannedTotalDaily = 0;

        const lastFeeding = lastFeedingMap.get(activeBatch.id);
        if (lastFeeding) {
          if (lastFeeding.consumption_evaluation) {
            const adjustmentPercent = lastFeeding.next_feeding_adjustment || 0;
            plannedPerMeal = Math.round(lastFeeding.actual_amount * (1 + adjustmentPercent / 100));
          } else {
            plannedTotalDaily = (biomass * feedingPercentage / 100) * 1000;
            plannedPerMeal = Math.round(plannedTotalDaily / mealsPerDay);
          }
          plannedTotalDaily = plannedPerMeal * mealsPerDay;
        } else {
          plannedTotalDaily = (biomass * feedingPercentage / 100) * 1000;
          plannedPerMeal = Math.round(plannedTotalDaily / mealsPerDay);
        }

        return {
          id: pond.id,
          name: pond.name,
          area: pond.area,
          status: pond.status,
          farm_id: pond.farm_id,
          current_batch: {
            id: activeBatch.id,
            batch_name: activeBatch.batches.name,
            stocking_date: activeBatch.stocking_date,
            current_population: activeBatch.current_population,
            current_biomass: biomass,
            average_weight: avgWeight,
            latest_feeding: {
              feeding_date: today,
              total_daily: totalDaily,
              meals_completed: mealsCompleted,
              meals_per_day: mealsPerDay,
              planned_total_daily: plannedTotalDaily,
              planned_per_meal: plannedPerMeal,
              feeding_percentage: feedingPercentage
            }
          }
        };
      }).filter(Boolean) as OptimizedPondData[] || [];

      // Get pond/batch names for history
      const pondBatchMap = new Map<string, { pond_name: string; batch_name: string }>();
      for (const pond of pondsResult.data || []) {
        const batch = pond.pond_batches[0];
        if (batch) {
          pondBatchMap.set(batch.id, {
            pond_name: pond.name,
            batch_name: batch.batches.name
          });
        }
      }

      // Format feeding history - filter by farm
      const feedingHistory: FeedingHistoryRecord[] = (historyResult.data || [])
        .filter(record => pondBatchMap.has(record.pond_batch_id))
        .map(record => {
          const pondBatch = pondBatchMap.get(record.pond_batch_id)!;
          return {
            id: record.id,
            feeding_date: record.feeding_date,
            feeding_time: record.feeding_time,
            actual_amount: record.actual_amount,
            planned_amount: record.planned_amount,
            notes: record.notes,
            feed_type_name: record.feed_type_name,
            pond_name: pondBatch.pond_name,
            batch_name: pondBatch.batch_name,
            pond_batch_id: record.pond_batch_id
          };
        })
        .slice(0, 50);

      // Format available feeds
      const availableFeeds: FeedType[] = feedsResult.data?.map(feed => ({
        id: feed.id,
        name: feed.name,
        quantity: feed.quantity / 1000, // Convert to kg
        unit_price: feed.unit_price
      })) || [];

      return {
        ponds,
        feedingHistory,
        availableFeeds,
        farmId
      };
    },
    enabled: !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
}
