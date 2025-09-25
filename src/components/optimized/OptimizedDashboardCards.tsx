import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp, DollarSign, Scale, Activity,
  Fish, Target, Calculator, Waves
} from "lucide-react";
import { useOptimizedDashboardSummary, useOptimizedFeedingMetrics } from "@/hooks/useOptimizedSupabaseQuery";

interface OptimizedDashboardCardsProps {
  farmId?: string;
}

export function OptimizedDashboardCards({ farmId }: OptimizedDashboardCardsProps) {
  const { data: dashboardSummary, isLoading: summaryLoading } = useOptimizedDashboardSummary(farmId);
  const { data: feedingMetrics, isLoading: feedingLoading } = useOptimizedFeedingMetrics(farmId);
  
  // Memoized calculations for performance
  const calculatedMetrics = useMemo(() => {
    if (!dashboardSummary || !feedingMetrics) return null;
    
    const totalDailyFeed = feedingMetrics.reduce((sum, metric) => sum + metric.daily_feed_kg, 0);
    const totalConsumed = feedingMetrics.reduce((sum, metric) => sum + metric.total_consumed_kg, 0);
    const averageFCA = feedingMetrics.length > 0 
      ? feedingMetrics.reduce((sum, metric) => {
          // Simple FCA estimation based on consumed feed vs biomass
          const fca = metric.current_biomass > 0 ? metric.total_consumed_kg / metric.current_biomass : 1.5;
          return sum + fca;
        }, 0) / feedingMetrics.length
      : 1.5;
    
    return {
      totalDailyFeed,
      totalConsumed,
      averageFCA
    };
  }, [dashboardSummary, feedingMetrics]);

  if (summaryLoading || feedingLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map(i => (
          <Card key={i}>
            <CardContent className="p-6">
              <Skeleton className="h-16 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!dashboardSummary || !calculatedMetrics) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Fish className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>Carregando métricas do dashboard...</p>
      </div>
    );
  }

  const cards = [
    {
      title: "Viveiros Ativos",
      value: dashboardSummary.activePonds,
      unit: "viveiros",
      icon: Waves,
      color: "bg-blue-500/10 text-blue-700",
      iconColor: "text-blue-600/70"
    },
    {
      title: "Biomassa Total",
      value: dashboardSummary.totalBiomass.toFixed(1),
      unit: "kg",
      icon: Scale,
      color: "bg-emerald-500/10 text-emerald-700",
      iconColor: "text-emerald-600/70"
    },
    {
      title: "Peso Médio",
      value: dashboardSummary.avgWeight.toFixed(1),
      unit: "g",
      icon: TrendingUp,
      color: "bg-purple-500/10 text-purple-700",
      iconColor: "text-purple-600/70"
    },
    {
      title: "Ração Diária",
      value: calculatedMetrics.totalDailyFeed.toFixed(1),
      unit: "kg",
      icon: Target,
      color: "bg-orange-500/10 text-orange-700",
      iconColor: "text-orange-600/70"
    }
  ];

  return (
    <div className="space-y-6">
      {/* Main Dashboard Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card, index) => (
          <Card key={index} className="hover:shadow-lg transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {card.title}
                  </p>
                  <p className="text-2xl font-bold">
                    {card.value}
                    <span className="text-sm font-normal text-muted-foreground ml-1">
                      {card.unit}
                    </span>
                  </p>
                </div>
                <div className={`p-3 rounded-full ${card.color}`}>
                  <card.icon className={`w-6 h-6 ${card.iconColor}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Additional Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Consumo Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Ração Consumida</span>
                <span className="font-semibold">
                  {calculatedMetrics.totalConsumed.toFixed(1)} kg
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Custo Estimado</span>
                <span className="font-semibold text-success">
                  R$ {(calculatedMetrics.totalConsumed * 7).toFixed(2)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Calculator className="w-5 h-5" />
              FCA Médio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-center">
                <p className="text-3xl font-bold text-primary">
                  {calculatedMetrics.averageFCA.toFixed(2)}
                </p>
                <Badge variant={
                  calculatedMetrics.averageFCA <= 1.3 ? "default" :
                  calculatedMetrics.averageFCA <= 1.6 ? "secondary" : "destructive"
                } className="mt-2">
                  {calculatedMetrics.averageFCA <= 1.3 ? "Excelente" :
                   calculatedMetrics.averageFCA <= 1.6 ? "Bom" : "Precisa Melhorar"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Estimativa Diária
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Custo Ração</span>
                <span className="font-semibold text-destructive">
                  R$ {(calculatedMetrics.totalDailyFeed * 7).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Por kg de biomassa</span>
                <span className="font-semibold">
                  R$ {dashboardSummary.totalBiomass > 0 ? 
                    ((calculatedMetrics.totalDailyFeed * 7) / dashboardSummary.totalBiomass).toFixed(2) : 
                    "0.00"
                  }
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}