import { useSupabaseQuery } from './useSupabaseQuery';
import { useAuth } from './useAuth';
import { getCurrentDateForInput } from '@/lib/utils';

interface PondWithBatch {
  id: string;
  name: string;
  area: number;
  status: string;
  current_batch?: {
    id: string;
    batch_name: string;
    stocking_date: string;
    current_population: number;
    latest_feeding?: {
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

interface FeedingRecord {
  id: string;
  feeding_date: string;
  feeding_time: string;
  actual_amount: number;
  planned_amount: number;
  notes?: string;
  pond_name: string;
  batch_name: string;
  pond_batch_id: string;
}

interface FeedType {
  id: string;
  name: string;
  quantity: number;
  unit_price: number;
}

// Hook otimizado para carregar viveiros com dados de alimentação
export function useActivePondsWithFeeding() {
  const { user } = useAuth();

  return useSupabaseQuery<PondWithBatch[]>(
    ['active-ponds-feeding', user?.id],
    async () => {
      if (!user) return { data: null, error: 'No user' };

      // Buscar fazenda do usuário
      const { data: farms, error: farmError } = await supabase
        .from('farms')
        .select('id')
        .eq('user_id', user.id)
        .limit(1);

      if (farmError || !farms?.length) {
        return { data: [], error: farmError };
      }

      const farmId = farms[0].id;
      const today = getCurrentDateForInput();

      // Query única otimizada com JOINs para carregar tudo
      const { data: pondsData, error } = await supabase
        .from('ponds')
        .select(`
          id,
          name,
          area,
          status,
          pond_batches!inner(
            id,
            current_population,
            stocking_date,
            cycle_status,
            batches!inner(name),
            feeding_records!left(
              actual_amount,
              feeding_date
            ),
            biometrics!left(
              average_weight,
              measurement_date
            ),
            feeding_rates!left(
              feeding_percentage,
              meals_per_day,
              weight_range_min,
              weight_range_max,
              farm_id
            )
          )
        `)
        .eq('farm_id', farmId)
        .eq('status', 'in_use')
        .eq('pond_batches.cycle_status', 'active')
        .gt('pond_batches.current_population', 0)
        .eq('pond_batches.feeding_records.feeding_date', today)
        .order('name');

      if (error) return { data: null, error };

      // Processar dados otimizado
      const formattedPonds: PondWithBatch[] = pondsData?.map(pond => {
        const activeBatch = pond.pond_batches[0];
        
        if (!activeBatch) {
          return {
            id: pond.id,
            name: pond.name,
            area: pond.area,
            status: pond.status
          };
        }

        // Buscar biometria mais recente
        const latestBio = activeBatch.biometrics
          ?.sort((a, b) => new Date(b.measurement_date).getTime() - new Date(a.measurement_date).getTime())[0];
        
        const avgWeight = latestBio?.average_weight || 1;

        // Buscar taxa de alimentação apropriada
        const feedingRate = activeBatch.feeding_rates
          ?.find(rate => 
            rate.weight_range_min <= avgWeight && 
            rate.weight_range_max >= avgWeight &&
            rate.farm_id === farmId
          );

        // Calcular resumo de alimentação de hoje
        const todayFeeding = activeBatch.feeding_records || [];
        const totalDaily = todayFeeding.reduce((sum, record) => sum + record.actual_amount, 0);
        const mealsCompleted = todayFeeding.length;
        const mealsPerDay = feedingRate?.meals_per_day || 3;

        // Calcular quantidades planejadas
        let plannedTotalDaily = 0;
        let plannedPerMeal = 0;
        
        if (feedingRate) {
          const biomass = (activeBatch.current_population * avgWeight) / 1000;
          plannedTotalDaily = (biomass * feedingRate.feeding_percentage / 100) * 1000;
          plannedPerMeal = Math.round(plannedTotalDaily / feedingRate.meals_per_day);
        }

        return {
          id: pond.id,
          name: pond.name,
          area: pond.area,
          status: pond.status,
          current_batch: {
            id: activeBatch.id,
            batch_name: activeBatch.batches.name,
            stocking_date: activeBatch.stocking_date,
            current_population: activeBatch.current_population,
            latest_feeding: {
              feeding_date: today,
              total_daily: totalDaily,
              meals_completed: mealsCompleted,
              meals_per_day: mealsPerDay,
              planned_total_daily: plannedTotalDaily,
              planned_per_meal: plannedPerMeal,
              feeding_percentage: feedingRate?.feeding_percentage || 0
            }
          }
        };
      }) || [];

      return { data: formattedPonds, error: null };
    },
    {
      enabled: !!user,
      staleTime: 30 * 1000 // 30 segundos
    }
  );
}

// Hook otimizado para histórico de alimentação
export function useFeedingHistory() {
  const { user } = useAuth();

  return useSupabaseQuery<FeedingRecord[]>(
    ['feeding-history', user?.id],
    async () => {
      if (!user) return { data: null, error: 'No user' };

      // Buscar fazenda do usuário
      const { data: farms, error: farmError } = await supabase
        .from('farms')
        .select('id')
        .eq('user_id', user.id)
        .limit(1);

      if (farmError || !farms?.length) {
        return { data: [], error: farmError };
      }

      // Query única otimizada com JOINs
      const { data: historyData, error } = await supabase
        .from('feeding_records')
        .select(`
          id,
          feeding_date,
          feeding_time,
          actual_amount,
          planned_amount,
          notes,
          pond_batch_id,
          pond_batches!inner(
            ponds!inner(name, farm_id),
            batches!inner(name)
          )
        `)
        .eq('pond_batches.ponds.farm_id', farms[0].id)
        .order('feeding_date', { ascending: false })
        .order('feeding_time', { ascending: false })
        .limit(50);

      if (error) return { data: null, error };

      const formattedHistory: FeedingRecord[] = historyData?.map(record => ({
        id: record.id,
        feeding_date: record.feeding_date,
        feeding_time: record.feeding_time,
        actual_amount: record.actual_amount,
        planned_amount: record.planned_amount,
        notes: record.notes,
        pond_name: record.pond_batches.ponds.name,
        batch_name: record.pond_batches.batches.name,
        pond_batch_id: record.pond_batch_id
      })) || [];

      return { data: formattedHistory, error: null };
    },
    {
      enabled: !!user,
      staleTime: 60 * 1000 // 1 minuto
    }
  );
}

// Hook otimizado para rações disponíveis
export function useAvailableFeeds() {
  const { user } = useAuth();

  return useSupabaseQuery<FeedType[]>(
    ['available-feeds', user?.id],
    async () => {
      if (!user) return { data: null, error: 'No user' };

      // Buscar fazenda do usuário
      const { data: farms, error: farmError } = await supabase
        .from('farms')
        .select('id')
        .eq('user_id', user.id)
        .limit(1);

      if (farmError || !farms?.length) {
        return { data: [], error: farmError };
      }

      const farmId = farms[0].id;

      // Query única otimizada para rações e misturas com ração usando CTEs
      const { data: feedData, error } = await supabase.rpc('get_feed_items_optimized', {
        farm_id_param: farmId
      });

      if (error) {
        console.error('Error fetching optimized feeds, falling back to manual method');
        
        // Fallback para método anterior se RPC não existir
        const { data: directFeeds } = await supabase
          .from('inventory')
          .select('id, name, quantity, unit_price')
          .eq('farm_id', farmId)
          .eq('category', 'Ração')
          .gt('quantity', 0)
          .order('name');

        const feeds: FeedType[] = directFeeds?.map(feed => ({
          id: feed.id,
          name: feed.name,
          quantity: feed.quantity / 1000,
          unit_price: feed.unit_price
        })) || [];

        return { data: feeds, error: null };
      }

      const feeds: FeedType[] = feedData?.map((feed: any) => ({
        id: feed.id,
        name: feed.name,
        quantity: feed.quantity / 1000,
        unit_price: feed.unit_price
      })) || [];

      return { data: feeds, error: null };
    },
    {
      enabled: !!user,
      staleTime: 2 * 60 * 1000 // 2 minutos
    }
  );
}