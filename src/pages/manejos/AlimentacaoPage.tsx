import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Clock, Utensils, History, Edit2, Trash2, ChartLine, ClipboardList } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { getCurrentDateForInput, formatDateForDisplay } from '@/lib/utils';
import { QuantityUtils } from '@/lib/quantityUtils';
import { getFeedItemsIncludingMixtures } from '@/lib/feedUtils';
import { FeedingChartModal } from '@/components/FeedingChartModal';
import { FeedingEvaluationNotifications } from '@/components/FeedingEvaluationNotifications';
import { FeedingEvaluationModal } from '@/components/FeedingEvaluationModal';

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
    current_biomass?: number;
    average_weight?: number;
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

interface FeedingData {
  pond_batch_id: string;
  feeding_date: string;
  feeding_time: string;
  planned_amount: number;
  actual_amount: number;
  notes?: string;
  feed_type_id?: string;
  feed_type_name?: string;
}

export default function AlimentacaoPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [ponds, setPonds] = useState<PondWithBatch[]>([]);
  const [feedingHistory, setFeedingHistory] = useState<FeedingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [farmId, setFarmId] = useState<string>('');
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [selectedPond, setSelectedPond] = useState<PondWithBatch | null>(null);
  const [availableFeeds, setAvailableFeeds] = useState<FeedType[]>([]);
  const [selectedFeedType, setSelectedFeedType] = useState<string>('');
  const [editingRecord, setEditingRecord] = useState<FeedingRecord | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isChartModalOpen, setIsChartModalOpen] = useState(false);
  const [feedingChartData, setFeedingChartData] = useState<Array<{feeding_date: string, cumulative_feed: number}>>([]);
  const [selectedPondForChart, setSelectedPondForChart] = useState<PondWithBatch | null>(null);
  const [isEvaluationModalOpen, setIsEvaluationModalOpen] = useState(false);
  const [latestFeedingRecord, setLatestFeedingRecord] = useState<any>(null);
  const [selectedPondForEvaluation, setSelectedPondForEvaluation] = useState<PondWithBatch | null>(null);
  
  const [feedingData, setFeedingData] = useState<FeedingData>({
    pond_batch_id: '',
    feeding_date: getCurrentDateForInput(),
    feeding_time: format(new Date(), 'HH:mm'),
    planned_amount: 0,
    actual_amount: 0,
    notes: ''
  });

  useEffect(() => {
    console.log('📊 AlimentacaoPage useEffect triggered, user:', user?.id);
    if (user) {
      setError(null);
      loadActivePonds();
      loadFeedingHistory();
      loadAvailableFeeds();
    } else {
      console.log('⚠️ No user found, waiting for authentication...');
    }
  }, [user]);

  const loadActivePonds = async () => {
    console.log('🏊 Loading active ponds...');
    try {
      if (!user?.id) {
        console.log('❌ No user ID available');
        return;
      }

      // Load farms first
      const { data: farmsData, error: farmsError } = await supabase
        .from('farms')
        .select('id')
        .eq('user_id', user.id);

      console.log('🏠 Farms data:', farmsData);
      if (farmsError) {
        console.error('❌ Farms error:', farmsError);
        throw farmsError;
      }

      if (farmsData && farmsData.length > 0) {
        console.log('✅ Setting farmId:', farmsData[0].id);
        setFarmId(farmsData[0].id);
        // Load active ponds with active batch data
        const { data: pondsData, error: pondsError } = await supabase
          .from('ponds')
          .select(`
            *,
            pond_batches!inner(
              id,
              current_population,
              stocking_date,
              cycle_status,
              batches!inner(name)
            )
          `)
          .eq('farm_id', farmsData[0].id)
          .eq('status', 'in_use')
          .eq('pond_batches.cycle_status', 'active')
          .gt('pond_batches.current_population', 0)
          .order('name');

        if (pondsError) throw pondsError;

        // Process and format pond data
        const formattedPonds: PondWithBatch[] = pondsData?.map(pond => {
          const activeBatch = pond.pond_batches[0];
          return {
            id: pond.id,
            name: pond.name,
            area: pond.area,
            status: pond.status,
            current_batch: activeBatch ? {
              id: activeBatch.id,
              batch_name: activeBatch.batches.name,
              stocking_date: activeBatch.stocking_date,
              current_population: activeBatch.current_population
            } : undefined
          };
        }) || [];

        // Load today's feeding summary for each pond
        for (const pond of formattedPonds) {
          if (pond.current_batch) {
            await loadTodayFeedingSummary(pond);
            await loadBiomassData(pond);
          }
        }

        console.log('🏊 Formatted ponds:', formattedPonds);
        setPonds(formattedPonds);
      } else {
        console.log('⚠️ No farms found for user');
        setError('Nenhuma fazenda encontrada. Por favor, crie uma fazenda primeiro.');
      }
    } catch (error) {
      console.error('❌ Error loading ponds:', error);
      setError(`Erro ao carregar viveiros: ${error.message}`);
      toast({
        title: "Erro",
        description: "Erro ao carregar viveiros",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
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

  const loadTodayFeedingSummary = async (pond: PondWithBatch) => {
    if (!pond.current_batch) return;

    try {
      const today = getCurrentDateForInput();
      
      // Get today's feeding records
      const { data: feedingRecords } = await supabase
        .from('feeding_records')
        .select('actual_amount')
        .eq('pond_batch_id', pond.current_batch.id)
        .eq('feeding_date', today);

      // Get latest biometry for calculations
      const { data: biometry } = await supabase
        .from('biometrics')
        .select('average_weight')
        .eq('pond_batch_id', pond.current_batch.id)
        .order('measurement_date', { ascending: false })
        .limit(1);

      // Get farm_id from pond to find feeding rates
      const { data: pondData } = await supabase
        .from('ponds')
        .select('farm_id')
        .eq('id', pond.id)
        .single();

      const avgWeight = biometry?.[0]?.average_weight || 1; // Default to 1g if no biometry

      // Use fallback system for feeding rates
      const feedingPercentage = await getFeedingRate(pond.current_batch.id, avgWeight, pondData?.farm_id || '');
      const mealsPerDay = await getMealsPerDay(pond.current_batch.id, avgWeight, pondData?.farm_id || '');

      const totalDaily = feedingRecords?.reduce((sum, record) => sum + record.actual_amount, 0) || 0;
      const mealsCompleted = feedingRecords?.length || 0;
      
      // Calculate planned amounts with adjustment logic
      let plannedTotalDaily = 0;
      let plannedPerMeal = 0;

      // Get last feeding record to check for adjustments
      const { data: lastFeeding } = await supabase
        .from('feeding_records')
        .select('actual_amount, consumption_evaluation, next_feeding_adjustment')
        .eq('pond_batch_id', pond.current_batch.id)
        .order('feeding_date', { ascending: false })
        .order('feeding_time', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (lastFeeding) {
        if (lastFeeding.consumption_evaluation) {
          // Has evaluation: apply adjustment over actual_amount
          const adjustmentPercent = lastFeeding.next_feeding_adjustment || 0;
          plannedPerMeal = Math.round(lastFeeding.actual_amount * (1 + adjustmentPercent / 100));
        } else {
          // No evaluation: maintain actual_amount
          plannedPerMeal = lastFeeding.actual_amount;
        }
        plannedTotalDaily = plannedPerMeal * mealsPerDay;
      } else if (pond.current_batch) {
        // No history: use standard calculation with fallback system
        const biomass = (pond.current_batch.current_population * avgWeight) / 1000; // kg
        plannedTotalDaily = (biomass * feedingPercentage / 100) * 1000; // grams
        plannedPerMeal = Math.round(plannedTotalDaily / mealsPerDay);
      }

      // Update pond with feeding summary
      pond.current_batch.latest_feeding = {
        feeding_date: today,
        total_daily: totalDaily,
        meals_completed: mealsCompleted,
        meals_per_day: mealsPerDay,
        planned_total_daily: plannedTotalDaily,
        planned_per_meal: plannedPerMeal,
        feeding_percentage: feedingPercentage
      };
    } catch (error) {
      console.error('Error loading feeding summary:', error);
    }
  };

  const loadBiomassData = async (pond: PondWithBatch) => {
    if (!pond.current_batch) return;

    try {
      // Get latest biometry for weight calculation
      const { data: biometry } = await supabase
        .from('biometrics')
        .select('average_weight')
        .eq('pond_batch_id', pond.current_batch.id)
        .order('measurement_date', { ascending: false })
        .limit(1);

      const avgWeight = biometry?.[0]?.average_weight || 1; // Default to 1g if no biometry
      const biomass = (pond.current_batch.current_population * avgWeight) / 1000; // Convert to kg

      // Update pond with biomass data
      pond.current_batch.current_biomass = biomass;
      pond.current_batch.average_weight = avgWeight;
    } catch (error) {
      console.error('Error loading biomass data:', error);
    }
  };

  const loadFeedingHistory = async () => {
    try {
      setHistoryLoading(true);

      // Load farms first
      const { data: farmsData, error: farmsError } = await supabase
        .from('farms')
        .select('id')
        .eq('user_id', user?.id);

      if (farmsError) throw farmsError;

      if (farmsData && farmsData.length > 0) {
        const { data: historyData, error: historyError } = await supabase
          .from('feeding_records')
          .select(`
            id,
            feeding_date,
            feeding_time,
            actual_amount,
            planned_amount,
            notes,
            pond_batch_id
          `)
          .order('feeding_date', { ascending: false })
          .order('feeding_time', { ascending: false })
          .limit(50);

        if (historyError) throw historyError;

        // Get pond and batch info for each record
        const formattedHistory: FeedingRecord[] = [];
        
        if (historyData) {
          for (const record of historyData) {
            const { data: pondBatchData } = await supabase
              .from('pond_batches')
              .select(`
                ponds!inner(name, farm_id),
                batches!inner(name)
              `)
              .eq('id', record.pond_batch_id)
              .eq('ponds.farm_id', farmsData[0].id)
              .single();

            if (pondBatchData) {
              formattedHistory.push({
                id: record.id,
                feeding_date: record.feeding_date,
                feeding_time: record.feeding_time,
                actual_amount: record.actual_amount,
                planned_amount: record.planned_amount,
                notes: record.notes,
                pond_name: pondBatchData.ponds.name,
                batch_name: pondBatchData.batches.name,
                pond_batch_id: record.pond_batch_id
              });
            }
          }
        }

        setFeedingHistory(formattedHistory);
      }
    } catch (error) {
      console.error('Error loading feeding history:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar histórico de alimentação",
        variant: "destructive"
      });
    } finally {
      setHistoryLoading(false);
    }
  };

  const loadAvailableFeeds = async () => {
    try {
      // Load farms first
      const { data: farmsData, error: farmsError } = await supabase
        .from('farms')
        .select('id')
        .eq('user_id', user?.id);

      if (farmsError) throw farmsError;

      if (farmsData && farmsData.length > 0) {
        const feedsData = await getFeedItemsIncludingMixtures(farmsData[0].id);

        const feeds: FeedType[] = feedsData.map(feed => ({
          id: feed.id,
          name: feed.name,
          quantity: feed.quantity / 1000, // Convert to kg for display
          unit_price: feed.unit_price
        })) || [];

        setAvailableFeeds(feeds);
      }
    } catch (error) {
      console.error('Error loading available feeds:', error);
    }
  };

  const handleOpenDialog = async (pond: PondWithBatch) => {
    if (!pond.current_batch) return;

    setSelectedPond(pond);
    
    // Calculate planned amount based on feeding rate and history
    try {
      // Get latest biometry for weight calculation
      const { data: biometry } = await supabase
        .from('biometrics')
        .select('average_weight')
        .eq('pond_batch_id', pond.current_batch.id)
        .order('measurement_date', { ascending: false })
        .limit(1);

      // Get farm_id from pond to find feeding rates
      const { data: pondData } = await supabase
        .from('ponds')
        .select('farm_id')
        .eq('id', pond.id)
        .single();

      const avgWeight = biometry?.[0]?.average_weight || 1; // Default to 1g if no biometry

      // Use fallback system for feeding rates
      const feedingPercentage = await getFeedingRate(pond.current_batch.id, avgWeight, pondData?.farm_id || '');
      const mealsPerDay = await getMealsPerDay(pond.current_batch.id, avgWeight, pondData?.farm_id || '');

      // Try to get default feed type from farm template (if exists)
      const { data: feedingRate } = await supabase
        .from('feeding_rates')
        .select('default_feed_type_id, default_feed_type_name')
        .eq('farm_id', pondData?.farm_id)
        .is('pond_batch_id', null)
        .lte('weight_range_min', avgWeight)
        .gte('weight_range_max', avgWeight)
        .order('weight_range_min', { ascending: false })
        .limit(1)
        .maybeSingle();

      // Get last feeding record to check for adjustments
      const { data: lastFeeding } = await supabase
        .from('feeding_records')
        .select('actual_amount, consumption_evaluation, next_feeding_adjustment')
        .eq('pond_batch_id', pond.current_batch.id)
        .order('feeding_date', { ascending: false })
        .order('feeding_time', { ascending: false })
        .limit(1)
        .maybeSingle();

      let plannedAmount = 0;
      
      if (lastFeeding) {
        if (lastFeeding.consumption_evaluation) {
          // Has evaluation: apply adjustment over actual_amount
          const adjustmentPercent = lastFeeding.next_feeding_adjustment || 0;
          plannedAmount = Math.round(lastFeeding.actual_amount * (1 + adjustmentPercent / 100));
        } else {
          // No evaluation: maintain actual_amount
          plannedAmount = lastFeeding.actual_amount;
        }
      } else if (pond.current_batch) {
        // No history: use standard calculation with fallback system
        const biomass = (pond.current_batch.current_population * avgWeight) / 1000; // kg
        const dailyFeed = (biomass * feedingPercentage / 100) * 1000; // grams
        plannedAmount = Math.round(dailyFeed / mealsPerDay);
      }

      // Set default feed type if available
      let defaultFeedId = '';
      if (feedingRate?.default_feed_type_id && availableFeeds.some(feed => feed.id === feedingRate.default_feed_type_id)) {
        defaultFeedId = feedingRate.default_feed_type_id;
      } else if (availableFeeds.length > 0) {
        defaultFeedId = availableFeeds[0].id;
      }

      setSelectedFeedType(defaultFeedId);
      setFeedingData({
        pond_batch_id: pond.current_batch.id,
        feeding_date: getCurrentDateForInput(),
        feeding_time: format(new Date(), 'HH:mm'),
        planned_amount: plannedAmount,
        actual_amount: plannedAmount,
        notes: '',
        feed_type_id: defaultFeedId,
        feed_type_name: availableFeeds.find(feed => feed.id === defaultFeedId)?.name || ''
      });
    } catch (error) {
      console.error('Error calculating planned amount:', error);
      const defaultFeedId = availableFeeds.length > 0 ? availableFeeds[0].id : '';
      setSelectedFeedType(defaultFeedId);
      setFeedingData({
        pond_batch_id: pond.current_batch.id,
        feeding_date: getCurrentDateForInput(),
        feeding_time: format(new Date(), 'HH:mm'),
        planned_amount: 0,
        actual_amount: 0,
        notes: '',
        feed_type_id: defaultFeedId,
        feed_type_name: availableFeeds.find(feed => feed.id === defaultFeedId)?.name || ''
      });
    }

    setShowDialog(true);
  };

  const handleOpenChartModal = async (pond: PondWithBatch) => {
    if (!pond.current_batch) return;

    try {
      // Fetch feeding data for chart
      const { data, error } = await supabase
        .from('feeding_records')
        .select('feeding_date, actual_amount')
        .eq('pond_batch_id', pond.current_batch.id)
        .order('feeding_date', { ascending: true });

      if (error) throw error;

      // Calculate cumulative feeding by date
      let cumulative = 0;
      const cumulativeData: {[key: string]: number} = {};
      
      data?.forEach(record => {
        const date = record.feeding_date;
        const amount = (record.actual_amount || 0) / 1000; // Convert grams to kg
        
        if (cumulativeData[date]) {
          cumulativeData[date] += amount;
        } else {
          cumulative += amount;
          cumulativeData[date] = cumulative;
        }
      });

      // Ensure cumulative calculation is correct
      let runningTotal = 0;
      const formattedData = Object.entries(cumulativeData)
        .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
        .map(([date, dailyTotal]) => {
          runningTotal = Object.keys(cumulativeData)
            .filter(d => d <= date)
            .reduce((sum, d) => sum + (data?.filter(r => r.feeding_date === d).reduce((daySum, r) => daySum + (r.actual_amount || 0), 0) || 0), 0) / 1000;
          
          return {
            feeding_date: date,
            cumulative_feed: runningTotal
          };
        });

      setFeedingChartData(formattedData);
      setSelectedPondForChart(pond);
      setIsChartModalOpen(true);
    } catch (error) {
      console.error('Error fetching feeding chart data:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar dados do gráfico",
        variant: "destructive"
      });
    }
  };

  const handleOpenEvaluationModal = async (pond: PondWithBatch) => {
    if (!pond.current_batch) return;

    try {
      // Fetch the latest feeding record for this pond batch
      const { data, error } = await supabase
        .from('feeding_records')
        .select('*')
        .eq('pond_batch_id', pond.current_batch.id)
        .order('feeding_date', { ascending: false })
        .order('feeding_time', { ascending: false })
        .limit(1);

      if (error) throw error;

      if (data && data.length > 0) {
        setLatestFeedingRecord({
          ...data[0],
          pond_name: pond.name,
          batch_name: pond.current_batch.batch_name
        });
        setSelectedPondForEvaluation(pond);
        setIsEvaluationModalOpen(true);
      } else {
        toast({
          variant: "destructive",
          title: "Aviso",
          description: "Nenhum registro de alimentação encontrado para avaliar"
        });
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message
      });
    }
  };

  const handleEvaluationComplete = () => {
    setIsEvaluationModalOpen(false);
    setLatestFeedingRecord(null);
    setSelectedPondForEvaluation(null);
    // Refresh data
    loadActivePonds();
    loadFeedingHistory();
  };

  const calculateDOC = (stockingDate: string) => {
    const today = new Date();
    const stocking = new Date(stockingDate);
    const diffTime = Math.abs(today.getTime() - stocking.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const handleSubmitFeeding = async () => {
    try {
      setSubmitting(true);

      if (!selectedFeedType) {
        toast({
          title: "Erro",
          description: "Selecione um tipo de ração",
          variant: "destructive"
        });
        return;
      }

      // Get selected feed info
      const selectedFeed = availableFeeds.find(feed => feed.id === selectedFeedType);
      if (!selectedFeed) {
        toast({
          title: "Erro",
          description: "Ração selecionada não encontrada",
          variant: "destructive"
        });
        return;
      }

      // Check if there's enough stock (converted to grams for comparison)
      const requiredGrams = feedingData.actual_amount;
      const availableGrams = selectedFeed.quantity * 1000;
      
      if (requiredGrams > availableGrams) {
        toast({
          title: "Erro",
          description: `Estoque insuficiente. Disponível: ${selectedFeed.quantity} kg`,
          variant: "destructive"
        });
        return;
      }

      // Update inventory
      const newQuantityGrams = Math.max(0, availableGrams - requiredGrams);
      await supabase
        .from('inventory')
        .update({ quantity: newQuantityGrams })
        .eq('id', selectedFeedType);

      const feedingRecord = {
        ...feedingData,
        feed_type_id: selectedFeedType,
        feed_type_name: selectedFeed.name,
        unit_cost: selectedFeed.unit_price,
        feeding_rate_percentage: 0
      };

      const { error } = await supabase
        .from('feeding_records')
        .insert(feedingRecord);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Alimentação registrada com sucesso"
      });

      setShowDialog(false);
      loadActivePonds();
      loadFeedingHistory();
      loadAvailableFeeds(); // Reload feeds to update quantities

    } catch (error) {
      console.error('Error saving feeding:', error);
      toast({
        title: "Erro",
        description: "Erro ao registrar alimentação",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditFeeding = async (record: FeedingRecord) => {
    setEditingRecord(record);
    setIsEditing(true);
    
    // Find the pond data for this record
    const { data: pondBatchData } = await supabase
      .from('pond_batches')
      .select(`
        ponds!inner(id, name, area),
        batches!inner(name)
      `)
      .eq('id', record.pond_batch_id)
      .single();

    if (pondBatchData) {
      const pondData: PondWithBatch = {
        id: pondBatchData.ponds.id,
        name: pondBatchData.ponds.name,
        area: pondBatchData.ponds.area,
        status: 'in_use',
        current_batch: {
          id: record.pond_batch_id,
          batch_name: pondBatchData.batches.name,
          stocking_date: '',
          current_population: 0
        }
      };
      
      setSelectedPond(pondData);
    }

    // Get the feed type from the record
    const { data: feedingRecordData } = await supabase
      .from('feeding_records')
      .select('feed_type_id, feed_type_name')
      .eq('id', record.id)
      .single();

    if (feedingRecordData?.feed_type_id) {
      setSelectedFeedType(feedingRecordData.feed_type_id);
    }

    setFeedingData({
      pond_batch_id: record.pond_batch_id,
      feeding_date: record.feeding_date,
      feeding_time: record.feeding_time,
      planned_amount: record.planned_amount,
      actual_amount: record.actual_amount,
      notes: record.notes || '',
      feed_type_id: feedingRecordData?.feed_type_id || '',
      feed_type_name: feedingRecordData?.feed_type_name || ''
    });

    setShowDialog(true);
  };

  const handleDeleteFeeding = async (recordId: string) => {
    if (!confirm('Tem certeza que deseja excluir este registro de alimentação?')) {
      return;
    }

    try {
      // Get the record to restore inventory
      const { data: record } = await supabase
        .from('feeding_records')
        .select('actual_amount, feed_type_id')
        .eq('id', recordId)
        .single();

      if (record?.feed_type_id) {
        // Restore inventory
        const { data: currentInventory } = await supabase
          .from('inventory')
          .select('quantity')
          .eq('id', record.feed_type_id)
          .single();

        if (currentInventory) {
          await supabase
            .from('inventory')
            .update({ 
              quantity: currentInventory.quantity + record.actual_amount 
            })
            .eq('id', record.feed_type_id);
        }
      }

      // Delete the feeding record
      const { error } = await supabase
        .from('feeding_records')
        .delete()
        .eq('id', recordId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Registro excluído com sucesso"
      });

      loadFeedingHistory();
      loadAvailableFeeds();
    } catch (error) {
      console.error('Error deleting feeding record:', error);
      toast({
        title: "Erro",
        description: "Erro ao excluir registro",
        variant: "destructive"
      });
    }
  };

  const handleUpdateFeeding = async () => {
    if (!editingRecord) return;

    try {
      setSubmitting(true);

      if (!selectedFeedType) {
        toast({
          title: "Erro",
          description: "Selecione um tipo de ração",
          variant: "destructive"
        });
        return;
      }

      // Get current and new feed info
      const { data: currentRecord } = await supabase
        .from('feeding_records')
        .select('actual_amount, feed_type_id')
        .eq('id', editingRecord.id)
        .single();

      const selectedFeed = availableFeeds.find(feed => feed.id === selectedFeedType);
      if (!selectedFeed) {
        toast({
          title: "Erro",
          description: "Ração selecionada não encontrada",
          variant: "destructive"
        });
        return;
      }

      // Calculate inventory adjustments
      const oldAmount = currentRecord?.actual_amount || 0;
      const newAmount = feedingData.actual_amount;
      const oldFeedTypeId = currentRecord?.feed_type_id;
      const newFeedTypeId = selectedFeedType;

      // If feed type changed, restore old inventory
      if (oldFeedTypeId && oldFeedTypeId !== newFeedTypeId) {
        const { data: oldInventory } = await supabase
          .from('inventory')
          .select('quantity')
          .eq('id', oldFeedTypeId)
          .single();

        if (oldInventory) {
          await supabase
            .from('inventory')
            .update({ quantity: oldInventory.quantity + oldAmount })
            .eq('id', oldFeedTypeId);
        }
      }

      // Update new inventory
      const { data: newInventory } = await supabase
        .from('inventory')
        .select('quantity')
        .eq('id', newFeedTypeId)
        .single();

      if (newInventory) {
        const inventoryChange = oldFeedTypeId === newFeedTypeId ? (newAmount - oldAmount) : newAmount;
        const newQuantity = newInventory.quantity - inventoryChange;

        if (newQuantity < 0) {
          toast({
            title: "Erro",
            description: `Estoque insuficiente. Disponível: ${(newInventory.quantity / 1000).toFixed(1)} kg`,
            variant: "destructive"
          });
          return;
        }

        await supabase
          .from('inventory')
          .update({ quantity: newQuantity })
          .eq('id', newFeedTypeId);
      }

      // Update feeding record
      const { error } = await supabase
        .from('feeding_records')
        .update({
          feeding_date: feedingData.feeding_date,
          feeding_time: feedingData.feeding_time,
          actual_amount: feedingData.actual_amount,
          planned_amount: feedingData.planned_amount,
          notes: feedingData.notes,
          feed_type_id: selectedFeedType,
          feed_type_name: selectedFeed.name,
          unit_cost: selectedFeed.unit_price
        })
        .eq('id', editingRecord.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Registro atualizado com sucesso"
      });

      setShowDialog(false);
      setIsEditing(false);
      setEditingRecord(null);
      loadFeedingHistory();
      loadAvailableFeeds();

    } catch (error) {
      console.error('Error updating feeding:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar registro",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  console.log('📱 AlimentacaoPage render - Loading:', loading, 'Error:', error, 'User:', user?.id, 'FarmId:', farmId);

  if (loading) {
    console.log('⏳ Showing loading state');
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-emerald-50/20">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Carregando viveiros...</p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    console.log('❌ Showing error state:', error);
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-emerald-50/20">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <h3 className="text-red-800 font-medium mb-2">Erro ao carregar página</h3>
                <p className="text-red-600 mb-4">{error}</p>
                <Button onClick={() => {
                  setError(null);
                  setLoading(true);
                  loadActivePonds();
                }}>
                  Tentar novamente
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!user) {
    console.log('👤 No user, showing login message');
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-emerald-50/20">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <p className="text-muted-foreground">Por favor, faça login para acessar esta página.</p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  console.log('✅ Rendering main content');

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
                onClick={() => navigate('/manejos')}
                className="mb-2 bg-gradient-to-r from-slate-50 to-slate-100 hover:from-primary/10 hover:to-accent/10 border border-slate-200 hover:border-primary/20 text-slate-700 hover:text-primary transition-all duration-300"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar para Manejos
              </Button>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-gradient-to-r from-green-600 to-green-700 rounded-lg">
                  <Utensils className="w-6 h-6 text-white" />
                </div>
                <h1 className="text-4xl font-bold text-primary">
                  Alimentação
                </h1>
              </div>
              <p className="text-slate-600">
                Registre e acompanhe a alimentação diária dos viveiros
              </p>
            </div>
          </div>

          {/* Feeding Evaluation Notifications */}
          {farmId ? (
            <div>
              <FeedingEvaluationNotifications farmId={farmId} />
            </div>
          ) : (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-yellow-800">Aguardando dados da fazenda...</p>
            </div>
          )}

          {/* Content */}
          <Tabs defaultValue="registro" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="registro" className="flex items-center gap-2">
                <Utensils className="w-4 h-4" />
                Registro por Viveiro
              </TabsTrigger>
              <TabsTrigger value="historico" className="flex items-center gap-2">
                <History className="w-4 h-4" />
                Histórico
              </TabsTrigger>
            </TabsList>

            <TabsContent value="registro" className="space-y-4">
              {ponds.length === 0 ? (
                <Card className="backdrop-blur-sm bg-white/80 border-white/20 shadow-xl">
                  <CardContent className="flex flex-col items-center justify-center h-64">
                    <Utensils className="w-12 h-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold text-muted-foreground mb-2">
                      Nenhum viveiro ativo encontrado
                    </h3>
                    <p className="text-sm text-muted-foreground text-center">
                      Adicione camarões aos viveiros para começar a registrar alimentação
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {ponds.map(pond => (
                    <Card key={pond.id} className="backdrop-blur-sm bg-white/80 border-white/20 shadow-xl hover:shadow-2xl transition-all duration-300">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg font-semibold">{pond.name}</CardTitle>
                          <div className="flex items-center gap-1">
                            <Badge variant="secondary" className="text-xs">
                              DOC {pond.current_batch ? calculateDOC(pond.current_batch.stocking_date) : 0}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenChartModal(pond)}
                              className="h-6 w-6 p-0 hover:bg-primary/10"
                            >
                              <ChartLine className="w-3 h-3 text-primary" />
                            </Button>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {pond.current_batch?.batch_name}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground space-y-1">
                          <div>População: {pond.current_batch?.current_population?.toLocaleString()} camarões</div>
                          <div>Biomassa: {pond.current_batch?.current_biomass?.toFixed(1) || '0.0'} kg</div>
                        </div>
                      </CardHeader>
                      
                      <CardContent className="space-y-4">
                        {/* Feeding Configuration Summary */}
                        {pond.current_batch?.latest_feeding && (
                          <div className="space-y-3">
                            <div className="bg-slate-50 rounded-lg p-3 space-y-2">
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Taxa de alimentação:</span>
                                <span className="font-medium">{pond.current_batch.latest_feeding.feeding_percentage.toFixed(1)}%</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Por refeição (planejado):</span>
                                <span className="font-medium">{(pond.current_batch.latest_feeding.planned_per_meal / 1000).toFixed(1)} kg</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Total diário (planejado):</span>
                                <span className="font-medium">{(pond.current_batch.latest_feeding.planned_total_daily / 1000).toFixed(1)} kg</span>
                              </div>
                            </div>
                            
                            {/* Daily Progress */}
                            <div className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <span>Refeições Hoje</span>
                                <span>
                                  {pond.current_batch.latest_feeding.meals_completed}/
                                  {pond.current_batch.latest_feeding.meals_per_day}
                                </span>
                              </div>
                              <Progress 
                                value={(pond.current_batch.latest_feeding.meals_completed / pond.current_batch.latest_feeding.meals_per_day) * 100} 
                                className="h-2" 
                              />
                              <div className="flex justify-between text-xs text-muted-foreground">
                                <span>Alimentado: {(pond.current_batch.latest_feeding.total_daily / 1000).toFixed(1)} kg</span>
                                <span>Restante: {((pond.current_batch.latest_feeding.planned_total_daily - pond.current_batch.latest_feeding.total_daily) / 1000).toFixed(1)} kg</span>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        <div className="grid grid-cols-1 gap-2">
                          <Button 
                            onClick={() => handleOpenDialog(pond)}
                            className="w-full h-12"
                            size="sm"
                          >
                            <Utensils className="w-4 h-4 mr-2" />
                            Registrar Alimentação
                          </Button>
                          <Button 
                            onClick={() => handleOpenEvaluationModal(pond)}
                            variant="outline"
                            className="w-full h-12"
                            size="sm"
                          >
                            <ClipboardList className="w-4 h-4 mr-2" />
                            Avaliar Consumo
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="historico" className="space-y-4">
              <Card className="backdrop-blur-sm bg-white/80 border-white/20 shadow-xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <History className="w-5 h-5" />
                    Histórico de Alimentação
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {historyLoading ? (
                    <div className="flex items-center justify-center h-32">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                    </div>
                  ) : feedingHistory.length === 0 ? (
                    <div className="text-center py-8">
                      <Utensils className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">Nenhum registro de alimentação encontrado</p>
                    </div>
                  ) : (
                     <div className="overflow-x-auto">
                       <Table>
                         <TableHeader>
                           <TableRow>
                             <TableHead>Data</TableHead>
                             <TableHead>Horário</TableHead>
                             <TableHead>Viveiro</TableHead>
                             <TableHead>Lote</TableHead>
                             <TableHead>Quantidade</TableHead>
                             <TableHead>Observações</TableHead>
                             <TableHead className="text-center">Ações</TableHead>
                           </TableRow>
                         </TableHeader>
                         <TableBody>
                           {feedingHistory.map(record => (
                             <TableRow key={record.id}>
                               <TableCell>{formatDateForDisplay(record.feeding_date)}</TableCell>
                               <TableCell>{record.feeding_time.slice(0, 5)}</TableCell>
                               <TableCell>{record.pond_name}</TableCell>
                               <TableCell>{record.batch_name}</TableCell>
                               <TableCell>{(record.actual_amount / 1000).toFixed(1)} kg</TableCell>
                               <TableCell className="max-w-xs truncate">{record.notes || '-'}</TableCell>
                               <TableCell className="text-center">
                                 <div className="flex items-center justify-center gap-2">
                                   <Button
                                     variant="ghost"
                                     size="sm"
                                     onClick={() => handleEditFeeding(record)}
                                     className="h-8 w-8 p-0"
                                   >
                                     <Edit2 className="w-4 h-4" />
                                   </Button>
                                   <Button
                                     variant="ghost"
                                     size="sm"
                                     onClick={() => handleDeleteFeeding(record.id)}
                                     className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                   >
                                     <Trash2 className="w-4 h-4" />
                                   </Button>
                                 </div>
                               </TableCell>
                             </TableRow>
                           ))}
                         </TableBody>
                       </Table>
                     </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Dialog for Adding Feeding */}
          <Dialog open={showDialog} onOpenChange={setShowDialog}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Utensils className="w-5 h-5 text-green-600" />
                  {isEditing ? 'Editar Alimentação' : 'Registrar Alimentação'}
                </DialogTitle>
                <p className="text-sm text-muted-foreground">
                  {selectedPond?.name} - {selectedPond?.current_batch?.batch_name}
                </p>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="date">Data</Label>
                    <Input
                      id="date"
                      type="date"
                      value={feedingData.feeding_date}
                      onChange={(e) => setFeedingData(prev => ({ ...prev, feeding_date: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="time">Horário</Label>
                    <Input
                      id="time"
                      type="time"
                      value={feedingData.feeding_time}
                      onChange={(e) => setFeedingData(prev => ({ ...prev, feeding_time: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="feed-type">Tipo de Ração</Label>
                  <Select value={selectedFeedType} onValueChange={(value) => {
                    setSelectedFeedType(value);
                    const selectedFeed = availableFeeds.find(feed => feed.id === value);
                    setFeedingData(prev => ({
                      ...prev,
                      feed_type_id: value,
                      feed_type_name: selectedFeed?.name || ''
                    }));
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo de ração" />
                    </SelectTrigger>
                    <SelectContent className="bg-background border border-border z-50">
                      {availableFeeds.map(feed => (
                        <SelectItem key={feed.id} value={feed.id}>
                          <div className="flex justify-between items-center w-full">
                            <span>{feed.name}</span>
                            <span className="text-muted-foreground ml-2">
                              ({feed.quantity.toFixed(1)} kg disponível)
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {availableFeeds.length === 0 && (
                    <p className="text-sm text-destructive">
                      Nenhuma ração disponível no estoque
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantidade (kg)</Label>
                  <Input
                    id="quantity"
                    type="number"
                    step="0.1"
                    value={QuantityUtils.gramsToKg(feedingData.actual_amount)}
                    onChange={(e) => {
                      const gramsValue = QuantityUtils.parseInputToGrams(e.target.value);
                      setFeedingData(prev => ({ 
                        ...prev, 
                        actual_amount: gramsValue,
                        planned_amount: gramsValue // Keep both values in sync
                      }));
                    }}
                  />
                  <p className="text-sm text-muted-foreground">
                    Recomendado: {QuantityUtils.formatKg(feedingData.planned_amount)} kg
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Observações (opcional)</Label>
                  <Input
                    id="notes"
                    placeholder="Ex: Ração bem aceita, apetite normal"
                    value={feedingData.notes}
                    onChange={(e) => setFeedingData(prev => ({ ...prev, notes: e.target.value }))}
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setShowDialog(false);
                      setIsEditing(false);
                      setEditingRecord(null);
                    }} 
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                  <Button 
                    onClick={isEditing ? handleUpdateFeeding : handleSubmitFeeding}
                    disabled={submitting || feedingData.actual_amount <= 0 || !selectedFeedType || availableFeeds.length === 0}
                    className="flex-1"
                  >
                    {submitting ? 'Salvando...' : (isEditing ? 'Atualizar' : 'Salvar')}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Feeding Chart Modal */}
        {selectedPondForChart && (
          <FeedingChartModal
            open={isChartModalOpen}
            onOpenChange={setIsChartModalOpen}
            pondName={selectedPondForChart.name}
            batchName={selectedPondForChart.current_batch?.batch_name || ''}
            doc={selectedPondForChart.current_batch ? calculateDOC(selectedPondForChart.current_batch.stocking_date) : 0}
            feedingData={feedingChartData}
          />
        )}

        {/* Feeding Evaluation Modal */}
        {latestFeedingRecord && (
          <FeedingEvaluationModal
            open={isEvaluationModalOpen}
            onOpenChange={setIsEvaluationModalOpen}
            feedingRecord={latestFeedingRecord}
            onEvaluationComplete={handleEvaluationComplete}
          />
        )}
      </div>
    </Layout>
  );
}