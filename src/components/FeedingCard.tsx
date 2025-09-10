import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { History, Plus, Edit2 } from 'lucide-react';
import { useFeedingProgress } from '@/hooks/useFeedingProgress';
import { FeedingHistoryDialog } from '@/components/FeedingHistoryDialog';
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
  const [isFeedingDialogOpen, setIsFeedingDialogOpen] = useState(false);
  const [isEditRateDialogOpen, setIsEditRateDialogOpen] = useState(false);
  const [newFeedingRate, setNewFeedingRate] = useState<string>("");
  const [newMealsPerDay, setNewMealsPerDay] = useState<string>("");
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: feedingRecords } = useFeedingProgress(undefined);
  
  // Calculate progress for this specific pond
  const todayRecords = feedingRecords?.filter(record => record.pond_batch_id === pondBatchId) || [];
  const totalPlanned = dailyFeed;
  const totalActual = todayRecords.reduce((sum, record) => sum + (record.actual_amount / 1000), 0);
  const percentage = totalPlanned > 0 ? Math.round((totalActual / totalPlanned) * 100) : 0;
  const progressPercentage = Math.min(percentage, 100);

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
              <Badge variant="secondary" className="text-xs">
                DOC {doc}
              </Badge>
              {isWeightEstimated && (
                <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">
                  Peso estimado
                </Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleEditFeedingRate}
              className="h-8 px-2 text-xs"
            >
              <Edit2 className="w-3 h-3 mr-1" />
              {feedingRate}%
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsHistoryDialogOpen(true)}
              className="h-8 px-2 text-xs"
            >
              <History className="w-3 h-3 mr-1" />
              Histórico
            </Button>
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

        {/* Feeding Info */}
        <div className="bg-white/60 rounded-lg p-3 space-y-2">
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <p className="text-xs text-slate-500 mb-1">Ração Diária</p>
              <p className="text-lg font-bold text-blue-700">{dailyFeed.toFixed(1)} kg</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-slate-500 mb-1">Por Refeição</p>
              <p className="text-lg font-bold text-emerald-700">{feedPerMeal.toFixed(1)} kg</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-slate-500 mb-1">Taxa</p>
              <p className="text-lg font-bold text-purple-700">{feedingRate.toFixed(1)}%</p>
            </div>
          </div>
        </div>

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-slate-600">Realizado Hoje</span>
            <span className="text-sm font-bold text-slate-800">{totalActual.toFixed(1)} kg</span>
          </div>
          <Progress 
            value={progressPercentage} 
            className="h-2"
          />
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-500">Progresso</span>
            <span className={`text-xs font-semibold ${
              progressPercentage >= 100 ? 'text-green-600' : 
              progressPercentage >= 75 ? 'text-emerald-600' :
              progressPercentage >= 50 ? 'text-amber-600' : 'text-red-600'
            }`}>
              {progressPercentage}%
            </span>
          </div>
        </div>

        {/* Action Button */}
        <Button 
          onClick={() => setIsFeedingDialogOpen(true)}
          className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium"
        >
          <Plus className="w-4 h-4 mr-2" />
          Registrar Alimentação
        </Button>

        {/* Feeding History Dialog */}
        <FeedingHistoryDialog
          open={isHistoryDialogOpen}
          onOpenChange={setIsHistoryDialogOpen}
          pondBatchId={pondBatchId}
          pondName={pondName}
          batchName={batchName}
        />

        {/* Feeding Registration Dialog */}
        <Dialog open={isFeedingDialogOpen} onOpenChange={setIsFeedingDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Registrar Alimentação - {pondName}</DialogTitle>
            </DialogHeader>
            <FeedingSchedule
              pondId={pondId}
              pondName={pondName}
              batchName={batchName}
              pondBatchId={pondBatchId}
              biomass={biomass}
              feedingRate={feedingRate}
              mealsPerDay={mealsPerDay}
              dailyFeed={dailyFeed}
              doc={doc}
              selectedDate={selectedDate}
              currentPopulation={population}
              averageWeight={averageWeight}
              farmId={farmId}
              onFeedingUpdate={() => {
                onFeedingUpdate();
                setIsFeedingDialogOpen(false);
              }}
              onRateUpdate={onRateUpdate}
              isWeightEstimated={isWeightEstimated}
            />
          </DialogContent>
        </Dialog>

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