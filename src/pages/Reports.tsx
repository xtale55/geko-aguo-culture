import { useState, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Layout } from '@/components/Layout';
import { StatsCard } from '@/components/StatsCard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Download, TrendingUp, DollarSign, Package, Target, Fish, Activity, Calendar } from 'lucide-react';
import { QuantityUtils } from '@/lib/quantityUtils';
import { useNavigate } from 'react-router-dom';
import { useFarmsQuery } from '@/hooks/useSupabaseQuery';
import { useOptimizedReportsData } from '@/hooks/useOptimizedReportsData';
import { ReportsLoadingSkeleton } from '@/components/ReportsLoadingSkeleton';

interface ProductionReport {
  totalProduction: number;
  estimatedRevenue: number;
  totalCost: number;
  productivity: number;
  averageSurvival: number;
  averageWeight: number;
  activeCycles: number;
}

interface CycleAnalysis {
  pondName: string;
  batchName: string;
  initialWeight: number;
  finalWeight: number;
  weeklyGrowth: number;
  daysInCulture: number;
  survivalRate: number;
  biomassHarvested: number;
  feedConsumed: number;
  fca: number;
  totalCosts: number;
  revenue: number;
  profit: number;
  profitMargin: number;
}

interface PondCardData {
  pondName: string;
  batchName: string;
  currentWeight: number;
  weeklyGrowth: number;
  survivalRate: number;
  daysInCulture: number;
  biomass: number;
  estimatedRevenue: number;
  totalCost: number;
  profit: number;
  profitMargin: number;
  performanceScore: number;
}

