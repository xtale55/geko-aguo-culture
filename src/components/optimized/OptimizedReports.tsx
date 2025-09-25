import { useMemo } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  TrendingUp, Download, Calendar, DollarSign, Scale, 
  Activity, BarChart3, ArrowLeft
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { 
  useOptimizedDashboardSummary, 
  useOptimizedFeedingMetrics,
  useOptimizedRecentManagementData 
} from "@/hooks/useOptimizedSupabaseQuery";

interface OptimizedReportsProps {
  farmId?: string;
}

export function OptimizedReports({ farmId }: OptimizedReportsProps) {
  const navigate = useNavigate();
  
  // Optimized data fetching with aggressive caching
  const { data: dashboardSummary, isLoading: summaryLoading } = useOptimizedDashboardSummary(farmId);
  const { data: feedingMetrics, isLoading: feedingLoading } = useOptimizedFeedingMetrics(farmId);
  const { data: managementData, isLoading: managementLoading } = useOptimizedRecentManagementData(farmId);
  
  // Memoized production report calculations
  const productionReport = useMemo(() => {
    if (!dashboardSummary || !feedingMetrics) return null;
    
    const totalFeedConsumed = feedingMetrics.reduce((sum, metric) => sum + metric.total_consumed_kg, 0);
    const totalFeedCost = totalFeedConsumed * 7; // Assuming R$ 7 per kg average
    const averageFCA = feedingMetrics.length > 0 
      ? feedingMetrics.reduce((sum, metric) => {
          const fca = metric.current_biomass > 0 ? metric.total_consumed_kg / metric.current_biomass : 1.5;
          return sum + fca;
        }, 0) / feedingMetrics.length
      : 1.5;
    
    // Estimate survival rate (simplified)
    const avgSurvivalRate = 85; // Default estimate
    
    // Calculate productivity per hectare (assuming 1 hectare total)
    const productivityPerHa = dashboardSummary.totalBiomass;
    
    // Revenue estimation (R$ 20 per kg average)
    const estimatedRevenue = dashboardSummary.totalBiomass * 20;
    const profitMargin = estimatedRevenue > 0 ? ((estimatedRevenue - totalFeedCost) / estimatedRevenue) * 100 : 0;
    
    return {
      totalCycles: dashboardSummary.activePonds,
      activeCycles: dashboardSummary.activePonds,
      totalProduction: dashboardSummary.totalBiomass,
      averageWeight: dashboardSummary.avgWeight,
      survivalRate: avgSurvivalRate,
      productivityPerHa,
      totalRevenue: estimatedRevenue,
      totalCost: totalFeedCost,
      profitMargin,
      averageFCA
    };
  }, [dashboardSummary, feedingMetrics]);
  
  // Memoized cycle analysis
  const cycleAnalysis = useMemo(() => {
    if (!feedingMetrics || !dashboardSummary) return [];
    
    return feedingMetrics.map(metric => ({
      cycle_id: metric.pond_batch_id,
      batch_name: metric.batch_name,
      pond_name: metric.pond_name,
      doc: metric.doc,
      current_population: metric.current_population,
      average_weight: metric.latest_weight,
      biomass: metric.current_biomass,
      feed_conversion: metric.current_biomass > 0 ? metric.total_consumed_kg / metric.current_biomass : 1.5,
      estimated_revenue: metric.current_biomass * 20, // R$ 20 per kg
      cycle_cost: metric.total_consumed_kg * 7, // R$ 7 per kg feed
      profit_margin: metric.current_biomass > 0 ? 
        (((metric.current_biomass * 20) - (metric.total_consumed_kg * 7)) / (metric.current_biomass * 20)) * 100 : 0
    }));
  }, [feedingMetrics, dashboardSummary]);

  const isLoading = summaryLoading || feedingLoading || managementLoading;

  if (isLoading) {
    return (
      <Layout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-10 w-32" />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          
          <Skeleton className="h-96" />
        </div>
      </Layout>
    );
  }

  if (!productionReport) {
    return (
      <Layout>
        <div className="text-center py-12">
          <BarChart3 className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-2xl font-semibold mb-2">Dados Insuficientes</h2>
          <p className="text-muted-foreground mb-6">
            Não há dados suficientes para gerar relatórios de produção.
          </p>
          <Button onClick={() => navigate('/dashboard')}>
            Voltar ao Dashboard
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate('/dashboard')}
              className="mb-2"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
            <h1 className="text-4xl font-bold text-primary mb-2">
              Relatórios de Produção Otimizados
            </h1>
            <p className="text-slate-600">
              Análise completa de performance e resultados
            </p>
          </div>
          <Button>
            <Download className="w-4 h-4 mr-2" />
            Exportar PDF
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="backdrop-blur-sm bg-gradient-to-br from-blue-50 to-blue-100/80 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Produção Total</p>
                  <p className="text-2xl font-bold text-blue-700">
                    {productionReport.totalProduction.toFixed(1)} kg
                  </p>
                </div>
                <Scale className="w-8 h-8 text-blue-600/70" />
              </div>
            </CardContent>
          </Card>

          <Card className="backdrop-blur-sm bg-gradient-to-br from-emerald-50 to-emerald-100/80 border-emerald-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Receita Estimada</p>
                  <p className="text-2xl font-bold text-emerald-700">
                    R$ {productionReport.totalRevenue.toFixed(2)}
                  </p>
                </div>
                <DollarSign className="w-8 h-8 text-emerald-600/70" />
              </div>
            </CardContent>
          </Card>

          <Card className="backdrop-blur-sm bg-gradient-to-br from-purple-50 to-purple-100/80 border-purple-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">FCA Médio</p>
                  <p className="text-2xl font-bold text-purple-700">
                    {productionReport.averageFCA.toFixed(2)}
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-purple-600/70" />
              </div>
            </CardContent>
          </Card>

          <Card className="backdrop-blur-sm bg-gradient-to-br from-orange-50 to-orange-100/80 border-orange-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Margem de Lucro</p>
                  <p className="text-2xl font-bold text-orange-700">
                    {productionReport.profitMargin.toFixed(1)}%
                  </p>
                </div>
                <Activity className="w-8 h-8 text-orange-600/70" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Reports */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="cycles">Análise de Ciclos</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Production Metrics */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Scale className="w-5 h-5" />
                    Métricas de Produção
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Ciclos Ativos</span>
                    <span className="font-semibold">{productionReport.activeCycles}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Peso Médio</span>
                    <span className="font-semibold">{productionReport.averageWeight.toFixed(1)}g</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Taxa de Sobrevivência</span>
                    <Badge variant="default">{productionReport.survivalRate.toFixed(1)}%</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Produtividade/ha</span>
                    <span className="font-semibold">{productionReport.productivityPerHa.toFixed(1)} kg/ha</span>
                  </div>
                </CardContent>
              </Card>

              {/* Financial Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5" />
                    Resumo Financeiro
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Receita Total</span>
                    <span className="font-semibold text-success">
                      R$ {productionReport.totalRevenue.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Custo Total</span>
                    <span className="font-semibold text-destructive">
                      R$ {productionReport.totalCost.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Lucro Estimado</span>
                    <span className="font-semibold">
                      R$ {(productionReport.totalRevenue - productionReport.totalCost).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Margem de Lucro</span>
                    <Badge variant={productionReport.profitMargin > 20 ? "default" : "secondary"}>
                      {productionReport.profitMargin.toFixed(1)}%
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="cycles" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Análise de Ciclos Ativos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {cycleAnalysis.map((cycle) => (
                    <div key={cycle.cycle_id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium">{cycle.batch_name} - {cycle.pond_name}</h4>
                          <p className="text-sm text-muted-foreground">
                            DOC {cycle.doc} • {cycle.current_population.toLocaleString()} camarões
                          </p>
                        </div>
                        <Badge variant={cycle.profit_margin > 20 ? "default" : "secondary"}>
                          {cycle.profit_margin.toFixed(1)}% lucro
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Peso Médio</p>
                          <p className="font-medium">{cycle.average_weight.toFixed(1)}g</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Biomassa</p>
                          <p className="font-medium">{cycle.biomass.toFixed(1)} kg</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">FCA</p>
                          <p className="font-medium">{cycle.feed_conversion.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Receita Est.</p>
                          <p className="font-medium text-success">R$ {cycle.estimated_revenue.toFixed(2)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="performance" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Growth Performance */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Performance de Crescimento
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {managementData?.biometrics.slice(0, 4).map((bio, index) => (
                      <div key={index} className="flex justify-between items-center">
                        <span className="text-sm">
                          {new Date(bio.measurement_date).toLocaleDateString()}
                        </span>
                        <span className="font-medium">{bio.average_weight.toFixed(1)}g</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Recent Activity */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="w-5 h-5" />
                    Atividades Recentes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="text-sm">
                      <p className="font-medium mb-2">Últimas Coletas:</p>
                      {managementData?.harvests.slice(0, 3).map((harvest, index) => (
                        <div key={index} className="flex justify-between">
                          <span>{new Date(harvest.harvest_date).toLocaleDateString()}</span>
                          <span>{harvest.biomass_harvested}kg</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}