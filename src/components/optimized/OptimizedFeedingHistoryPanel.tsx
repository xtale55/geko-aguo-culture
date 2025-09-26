import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  TrendingUp, DollarSign, Activity, Target, 
  Clock, Utensils, Calculator
} from "lucide-react";
import { useOptimizedFeedingHistory, useOptimizedFeedingMetrics } from "@/hooks/useOptimizedSupabaseQuery";
import { QuantityUtils } from "@/lib/quantityUtils";
import { format } from "date-fns";

interface OptimizedFeedingHistoryPanelProps {
  farmId?: string;
}

export function OptimizedFeedingHistoryPanel({ farmId }: OptimizedFeedingHistoryPanelProps) {
  // Optimized data fetching with smart caching
  const { data: feedingHistory, isLoading: historyLoading } = useOptimizedFeedingHistory(farmId, 30, 20);
  const { data: feedingMetrics, isLoading: metricsLoading } = useOptimizedFeedingMetrics(farmId);
  
  // Memoized calculations for performance
  const feedingSummary = useMemo(() => {
    if (!feedingHistory) return null;
    
    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);
    
    const recentFeeding = feedingHistory.filter(record => 
      new Date(record.feeding_date) >= last30Days
    );
    
    const totalPlanned = recentFeeding.reduce((sum, record) => 
      sum + QuantityUtils.gramsToKg(record.planned_amount), 0
    );
    
    const totalActual = recentFeeding.reduce((sum, record) => 
      sum + QuantityUtils.gramsToKg(record.actual_amount), 0
    );
    
    const totalCost = recentFeeding.reduce((sum, record) => 
      sum + (QuantityUtils.gramsToKg(record.actual_amount) * (record.unit_cost || 0)), 0
    );
    
    const efficiency = totalPlanned > 0 ? (totalActual / totalPlanned) * 100 : 0;
    
    return {
      totalPlanned,
      totalActual,
      totalCost,
      efficiency,
      recordCount: recentFeeding.length
    };
  }, [feedingHistory]);
  
  const recentRecords = useMemo(() => {
    if (!feedingHistory) return [];
    return feedingHistory.slice(0, 10); // Show last 10 records
  }, [feedingHistory]);

  if (historyLoading || metricsLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Utensils className="w-5 h-5" />
            Histórico de Alimentação (30 dias)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Utensils className="w-5 h-5" />
          Histórico de Alimentação (30 dias)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Cards - Optimized layout */}
        {feedingSummary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-primary/10 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Consumido</p>
                  <p className="text-xl font-bold text-primary">
                    {feedingSummary.totalActual.toFixed(1)} kg
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-primary/70" />
              </div>
            </div>
            
            <div className="bg-success/10 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Custo Total</p>
                  <p className="text-xl font-bold text-success">
                    R$ {feedingSummary.totalCost.toFixed(2)}
                  </p>
                </div>
                <DollarSign className="w-8 h-8 text-success/70" />
              </div>
            </div>
            
            <div className="bg-accent/10 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Eficiência</p>
                  <p className="text-xl font-bold text-accent">
                    {feedingSummary.efficiency.toFixed(1)}%
                  </p>
                </div>
                <Target className="w-8 h-8 text-accent/70" />
              </div>
            </div>
            
            <div className="bg-secondary/10 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Registros</p>
                  <p className="text-xl font-bold text-secondary-foreground">
                    {feedingSummary.recordCount}
                  </p>
                </div>
                <Activity className="w-8 h-8 text-secondary-foreground/70" />
              </div>
            </div>
          </div>
        )}

        {/* Recent Feeding Records - Optimized display */}
        <div>
          <h3 className="font-medium text-sm mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Registros Recentes
          </h3>
          
          {recentRecords.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Utensils className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Nenhum registro de alimentação encontrado</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentRecords.map((record) => (
                <div 
                  key={record.id} 
                  className="border rounded-lg p-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-primary rounded-full" />
                      <div>
                        <p className="font-medium text-sm">
                          {format(new Date(record.feeding_date), 'dd/MM/yyyy')} às {record.feeding_time}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {record.feed_type_name || 'Ração não especificada'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm">
                      <div className="text-center">
                        <p className="text-muted-foreground text-xs">Planejado</p>
                        <p className="font-medium">
                          {QuantityUtils.gramsToKg(record.planned_amount).toFixed(1)} kg
                        </p>
                      </div>
                      
                      <div className="text-center">
                        <p className="text-muted-foreground text-xs">Consumido</p>
                        <p className="font-medium text-primary">
                          {QuantityUtils.gramsToKg(record.actual_amount).toFixed(1)} kg
                        </p>
                      </div>
                      
                      <div className="text-center">
                        <p className="text-muted-foreground text-xs">Custo</p>
                        <p className="font-medium text-success">
                          R$ {(QuantityUtils.gramsToKg(record.actual_amount) * (record.unit_cost || 0)).toFixed(2)}
                        </p>
                      </div>
                      
                      <Badge variant={
                        QuantityUtils.gramsToKg(record.actual_amount) === QuantityUtils.gramsToKg(record.planned_amount) 
                          ? "default" 
                          : QuantityUtils.gramsToKg(record.actual_amount) > QuantityUtils.gramsToKg(record.planned_amount)
                            ? "destructive"
                            : "secondary"
                      } className="text-xs">
                        {((QuantityUtils.gramsToKg(record.actual_amount) / Math.max(QuantityUtils.gramsToKg(record.planned_amount), 0.1)) * 100).toFixed(0)}%
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Current Feeding Metrics */}
        {feedingMetrics && feedingMetrics.length > 0 && (
          <div>
            <h3 className="font-medium text-sm mb-3 flex items-center gap-2">
              <Calculator className="w-4 h-4" />
              Métricas Atuais
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {feedingMetrics.slice(0, 3).map((metric) => (
                <div key={metric.pond_batch_id} className="border rounded-lg p-3">
                  <p className="text-sm font-medium">{metric.pond_name}</p>
                  <p className="text-xs text-muted-foreground mb-2">{metric.batch_name}</p>
                  
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="text-muted-foreground">Ração/dia</p>
                      <p className="font-medium">{metric.daily_feed_kg.toFixed(1)} kg</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Por refeição</p>
                      <p className="font-medium">{metric.feed_per_meal_g} g</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Refeições</p>
                      <p className="font-medium">{metric.meals_per_day}x/dia</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">DOC</p>
                      <p className="font-medium">{metric.doc} dias</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}