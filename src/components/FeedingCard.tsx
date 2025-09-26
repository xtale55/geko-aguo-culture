import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ClockCounterClockwise, PencilSimple, Clock, ChartLine, TrendUp, ClipboardText } from '@phosphor-icons/react';
import { FeedingHistoryDialog } from '@/components/FeedingHistoryDialog';
import { FeedingChartModal } from '@/components/FeedingChartModal';
import { FeedingAdjustmentChartModal } from '@/components/FeedingAdjustmentChartModal';
import { FeedingEvaluationModal } from '@/components/FeedingEvaluationModal';
import { FeedingSchedule } from '@/components/FeedingSchedule';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface FeedingCardProps {
  pondId: string;
  pondName: string;
  batchName: string;
  doc: number;
  biomass: number;
  averageWeight: number;
  population: number;
  dailyFeed: number;
  feedPerMeal: number;
  feedingRate: number;
  mealsPerDay: number;
  pondBatchId: string;
  farmId: string;
  selectedDate: string;
  onFeedingUpdate: () => void;
  onRateUpdate: () => void;
  isWeightEstimated?: boolean;
}

export function FeedingCard({
  pondId,
  pondName,
  batchName,
  doc,
  biomass,
  averageWeight,
  population,
  dailyFeed,
  feedPerMeal,
  feedingRate,
  mealsPerDay,
  pondBatchId,
  farmId,
  selectedDate,
  onFeedingUpdate,
  onRateUpdate,
  isWeightEstimated = false
}: FeedingCardProps) {
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
  const [isChartModalOpen, setIsChartModalOpen] = useState(false);
  const [isAdjustmentChartOpen, setIsAdjustmentChartOpen] = useState(false);
  const [isEditRateDialogOpen, setIsEditRateDialogOpen] = useState(false);
  const [isEvaluationModalOpen, setIsEvaluationModalOpen] = useState(false);
  const [newFeedingRate, setNewFeedingRate] = useState<string>("");
  const [newMealsPerDay, setNewMealsPerDay] = useState<string>("");
  const [feedingData, setFeedingData] = useState<Array<{feeding_date: string, cumulative_feed: number}>>([]);
  const [latestFeedingRecord, setLatestFeedingRecord] = useState<any>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  // Fetch feeding data for chart
  useEffect(() => {
    const fetchFeedingData = async () => {
      try {
        const { data, error } = await supabase
          .from('feeding_records')
          .select('feeding_date, actual_amount')
          .eq('pond_batch_id', pondBatchId)
          .order('feeding_date', { ascending: true });

        if (error) throw error;

        // Calculate cumulative feeding
        let cumulative = 0;
        const cumulativeData: {[key: string]: number} = {};
        
        data?.forEach(record => {
          const date = record.feeding_date;
          const amount = (record.actual_amount || 0) / 1000; // Convert grams to kg
          
          if (cumulativeData[date]) {
            cumulativeData[date] += amount;
          } else {
            cumulativeData[date] = (cumulativeData[Object.keys(cumulativeData).pop() || ''] || 0) + amount;
          }
        });

        const formattedData = Object.entries(cumulativeData).map(([date, amount]) => ({
          feeding_date: date,
          cumulative_feed: amount
        }));

        setFeedingData(formattedData);
      } catch (error) {
        console.error('Error fetching feeding data:', error);
      }
    };

    if (pondBatchId) {
      fetchFeedingData();
    }
  }, [pondBatchId]);

  const handleEditFeedingRate = () => {
    setNewFeedingRate(feedingRate.toString());
    setNewMealsPerDay(mealsPerDay.toString());
    setIsEditRateDialogOpen(true);
  };

  const handleSaveFeedingRate = async () => {
    try {
      const newRate = parseFloat(newFeedingRate);
      const newMeals = parseInt(newMealsPerDay);
      
      if (isNaN(newRate) || newRate <= 0) {
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Por favor, insira um percentual válido"
        });
        return;
      }

      if (isNaN(newMeals) || newMeals < 1 || newMeals > 10) {
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Por favor, insira um número válido de refeições (1-10)"
        });
        return;
      }

      // Check if there's already a rate for this weight range
      const { data: existingRates } = await supabase
        .from('feeding_rates')
        .select('*')
        .eq('pond_batch_id', pondBatchId)
        .lte('weight_range_min', averageWeight)
        .gte('weight_range_max', averageWeight);

      if (existingRates && existingRates.length > 0) {
        // Update existing rate
        const { error } = await supabase
          .from('feeding_rates')
          .update({ 
            feeding_percentage: newRate,
            meals_per_day: newMeals
          })
          .eq('id', existingRates[0].id);

        if (error) throw error;
      } else {
        // Create new rate for current weight
        const { error } = await supabase
          .from('feeding_rates')
          .insert({
            pond_batch_id: pondBatchId,
            weight_range_min: Math.max(0, averageWeight - 1),
            weight_range_max: averageWeight + 10,
            feeding_percentage: newRate,
            meals_per_day: newMeals,
            created_by: user?.id
          });

        if (error) throw error;
      }

      toast({
        title: "Taxa atualizada",
        description: `Nova taxa: ${newRate}% da biomassa • ${newMeals}x/dia`
      });

      setIsEditRateDialogOpen(false);
      setNewFeedingRate("");
      setNewMealsPerDay("");
      onRateUpdate();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message
      });
    }
  };

  const handleOpenEvaluationModal = async () => {
    try {
      // Fetch the latest feeding record for this pond batch
      const { data, error } = await supabase
        .from('feeding_records')
        .select('*')
        .eq('pond_batch_id', pondBatchId)
        .order('feeding_date', { ascending: false })
        .order('feeding_time', { ascending: false })
        .limit(1);

      if (error) throw error;

      if (data && data.length > 0) {
        setLatestFeedingRecord({
          ...data[0],
          pond_name: pondName,
          batch_name: batchName
        });
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
    onFeedingUpdate(); // Refresh data
  };

  return (
    <Card className="relative overflow-hidden bg-gradient-to-br from-white via-blue-50/30 to-emerald-50/20 border border-slate-200 hover:border-primary/30 transition-all duration-300 hover:shadow-lg">
      {/* Header */}
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-bold text-slate-800">{pondName}</CardTitle>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-xs">
                {batchName}
              </Badge>
              <div className="flex items-center gap-1">
                <Badge variant="secondary" className="text-xs">
                  DOC {doc}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsChartModalOpen(true)}
                  className="h-6 w-6 p-0 hover:bg-primary/10"
                >
                  <ChartLine className="w-3 h-3 text-primary" />
                </Button>
              </div>
              {isWeightEstimated && (
                <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">
                  Peso estimado
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Metrics Grid */}
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center">
            <p className="text-xs text-slate-500 mb-1">Biomassa</p>
            <p className="text-sm font-semibold text-slate-700">{biomass.toFixed(1)} kg</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-slate-500 mb-1">Peso Médio</p>
            <p className="text-sm font-semibold text-slate-700">{averageWeight.toFixed(1)}g</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-slate-500 mb-1">População</p>
            <p className="text-sm font-semibold text-slate-700">{population.toLocaleString()}</p>
          </div>
        </div>

        {/* Feeding Configuration */}
        <div className="bg-white/60 rounded-lg p-3 space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <p className="text-xs text-slate-500 mb-1">Ração Diária</p>
              <p className="text-lg font-bold text-blue-700">{dailyFeed.toFixed(1)} kg</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-slate-500 mb-1">Por Refeição</p>
              <p className="text-lg font-bold text-emerald-700">{feedPerMeal.toFixed(1)} kg</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <p className="text-xs text-slate-500 mb-1">Taxa de Alimentação</p>
              <p className="text-lg font-bold text-purple-700">{feedingRate.toFixed(1)}%</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleEditFeedingRate}
                className="h-6 px-2 text-xs mt-1"
              >
                <PencilSimple className="w-3 h-3 mr-1" />
                Editar
              </Button>
            </div>
            <div className="text-center">
              <p className="text-xs text-slate-500 mb-1">Arraçoamentos/Dia</p>
              <div className="flex items-center justify-center gap-1">
                <Clock className="w-4 h-4 text-orange-600" />
                <p className="text-lg font-bold text-orange-700">{mealsPerDay}x</p>
              </div>
              <p className="text-xs text-slate-500 mt-1">refeições por dia</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 gap-2 mt-4">
          <Button
            variant="default"
            size="default"
            onClick={handleOpenEvaluationModal}
            className="w-full bg-primary hover:bg-primary/90"
          >
            <ClipboardText className="w-4 h-4 mr-2" />
            Avaliar Consumo
          </Button>
          <Button
            variant="outline"
            size="default"
            onClick={() => setIsHistoryDialogOpen(true)}
            className="w-full"
          >
            <ClockCounterClockwise className="w-4 h-4 mr-2" />
            Histórico de Alimentação
          </Button>
          <Button
            variant="outline"
            size="default"
            onClick={() => setIsAdjustmentChartOpen(true)}
            className="w-full"
          >
            <TrendUp className="w-4 h-4 mr-2" />
            Gráfico de Ajustes
          </Button>
        </div>

        {/* Feeding History Dialog */}
        <FeedingHistoryDialog
          open={isHistoryDialogOpen}
          onOpenChange={setIsHistoryDialogOpen}
          pondBatchId={pondBatchId}
          pondName={pondName}
          batchName={batchName}
        />

        {/* Feeding Chart Modal */}
        <FeedingChartModal
          open={isChartModalOpen}
          onOpenChange={setIsChartModalOpen}
          pondName={pondName}
          batchName={batchName}
          doc={doc}
          feedingData={feedingData}
        />

        {/* Feeding Adjustment Chart Modal */}
        <FeedingAdjustmentChartModal
          open={isAdjustmentChartOpen}
          onOpenChange={setIsAdjustmentChartOpen}
          pondBatchId={pondBatchId}
          pondName={pondName}
          batchName={batchName}
          currentBiomass={biomass}
          feedingRate={feedingRate}
          mealsPerDay={mealsPerDay}
        />

        {/* Feeding Evaluation Modal */}
        {latestFeedingRecord && (
          <FeedingEvaluationModal
            open={isEvaluationModalOpen}
            onOpenChange={setIsEvaluationModalOpen}
            feedingRecord={latestFeedingRecord}
            onEvaluationComplete={handleEvaluationComplete}
          />
        )}

        {/* Edit Rate Dialog */}
        <Dialog open={isEditRateDialogOpen} onOpenChange={setIsEditRateDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Taxa de Alimentação - {pondName}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Percentual da Biomassa (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={newFeedingRate}
                    onChange={(e) => setNewFeedingRate(e.target.value)}
                    placeholder="Ex: 5.0"
                  />
                </div>
                <div>
                  <Label>Refeições por Dia</Label>
                  <Input
                    type="number"
                    min="1"
                    max="10"
                    value={newMealsPerDay}
                    onChange={(e) => setNewMealsPerDay(e.target.value)}
                    placeholder="Ex: 3"
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Peso atual dos animais: {averageWeight}g
              </p>
              <div className="flex gap-2">
                <Button onClick={handleSaveFeedingRate} disabled={!newFeedingRate || !newMealsPerDay}>
                  Salvar
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setIsEditRateDialogOpen(false);
                    setNewFeedingRate("");
                    setNewMealsPerDay("");
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}