import { useEffect, useState } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FeedingSchedule } from '@/components/FeedingSchedule';
import { FeedingRateConfig } from '@/components/FeedingRateConfig';
import { FeedingCard } from '@/components/FeedingCard';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Utensils, Calculator, ArrowLeft, BarChart3 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getCurrentDateForInput, formatDateForDisplay } from '@/lib/utils';
import { QuantityUtils } from '@/lib/quantityUtils';
import { LoadingScreen } from '@/components/LoadingScreen';

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
    pl_size: number;
    latest_biometry?: {
      average_weight: number;
      measurement_date: string;
      created_at?: string;
    };
  };
}

interface FeedingTask {
  pond_id: string;
  pond_name: string;
  pond_batch_id: string;
  batch_name: string;
  current_population: number;
  average_weight: number;
  biomass: number;
  feeding_rate: number;
  daily_feed: number;
  meals_per_day: number;
  feed_per_meal: number;
  doc: number;
  total_feed_consumed: number;
  fca: number;
  is_weight_estimated: boolean;
}

export default function Feeding() {
  const [farms, setFarms] = useState<{ id: string; name: string }[]>([]);
  const [ponds, setPonds] = useState<PondWithBatch[]>([]);
  const [feedingTasks, setFeedingTasks] = useState<FeedingTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(getCurrentDateForInput());
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      loadFeedingData();
    }
  }, [user, selectedDate]);

  const loadFeedingData = async () => {
    try {
      // Load farms first
      const { data: farmsData, error: farmsError } = await supabase
        .from('farms')
        .select('id, name')
        .eq('user_id', user?.id);

      if (farmsError) throw farmsError;
      setFarms(farmsData || []);

      if (farmsData && farmsData.length > 0) {
        // Load active ponds with batch and biometry data
        const { data: pondsData, error: pondsError } = await supabase
          .from('ponds')
          .select(`
            *,
            pond_batches!inner(
              id,
              current_population,
              stocking_date,
              cycle_status,
              created_at,
              batches!inner(name, pl_size),
              biometrics(
                average_weight,
                measurement_date,
                created_at
              )
            )
          `)
          .eq('farm_id', farmsData[0].id)
          .eq('status', 'in_use')
          .eq('pond_batches.cycle_status', 'active')
          .order('name');

        if (pondsError) throw pondsError;

        // Process pond data - get only the most recent active batch per pond
        const processedPonds = pondsData?.map(pond => {
          // Sort pond batches by created_at DESC to get the most recent first
          const sortedBatches = pond.pond_batches
            .filter(batch => batch.cycle_status === 'active')
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          
          const latestBatch = sortedBatches[0];
          
          return {
            ...pond,
            current_batch: latestBatch ? {
              id: latestBatch.id,
              batch_name: latestBatch.batches.name,
              stocking_date: latestBatch.stocking_date,
              current_population: latestBatch.current_population,
              pl_size: latestBatch.batches.pl_size,
              latest_biometry: latestBatch.biometrics
                .sort((a, b) => new Date(b.created_at || b.measurement_date).getTime() - new Date(a.created_at || a.measurement_date).getTime())[0] || null
            } : undefined
          };
        }) || [];

        setPonds(processedPonds);

        // Generate feeding tasks
        const tasks = await Promise.all(
          processedPonds
            .filter(pond => pond.current_batch) // Remove biometry requirement
            .map(async (pond) => {
              const batch = pond.current_batch!;
              const doc = calculateDOC(batch.stocking_date);
              
              // Calculate weight: use biometry if available, otherwise calculate from pl_size
              let averageWeight = 0;
              let isEstimated = false;
              
              if (batch.latest_biometry) {
                averageWeight = batch.latest_biometry.average_weight;
              } else if (batch.pl_size) {
                // Calculate initial weight from pl_size (1g / pl_size)
                averageWeight = 1 / batch.pl_size;
                isEstimated = true;
              }
              
              const biomass = (batch.current_population * averageWeight) / 1000; // kg

              // Get custom feeding rate or use default
              const feedingRate = await getFeedingRate(batch.id, averageWeight, farmsData[0].id);
              const mealsPerDay = await getMealsPerDay(batch.id, averageWeight, farmsData[0].id);
              const dailyFeed = biomass * (feedingRate / 100);
              const feedPerMeal = dailyFeed / mealsPerDay;

              // Calculate total feed consumed and FCA
              const totalFeedConsumed = await getTotalFeedConsumed(batch.id);
              
              // Get first biometry to calculate real FCA
              const firstBiometry = await getFirstBiometry(batch.id);
              let fca = 1.5; // Default fallback
              
              if (firstBiometry && totalFeedConsumed > 0 && !isEstimated) {
                const initialBiomass = (batch.current_population * firstBiometry.average_weight) / 1000;
                const currentBiomass = (batch.current_population * averageWeight) / 1000;
                const biomassGain = currentBiomass - initialBiomass;
                fca = biomassGain > 0 ? totalFeedConsumed / biomassGain : 1.5;
              }

              return {
                pond_id: pond.id,
                pond_name: pond.name,
                pond_batch_id: batch.id,
                batch_name: batch.batch_name,
                current_population: batch.current_population,
                average_weight: averageWeight,
                biomass,
                feeding_rate: feedingRate,
                daily_feed: dailyFeed,
                meals_per_day: mealsPerDay,
                feed_per_meal: feedPerMeal,
                doc,
                total_feed_consumed: totalFeedConsumed,
                fca,
                is_weight_estimated: isEstimated
              };
            })
        );

        setFeedingTasks(tasks);
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateDOC = (stockingDate: string) => {
    const today = new Date();
    const stocking = new Date(stockingDate);
    const diffTime = Math.abs(today.getTime() - stocking.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getFeedingRate = async (pondBatchId: string, weight: number, farmId: string): Promise<number> => {
    try {
      // First check for pond-specific rates
      const { data: pondSpecific } = await supabase
        .from('feeding_rates')
        .select('feeding_percentage')
        .eq('pond_batch_id', pondBatchId)
        .lte('weight_range_min', weight)
        .gte('weight_range_max', weight)
        .order('weight_range_min', { ascending: false })
        .limit(1);

      if (pondSpecific && pondSpecific.length > 0) {
        return pondSpecific[0].feeding_percentage;
      }

      // Then check for farm templates
      const { data: farmTemplate } = await supabase
        .from('feeding_rates')
        .select('feeding_percentage')
        .eq('farm_id', farmId)
        .is('pond_batch_id', null)
        .lte('weight_range_min', weight)
        .gte('weight_range_max', weight)
        .order('weight_range_min', { ascending: false })
        .limit(1);

      if (farmTemplate && farmTemplate.length > 0) {
        return farmTemplate[0].feeding_percentage;
      }
    } catch (error) {
      console.error('Error getting feeding rate:', error);
    }

    // Default feeding rate based on weight
    if (weight < 1) return 10;
    if (weight < 3) return 8;
    if (weight < 5) return 6;
    if (weight < 10) return 4;
    if (weight < 15) return 2.5;
    return 2;
  };

  const getMealsPerDay = async (pondBatchId: string, weight: number, farmId: string): Promise<number> => {
    try {
      // First check for pond-specific rates
      const { data: pondSpecific } = await supabase
        .from('feeding_rates')
        .select('meals_per_day')
        .eq('pond_batch_id', pondBatchId)
        .lte('weight_range_min', weight)
        .gte('weight_range_max', weight)
        .order('weight_range_min', { ascending: false })
        .limit(1);

      if (pondSpecific && pondSpecific.length > 0) {
        return pondSpecific[0].meals_per_day;
      }

      // Then check for farm templates
      const { data: farmTemplate } = await supabase
        .from('feeding_rates')
        .select('meals_per_day')
        .eq('farm_id', farmId)
        .is('pond_batch_id', null)
        .lte('weight_range_min', weight)
        .gte('weight_range_max', weight)
        .order('weight_range_min', { ascending: false })
        .limit(1);

      if (farmTemplate && farmTemplate.length > 0) {
        return farmTemplate[0].meals_per_day;
      }
    } catch (error) {
      console.error('Error getting meals per day:', error);
    }

    // Default meals per day based on weight
    if (weight < 1) return 5;
    if (weight < 3) return 4;
    if (weight < 10) return 3;
    return 2;
  };

  const getTotalFeedConsumed = async (pondBatchId: string): Promise<number> => {
    try {
      const { data } = await supabase
        .from('feeding_records')
        .select('actual_amount')
        .eq('pond_batch_id', pondBatchId);

      const totalGrams = data?.reduce((sum, record) => sum + record.actual_amount, 0) || 0;
      return QuantityUtils.gramsToKg(totalGrams);
    } catch (error) {
      console.error('Error getting total feed consumed:', error);
      return 0;
    }
  };

  const getFirstBiometry = async (pondBatchId: string) => {
    try {
      const { data } = await supabase
        .from('biometrics')
        .select('average_weight, measurement_date')
        .eq('pond_batch_id', pondBatchId)
        .order('measurement_date', { ascending: true })
        .limit(1);

      return data?.[0] || null;
    } catch (error) {
      console.error('Error getting first biometry:', error);
      return null;
    }
  };

  const getTotalDailyFeed = () => {
    return feedingTasks.reduce((sum, task) => sum + task.daily_feed, 0);
  };

  const getAverageFCA = () => {
    if (feedingTasks.length === 0) return 0;
    const totalFCA = feedingTasks.reduce((sum, task) => sum + task.fca, 0);
    return totalFCA / feedingTasks.length;
  };

  const getTotalFeedConsumedAll = () => {
    return feedingTasks.reduce((sum, task) => sum + task.total_feed_consumed, 0);
  };

  if (loading) {
    return <LoadingScreen message="Carregando alimentação..." />;
  }

  if (feedingTasks.length === 0) {
    return (
      <Layout>
        <div className="text-center py-12">
          <Utensils className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-2xl font-semibold mb-2">Nenhum viveiro ativo</h2>
          <p className="text-muted-foreground mb-6">
            É necessário ter viveiros ativos para calcular o arraçoamento.
          </p>
          <Button onClick={() => navigate('/biometry')}>
            Registrar Biometria
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-emerald-50/20">
        <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate('/dashboard')}
              className="mb-2 bg-gradient-to-r from-slate-50 to-slate-100 hover:from-primary/10 hover:to-accent/10 border border-slate-200 hover:border-primary/20 text-slate-700 hover:text-primary transition-all duration-300"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-primary to-emerald-600 bg-clip-text text-transparent mb-2">
              Arraçoamento Inteligente
            </h1>
            <p className="text-slate-600">
              Sistema avançado de controle de alimentação com FCA
            </p>
          </div>
          <div className="text-right">
            <Label htmlFor="date-select" className="text-sm">Data:</Label>
            <Input
              id="date-select"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-auto mt-1"
            />
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="backdrop-blur-sm bg-gradient-to-br from-blue-50 to-blue-100/80 border-blue-200 hover:shadow-lg transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Ração Diária</p>
                  <p className="text-2xl font-bold text-blue-700">
                    {getTotalDailyFeed().toFixed(1)} kg
                  </p>
                </div>
                <Utensils className="w-8 h-8 text-blue-600/70" />
              </div>
            </CardContent>
          </Card>

          <Card className="backdrop-blur-sm bg-gradient-to-br from-emerald-50 to-emerald-100/80 border-emerald-200 hover:shadow-lg transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Total Consumido</p>
                  <p className="text-2xl font-bold text-emerald-700">
                    {getTotalFeedConsumedAll().toFixed(1)} kg
                  </p>
                </div>
                <Calculator className="w-8 h-8 text-emerald-600/70" />
              </div>
            </CardContent>
          </Card>

          <Card className="backdrop-blur-sm bg-gradient-to-br from-purple-50 to-purple-100/80 border-purple-200 hover:shadow-lg transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">FCA Médio</p>
                  <p className="text-2xl font-bold text-purple-700">
                    {getAverageFCA().toFixed(2)}
                  </p>
                </div>
                <BarChart3 className="w-8 h-8 text-purple-600/70" />
              </div>
            </CardContent>
          </Card>

          <Card className="backdrop-blur-sm bg-gradient-to-br from-orange-50 to-orange-100/80 border-orange-200 hover:shadow-lg transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Viveiros Ativos</p>
                  <p className="text-2xl font-bold text-orange-700">{feedingTasks.length}</p>
                </div>
                <Utensils className="w-8 h-8 text-orange-600/70" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Feeding Rate Configuration */}
        <FeedingRateConfig
          farmId={farms[0]?.id}
          onRateUpdate={loadFeedingData}
        />

        {/* Feeding Tasks */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-semibold">Controle de Alimentação</h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {feedingTasks.map((task) => (
              <FeedingSchedule
                key={task.pond_id}
                pondId={task.pond_id}
                pondName={task.pond_name}
                batchName={task.batch_name}
                pondBatchId={task.pond_batch_id}
                biomass={task.biomass}
                feedingRate={task.feeding_rate}
                mealsPerDay={task.meals_per_day}
                dailyFeed={task.daily_feed}
                doc={task.doc}
                selectedDate={selectedDate}
                currentPopulation={task.current_population}
                averageWeight={task.average_weight}
                farmId={farms[0]?.id}
                onFeedingUpdate={loadFeedingData}
                onRateUpdate={loadFeedingData}
                isWeightEstimated={task.is_weight_estimated}
              />
            ))}
          </div>
        </div>
        </div>
      </div>
    </Layout>
  );
}
