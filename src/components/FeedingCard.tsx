import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { History, Plus } from 'lucide-react';
import { useFeedingProgress } from '@/hooks/useFeedingProgress';

interface FeedingCardProps {
  pondName: string;
  batchName: string;
  doc: number;
  biomass: number;
  averageWeight: number;
  population: number;
  dailyFeed: number;
  feedPerMeal: number;
  feedingRate: number;
  pondBatchId: string;
  onRegisterFeeding: () => void;
  onViewHistory: () => void;
  isWeightEstimated?: boolean;
}

export function FeedingCard({
  pondName,
  batchName,
  doc,
  biomass,
  averageWeight,
  population,
  dailyFeed,
  feedPerMeal,
  feedingRate,
  pondBatchId,
  onRegisterFeeding,
  onViewHistory,
  isWeightEstimated = false
}: FeedingCardProps) {
  const { data: feedingRecords } = useFeedingProgress(undefined);
  
  // Calculate progress for this specific pond
  const todayRecords = feedingRecords?.filter(record => record.pond_batch_id === pondBatchId) || [];
  const totalPlanned = dailyFeed;
  const totalActual = todayRecords.reduce((sum, record) => sum + (record.actual_amount / 1000), 0);
  const percentage = totalPlanned > 0 ? Math.round((totalActual / totalPlanned) * 100) : 0;
  const progressPercentage = Math.min(percentage, 100);

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
          <Button
            variant="ghost"
            size="sm"
            onClick={onViewHistory}
            className="h-8 w-8 p-0 text-slate-500 hover:text-primary"
          >
            <History className="w-4 h-4" />
          </Button>
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
          onClick={onRegisterFeeding}
          className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium"
        >
          <Plus className="w-4 h-4 mr-2" />
          Registrar Alimentação
        </Button>
      </CardContent>
    </Card>
  );
}