export default function Reports() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: farms } = useFarmsQuery();
  const [activeTab, setActiveTab] = useState('overview');
  const [priceTable, setPriceTable] = useState<number>(19); // Default table price for 10g shrimp

  const farmId = farms?.[0]?.id;
  const { data: reportsData, isLoading } = useOptimizedReportsData(farmId);

  // Memoized calculations to avoid recalculating on every render
  const calculatedData = useMemo(() => {
    if (!reportsData) return null;

    const { pondBatchMap, operationalCosts: operationalCostsData, farms } = reportsData;

    // Farm area
    const farmArea = farms[0]?.total_area || 1;

    // Operational costs
    const totalOperationalCosts = operationalCostsData.reduce((sum, cost) => sum + (cost.amount || 0), 0);

    // Calculate cycle analysis
    const cycleAnalyses: CycleAnalysis[] = [];
    const pondCardsData: PondCardData[] = [];

    pondBatchMap.forEach((data, pondBatchId) => {
      const { pondName, batchName, biometrics, mortality, feeding, harvest, inputApplications } = data;

      // Skip if no biometrics data
      if (biometrics.length === 0) return;

      // Sort biometrics by date
      const sortedBiometrics = biometrics.sort((a, b) => 
        new Date(a.measurement_date).getTime() - new Date(b.measurement_date).getTime()
      );

      const initialBiometry = sortedBiometrics[0];
      const latestBiometry = sortedBiometrics[sortedBiometrics.length - 1];
      
      const initialWeight = initialBiometry.average_weight || 0;
      const finalWeight = latestBiometry.average_weight || 0;
      
      // Calculate days in culture
      const startDate = new Date(initialBiometry.measurement_date);
      const endDate = new Date(latestBiometry.measurement_date);
      const daysInCulture = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      
      // Calculate weekly growth
      const weeklyGrowth = daysInCulture > 0 ? ((finalWeight - initialWeight) / daysInCulture) * 7 : 0;
      
      // Calculate total feed consumed
      const totalFeedGrams = feeding.reduce((sum, f) => sum + (f.actual_amount || 0), 0);
      const totalFeedKg = totalFeedGrams / 1000;
      
      // Calculate total feed cost
      const totalFeedCost = feeding.reduce((sum, f) => sum + ((f.actual_amount / 1000) * (f.unit_cost || 0)), 0);
      
      // Calculate biomass harvested
      const totalBiomassHarvested = harvest.reduce((sum, h) => sum + (h.biomass_harvested || 0), 0);
      
      // Calculate survival rate (estimate based on harvest)
      const totalHarvested = harvest.reduce((sum, h) => sum + (h.population_harvested || 0), 0);
      const survivalRate = totalHarvested > 0 ? 85 : 80; // Default estimates
      
      // Calculate FCA
      const fca = totalBiomassHarvested > 0 ? QuantityUtils.calculateFCA(totalFeedGrams, totalBiomassHarvested) : 0;
      
      // Calculate costs
      const inputCosts = inputApplications.reduce((sum, input) => sum + (input.total_cost || 0), 0);
      const totalCosts = totalFeedCost + inputCosts;
      
      // Calculate revenue
      const revenue = totalBiomassHarvested * priceTable;
      
      // Calculate profit
      const profit = revenue - totalCosts;
      const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0;

      const analysis: CycleAnalysis = {
        pondName: pondName || 'N/A',
        batchName: batchName || 'N/A',
        initialWeight,
        finalWeight,
        weeklyGrowth,
        daysInCulture,
        survivalRate,
        biomassHarvested: totalBiomassHarvested,
        feedConsumed: totalFeedKg,
        fca,
        totalCosts,
        revenue,
        profit,
        profitMargin
      };

      const pondCard: PondCardData = {
        pondName: pondName || 'N/A',
        batchName: batchName || 'N/A',
        currentWeight: finalWeight,
        weeklyGrowth,
        survivalRate,
        daysInCulture,
        biomass: totalBiomassHarvested,
        estimatedRevenue: revenue,
        totalCost: totalCosts,
        profit,
        profitMargin,
        performanceScore: Math.round((survivalRate + (weeklyGrowth * 10) + (profitMargin > 0 ? 20 : 0)) / 3)
      };

      cycleAnalyses.push(analysis);
      pondCardsData.push(pondCard);
    });

    // Calculate overall production report
    const totalProduction = cycleAnalyses.reduce((sum, cycle) => sum + cycle.biomassHarvested, 0);
    const totalRevenue = cycleAnalyses.reduce((sum, cycle) => sum + cycle.revenue, 0);
    const totalCosts = cycleAnalyses.reduce((sum, cycle) => sum + cycle.totalCosts, 0);
    const averageSurvival = cycleAnalyses.length > 0 ? 
      cycleAnalyses.reduce((sum, cycle) => sum + cycle.survivalRate, 0) / cycleAnalyses.length : 0;
    const averageWeight = cycleAnalyses.length > 0 ?
      cycleAnalyses.reduce((sum, cycle) => sum + cycle.finalWeight, 0) / cycleAnalyses.length : 0;

    const productivityPerHectare = farmArea > 0 ? totalProduction / farmArea : 0;

    const productionReport: ProductionReport = {
      totalProduction,
      estimatedRevenue: totalRevenue,
      totalCost: totalCosts,
      productivity: productivityPerHectare,
      averageSurvival,
      averageWeight,
      activeCycles: cycleAnalyses.length
    };

    return {
      reports: [productionReport],
      cycles: cycleAnalyses,
      pondCards: pondCardsData,
      operationalCosts: totalOperationalCosts,
      farmArea
    };
  }, [reportsData, priceTable]);

  const exportReport = () => {
    if (!calculatedData?.cycles || calculatedData.cycles.length === 0) {
      toast.error('Nenhum dado para exportar');
      return;
    }

    const csvContent = [
      'Viveiro,Lote,Peso Inicial (g),Peso Final (g),Crescimento Semanal (g),Dias Cultivo,Taxa Sobrevivência (%),Biomassa Despescada (kg),Ração Consumida (kg),FCA,Custos Totais (R$),Receita (R$),Lucro (R$),Margem Lucro (%)',
      ...calculatedData.cycles.map(cycle => 
        `${cycle.pondName},${cycle.batchName},${cycle.initialWeight.toFixed(1)},${cycle.finalWeight.toFixed(1)},${cycle.weeklyGrowth.toFixed(2)},${cycle.daysInCulture},${cycle.survivalRate.toFixed(1)},${cycle.biomassHarvested.toFixed(2)},${cycle.feedConsumed.toFixed(2)},${cycle.fca.toFixed(2)},${cycle.totalCosts.toFixed(2)},${cycle.revenue.toFixed(2)},${cycle.profit.toFixed(2)},${cycle.profitMargin.toFixed(1)}`
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `relatorio_producao_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('Relatório exportado com sucesso!');
  };

  if (isLoading) {
    return (
      <Layout>
        <ReportsLoadingSkeleton />
      </Layout>
    );
  }

  if (!calculatedData) {
    return (
      <Layout>
        <div className="text-center py-8">
          <p className="text-muted-foreground">Nenhum dado disponível para exibir relatórios.</p>
        </div>
      </Layout>
    );
  }

  const { reports, cycles, pondCards } = calculatedData;

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Relatórios de Produção</h1>
          <Button onClick={exportReport} className="flex items-center gap-2">
            <Download className="w-4 h-4" />
            Exportar Relatório
          </Button>
        </div>

        {reports && reports.length > 0 && (
          <>
            {/* KPI Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatsCard
                title="Produção Total"
                value={`${reports[0].totalProduction.toFixed(1)} kg`}
                icon={<Fish className="w-4 h-4" />}
                subtitle="Biomassa total despescada"
              />
              <StatsCard
                title="Receita Estimada"
                value={`R$ ${reports[0].estimatedRevenue.toFixed(0)}`}
                icon={<DollarSign className="w-4 h-4" />}
                subtitle="Baseada na tabela de preços"
              />
              <StatsCard
                title="Custo Total"
                value={`R$ ${reports[0].totalCost.toFixed(0)}`}
                icon={<Package className="w-4 h-4" />}
                subtitle="Ração, insumos e operacional"
              />
              <StatsCard
                title="Produtividade"
                value={`${reports[0].productivity.toFixed(1)} kg/ha`}
                icon={<Target className="w-4 h-4" />}
                subtitle="Por hectare de área"
              />
            </div>

            {/* Performance Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Taxa de Sobrevivência Média</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{reports[0].averageSurvival.toFixed(1)}%</div>
                  <p className="text-xs text-muted-foreground">
                    Meta: 85%
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Peso Médio Atual</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{reports[0].averageWeight.toFixed(1)}g</div>
                  <p className="text-xs text-muted-foreground">
                    Peso médio dos camarões
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Ciclos Ativos</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{reports[0].activeCycles}</div>
                  <p className="text-xs text-muted-foreground">
                    Ciclos em andamento
                  </p>
                </CardContent>
              </Card>
            </div>
          </>
        )}

        {/* Detailed Analysis */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="overview" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm font-medium text-foreground/80 data-[state=active]:font-semibold transition-all">Visão Geral</TabsTrigger>
            <TabsTrigger value="financial" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm font-medium text-foreground/80 data-[state=active]:font-semibold transition-all">Análise Financeira</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-6">
            <div className="text-center py-4">
              <h3 className="text-lg font-semibold mb-2">Viveiros Ativos</h3>
              <p className="text-muted-foreground">Performance e métricas por viveiro</p>
            </div>
            
            {pondCards && pondCards.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {pondCards.map((pond, index) => (
                  <Card 
                    key={index} 
                    className="hover:shadow-lg transition-shadow cursor-pointer" 
                    onClick={() => navigate(`/pond-history/${pond.pondName}`)}
                  >
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">{pond.pondName}</CardTitle>
                          <CardDescription>Lote: {pond.batchName}</CardDescription>
                        </div>
                        <Badge variant={pond.performanceScore >= 80 ? "default" : pond.performanceScore >= 60 ? "secondary" : "destructive"}>
                          {pond.performanceScore}% Performance
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Peso Atual:</span>
                          <div className="font-medium">{pond.currentWeight.toFixed(1)}g</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Crescimento:</span>
                          <div className="font-medium">{pond.weeklyGrowth.toFixed(1)}g/sem</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Sobrevivência:</span>
                          <div className="font-medium">{pond.survivalRate.toFixed(1)}%</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Dias de Cultivo:</span>
                          <div className="font-medium">{pond.daysInCulture} dias</div>
                        </div>
                      </div>
                      
                      <div className="pt-3 border-t">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground">Biomassa:</span>
                          <span className="font-medium">{QuantityUtils.formatKg(pond.biomass * 1000)}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground">Receita Estimada:</span>
                          <span className="font-medium">R$ {pond.estimatedRevenue.toFixed(0)}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Nenhum viveiro ativo encontrado</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="financial" className="space-y-6">
            <div className="space-y-6">
              <div className="bg-muted/50 p-6 rounded-lg">
                <h3 className="text-lg font-semibold mb-4">Configuração de Preços</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Tabela de Preço (R$/kg)</label>
                    <input
                      type="number"
                      value={priceTable}
                      onChange={(e) => setPriceTable(Number(e.target.value))}
                      className="w-full mt-1 px-3 py-2 border border-input rounded-md bg-background"
                      min="0"
                      step="0.1"
                    />
                  </div>
                </div>
              </div>

              <div className="text-center py-4">
                <h3 className="text-lg font-semibold mb-2">Análise Financeira por Viveiro</h3>
                <p className="text-muted-foreground">Rentabilidade e custos detalhados</p>
              </div>

              {pondCards && pondCards.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {pondCards.map((pond, index) => {
                    const costPerKg = pond.biomass > 0 ? pond.totalCost / pond.biomass : 0;
                    
                    return (
                      <Card key={index} className="hover:shadow-lg transition-shadow">
                        <CardHeader>
                          <div className="flex justify-between items-start">
                            <div>
                              <CardTitle className="text-lg">{pond.pondName}</CardTitle>
                              <CardDescription>Lote: {pond.batchName}</CardDescription>
                            </div>
                            <Badge variant={pond.profit > 0 ? "default" : "destructive"}>
                              {pond.profit > 0 ? "Lucro" : "Prejuízo"}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {/* Financial KPIs */}
                          <div className="grid grid-cols-2 gap-4">
                            <Card className="p-3">
                              <div className="text-center">
                                <div className="text-lg font-bold text-primary">{QuantityUtils.formatKg(pond.biomass * 1000)}</div>
                                <div className="text-xs text-muted-foreground">Biomassa</div>
                              </div>
                            </Card>
                            <Card className="p-3">
                              <div className="text-center">
                                <div className="text-lg font-bold text-blue-600">R$ {costPerKg.toFixed(2)}</div>
                                <div className="text-xs text-muted-foreground">Custo/kg</div>
                              </div>
                            </Card>
                            <Card className="p-3">
                              <div className="text-center">
                                <div className="text-lg font-bold text-green-600">R$ {pond.estimatedRevenue.toFixed(0)}</div>
                                <div className="text-xs text-muted-foreground">Receita</div>
                              </div>
                            </Card>
                            <Card className="p-3">
                              <div className="text-center">
                                <div className="text-lg font-bold text-orange-600">R$ {pond.totalCost.toFixed(0)}</div>
                                <div className="text-xs text-muted-foreground">Custo Total</div>
                              </div>
                            </Card>
                          </div>
                          
                          {/* Profit/Loss */}
                          <div className="pt-3 border-t">
                            <div className="flex justify-between items-center mb-2">
                              <span className="font-medium">Lucro/Prejuízo:</span>
                              <span className={`font-bold ${pond.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                R$ {pond.profit.toFixed(0)}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-muted-foreground">Margem de Lucro:</span>
                              <span className={`text-sm font-medium ${pond.profitMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {pond.profitMargin.toFixed(1)}%
                              </span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Nenhum dado financeiro disponível</p>
                </div>
              )}

              {/* Overall Financial Summary */}
              {reports && reports.length > 0 && (
                <Card className="mt-8">
                  <CardHeader>
                    <CardTitle>Resumo Financeiro Geral</CardTitle>
                    <CardDescription>Consolidado de todos os viveiros</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-primary">{QuantityUtils.formatKg(reports[0].totalProduction * 1000)}</div>
                        <div className="text-sm text-muted-foreground">Produção Total</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">R$ {reports[0].estimatedRevenue.toFixed(0)}</div>
                        <div className="text-sm text-muted-foreground">Receita Total</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-orange-600">R$ {reports[0].totalCost.toFixed(0)}</div>
                        <div className="text-sm text-muted-foreground">Custo Total</div>
                      </div>
                      <div className="text-center">
                        <div className={`text-2xl font-bold ${(reports[0].estimatedRevenue - reports[0].totalCost) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          R$ {(reports[0].estimatedRevenue - reports[0].totalCost).toFixed(0)}
                        </div>
                        <div className="text-sm text-muted-foreground">Lucro Total</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}