import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, Calendar, Scale } from "lucide-react";
import { useOptimizedBiometryHistory } from "@/hooks/useOptimizedSupabaseQuery";

interface GrowthData {
  pond_batch_id: string;
  pond_name: string;
  batch_name: string;
  doc: number;
  weekly_growth: number;
  daily_growth: number;
  growth_trend: 'increasing' | 'stable' | 'decreasing';
  latest_weight: number;
  initial_weight: number;
  total_growth: number;
}

interface OptimizedGrowthAnalysisProps {
  farmId?: string;
}

export function OptimizedGrowthAnalysis({ farmId }: OptimizedGrowthAnalysisProps) {
  const { data: biometryHistory, isLoading } = useOptimizedBiometryHistory(farmId, 50);
  
  // Memoized growth calculations for performance
  const growthData = useMemo(() => {
    if (!biometryHistory) return [];
    
    // Group biometrics by pond_batch_id
    const grouped = biometryHistory.reduce((acc, biometry) => {
      const key = biometry.pond_batch_id;
      if (!acc[key]) {
        acc[key] = {
          pond_name: biometry.pond_batches.ponds.name,
          batch_name: biometry.pond_batches.batches.name,
          biometrics: []
        };
      }
      acc[key].biometrics.push(biometry);
      return acc;
    }, {} as Record<string, any>);
    
    const processedGrowthData: GrowthData[] = [];
    
    Object.entries(grouped).forEach(([pond_batch_id, group]) => {
      const biometrics = group.biometrics.sort((a: any, b: any) => 
        new Date(a.measurement_date).getTime() - new Date(b.measurement_date).getTime()
      );
      
      if (biometrics.length < 2) return; // Need at least 2 measurements
      
      const firstBiometry = biometrics[0];
      const lastBiometry = biometrics[biometrics.length - 1];
      const secondLastBiometry = biometrics[biometrics.length - 2];
      
      // Calculate DOC (days of culture) - simplified
      const doc = Math.ceil(
        (new Date().getTime() - new Date(firstBiometry.measurement_date).getTime()) / (1000 * 60 * 60 * 24)
      );
      
      // Calculate growth metrics
      const totalDays = Math.ceil(
        (new Date(lastBiometry.measurement_date).getTime() - 
         new Date(firstBiometry.measurement_date).getTime()) / (1000 * 60 * 60 * 24)
      );
      
      const totalGrowth = lastBiometry.average_weight - firstBiometry.average_weight;
      const dailyGrowth = totalDays > 0 ? totalGrowth / totalDays : 0;
      const weeklyGrowth = dailyGrowth * 7;
      
      // Determine growth trend
      let growthTrend: 'increasing' | 'stable' | 'decreasing';
      if (biometrics.length >= 2) {
        const recentGrowth = lastBiometry.average_weight - secondLastBiometry.average_weight;
        if (recentGrowth > 0.5) {
          growthTrend = 'increasing';
        } else if (recentGrowth < -0.5) {
          growthTrend = 'decreasing';
        } else {
          growthTrend = 'stable';
        }
      } else {
        growthTrend = 'stable';
      }
      
      processedGrowthData.push({
        pond_batch_id,
        pond_name: group.pond_name,
        batch_name: group.batch_name,
        doc,
        weekly_growth: weeklyGrowth,
        daily_growth: dailyGrowth,
        growth_trend: growthTrend,
        latest_weight: lastBiometry.average_weight,
        initial_weight: firstBiometry.average_weight,
        total_growth: totalGrowth
      });
    });
    
    // Sort by DOC (most recent first)
    return processedGrowthData.sort((a, b) => b.doc - a.doc);
  }, [biometryHistory]);
  
  // Memoized summary calculations
  const summaryMetrics = useMemo(() => {
    if (growthData.length === 0) return null;
    
    const averageWeeklyGrowth = growthData.reduce((sum, data) => sum + data.weekly_growth, 0) / growthData.length;
    const averageDailyGrowth = growthData.reduce((sum, data) => sum + data.daily_growth, 0) / growthData.length;
    
    return {
      averageWeeklyGrowth,
      averageDailyGrowth
    };
  }, [growthData]);

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing':
        return <TrendingUp className="w-4 h-4 text-success" />;
      case 'decreasing':
        return <TrendingUp className="w-4 h-4 text-destructive rotate-180" />;
      default:
        return <TrendingUp className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'increasing':
        return 'default';
      case 'decreasing':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Análise de Crescimento Otimizada
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {[1, 2].map(i => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-20" />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Análise de Crescimento Otimizada
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Metrics - Optimized layout */}
        {summaryMetrics && (
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-primary/10 rounded-lg p-3">
              <p className="text-xs text-muted-foreground">Crescimento Semanal Médio</p>
              <p className="text-lg font-bold text-primary">
                {summaryMetrics.averageWeeklyGrowth.toFixed(2)}g
              </p>
            </div>
            <div className="bg-success/10 rounded-lg p-3">
              <p className="text-xs text-muted-foreground">Crescimento Diário Médio</p>
              <p className="text-lg font-bold text-success">
                {summaryMetrics.averageDailyGrowth.toFixed(2)}g
              </p>
            </div>
          </div>
        )}

        {/* Growth Data by Pond - Optimized display */}
        <div className="space-y-3">
          <h3 className="font-medium text-sm">Performance por Viveiro</h3>
          {growthData.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-4">
              Não há dados suficientes para análise de crescimento. 
              São necessárias pelo menos 2 biometrias por viveiro.
            </p>
          ) : (
            <div className="space-y-2">
              {growthData.slice(0, 5).map((data) => ( // Limit to 5 for performance
                <div key={data.pond_batch_id} className="border rounded-lg p-3 space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium text-sm">{data.batch_name} - {data.pond_name}</h4>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        DOC {data.doc}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getTrendIcon(data.growth_trend)}
                      <Badge variant={getTrendColor(data.growth_trend) as any} className="text-xs">
                        {data.growth_trend === 'increasing' ? 'Crescendo' : 
                         data.growth_trend === 'decreasing' ? 'Declinando' : 'Estável'}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                    <div>
                      <p className="text-muted-foreground">Peso Atual</p>
                      <p className="font-medium flex items-center gap-1">
                        <Scale className="w-3 h-3" />
                        {data.latest_weight.toFixed(1)}g
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Crescimento Total</p>
                      <p className="font-medium text-primary">+{data.total_growth.toFixed(1)}g</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Semanal</p>
                      <p className="font-medium text-success">{data.weekly_growth.toFixed(2)}g/sem</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Diário</p>
                      <p className="font-medium text-accent">{data.daily_growth.toFixed(2)}g/dia</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}