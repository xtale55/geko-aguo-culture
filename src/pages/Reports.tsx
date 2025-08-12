import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { 
  TrendingUp, Download, Calendar, DollarSign, Scale, 
  Activity, BarChart3, PieChart, LineChart, FileText
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ProductionReport {
  totalCycles: number;
  activeCycles: number;
  totalProduction: number;
  averageWeight: number;
  survivalRate: number;
  productivityPerHa: number;
  totalRevenue: number;
  operationalCosts: number;
  profitMargin: number;
}

interface CycleAnalysis {
  cycle_id: string;
  batch_name: string;
  pond_name: string;
  stocking_date: string;
  doc: number;
  initial_population: number;
  current_population: number;
  survival_rate: number;
  average_weight: number;
  biomass: number;
  feed_conversion: number;
  estimated_revenue: number;
  cycle_cost: number;
  profit_margin: number;
}

export default function Reports() {
  const [productionReport, setProductionReport] = useState<ProductionReport>({
    totalCycles: 0,
    activeCycles: 0,
    totalProduction: 0,
    averageWeight: 0,
    survivalRate: 0,
    productivityPerHa: 0,
    totalRevenue: 0,
    operationalCosts: 0,
    profitMargin: 0,
  });
  const [cycleAnalyses, setCycleAnalyses] = useState<CycleAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('last_30_days');
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      loadReports();
    }
  }, [user, selectedPeriod]);

  const loadReports = async () => {
    try {
      setLoading(true);
      
      // Get farms
      const { data: farms } = await supabase
        .from('farms')
        .select('id, total_area')
        .eq('user_id', user?.id);

      if (!farms || farms.length === 0) {
        setLoading(false);
        return;
      }

      const farmId = farms[0].id;
      const farmArea = farms[0].total_area || 1;

      // Get comprehensive cycle data
      const { data: cycles } = await supabase
        .from('pond_batches')
        .select(`
          *,
          ponds(name, area),
          batches(name, total_pl_quantity, pl_cost),
          biometrics(average_weight, measurement_date),
          mortality_records(dead_count, record_date)
        `)
        .in('pond_id', 
          await supabase
            .from('ponds')
            .select('id')
            .eq('farm_id', farmId)
            .then(({ data }) => data?.map(p => p.id) || [])
        );

      // Get inventory costs
      const { data: inventory } = await supabase
        .from('inventory')
        .select('total_value, category')
        .eq('farm_id', farmId);

      // Process cycles for analysis
      const processedCycles: CycleAnalysis[] = [];
      let totalProduction = 0;
      let totalCosts = 0;
      let activeCycles = 0;

      cycles?.forEach(cycle => {
        const stocking = new Date(cycle.stocking_date);
        const today = new Date();
        const doc = Math.ceil((today.getTime() - stocking.getTime()) / (1000 * 60 * 60 * 24));
        
        // Get latest biometry
        const latestBiometry = cycle.biometrics
          ?.sort((a, b) => new Date(b.measurement_date).getTime() - new Date(a.measurement_date).getTime())[0];

        // Calculate mortality
        const totalMortality = cycle.mortality_records
          ?.reduce((sum, mr) => sum + mr.dead_count, 0) || 0;
        
        const survivalRate = cycle.pl_quantity > 0 
          ? ((cycle.current_population) / cycle.pl_quantity) * 100 
          : 0;

        if (latestBiometry && cycle.current_population > 0) {
          activeCycles++;
          
          const biomass = (cycle.current_population * latestBiometry.average_weight) / 1000;
          totalProduction += biomass;
          
          // Estimate costs (PL cost + preparation + estimated feed)
          const plCost = cycle.batches?.pl_cost || 0;
          const preparationCost = cycle.preparation_cost || 0;
          const estimatedFeedCost = biomass * 1.5 * 7; // Estimate: 1.5 FCR * R$7/kg
          const cycleCost = (plCost * cycle.pl_quantity / 1000) + preparationCost + estimatedFeedCost;
          totalCosts += cycleCost;

          // Estimate revenue (R$25/kg average)
          const estimatedRevenue = biomass * 25;
          const profitMargin = ((estimatedRevenue - cycleCost) / estimatedRevenue) * 100;

          processedCycles.push({
            cycle_id: cycle.id,
            batch_name: cycle.batches?.name || '',
            pond_name: cycle.ponds?.name || '',
            stocking_date: cycle.stocking_date,
            doc,
            initial_population: cycle.pl_quantity,
            current_population: cycle.current_population,
            survival_rate: survivalRate,
            average_weight: latestBiometry.average_weight,
            biomass,
            feed_conversion: 1.5, // Estimated
            estimated_revenue: estimatedRevenue,
            cycle_cost: cycleCost,
            profit_margin: profitMargin
          });
        }
      });

      // Calculate additional costs from inventory
      const inventoryCosts = inventory?.reduce((sum, item) => sum + item.total_value, 0) || 0;
      const totalOperationalCosts = totalCosts + inventoryCosts;

      // Calculate overall metrics
      const totalRevenue = totalProduction * 25; // R$25/kg average
      const overallProfitMargin = totalRevenue > 0 
        ? ((totalRevenue - totalOperationalCosts) / totalRevenue) * 100 
        : 0;

      const averageWeight = processedCycles.length > 0
        ? processedCycles.reduce((sum, c) => sum + c.average_weight, 0) / processedCycles.length
        : 0;

      const averageSurvival = processedCycles.length > 0
        ? processedCycles.reduce((sum, c) => sum + c.survival_rate, 0) / processedCycles.length
        : 0;

      setProductionReport({
        totalCycles: cycles?.length || 0,
        activeCycles,
        totalProduction,
        averageWeight,
        survivalRate: averageSurvival,
        productivityPerHa: totalProduction / farmArea,
        totalRevenue,
        operationalCosts: totalOperationalCosts,
        profitMargin: overallProfitMargin
      });

      setCycleAnalyses(processedCycles.sort((a, b) => b.doc - a.doc));
      
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao carregar relatórios",
        description: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  const exportReport = () => {
    const csvContent = [
      ['Lote', 'Viveiro', 'DOC', 'População Inicial', 'População Atual', 'Sobrevivência (%)', 'Peso Médio (g)', 'Biomassa (kg)', 'Receita Estimada (R$)', 'Custo do Ciclo (R$)', 'Margem (%)'],
      ...cycleAnalyses.map(cycle => [
        cycle.batch_name,
        cycle.pond_name,
        cycle.doc.toString(),
        cycle.initial_population.toString(),
        cycle.current_population.toString(),
        cycle.survival_rate.toFixed(1),
        cycle.average_weight.toString(),
        cycle.biomass.toFixed(1),
        cycle.estimated_revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
        cycle.cycle_cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
        cycle.profit_margin.toFixed(1)
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `relatorio_producao_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  if (loading) {
    return (
      <Layout>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Relatórios e Análises</h1>
            <p className="text-muted-foreground">
              Análise completa de performance e produtividade
            </p>
          </div>
          <Button onClick={exportReport} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Exportar CSV
          </Button>
        </div>

        {/* KPI Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Produção Total</p>
                  <p className="text-2xl font-bold text-primary">
                    {productionReport.totalProduction.toFixed(1)} kg
                  </p>
                </div>
                <Scale className="w-8 h-8 text-primary/70" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-success/10 to-success/5 border-success/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Receita Estimada</p>
                  <p className="text-2xl font-bold text-success">
                    R$ {productionReport.totalRevenue.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                  </p>
                </div>
                <DollarSign className="w-8 h-8 text-success/70" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-warning/10 to-warning/5 border-warning/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Margem de Lucro</p>
                  <p className="text-2xl font-bold text-warning">
                    {productionReport.profitMargin.toFixed(1)}%
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-warning/70" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-accent/10 to-accent/5 border-accent/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Produtividade</p>
                  <p className="text-2xl font-bold text-accent">
                    {productionReport.productivityPerHa.toFixed(0)} kg/ha
                  </p>
                </div>
                <BarChart3 className="w-8 h-8 text-accent/70" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Performance Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <Activity className="w-6 h-6 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Sobrevivência Média</p>
                  <p className="text-2xl font-bold">{productionReport.survivalRate.toFixed(1)}%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <Scale className="w-6 h-6 text-success" />
                <div>
                  <p className="text-sm text-muted-foreground">Peso Médio</p>
                  <p className="text-2xl font-bold">{productionReport.averageWeight.toFixed(1)}g</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <PieChart className="w-6 h-6 text-accent" />
                <div>
                  <p className="text-sm text-muted-foreground">Ciclos Ativos</p>
                  <p className="text-2xl font-bold">{productionReport.activeCycles}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Analysis */}
        <Tabs defaultValue="cycles" className="w-full">
          <TabsList>
            <TabsTrigger value="cycles">Análise por Ciclo</TabsTrigger>
            <TabsTrigger value="financial">Análise Financeira</TabsTrigger>
          </TabsList>

          <TabsContent value="cycles" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LineChart className="w-5 h-5" />
                  Performance por Ciclo
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {cycleAnalyses.map((cycle) => (
                    <div key={cycle.cycle_id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="font-semibold">{cycle.batch_name} - {cycle.pond_name}</h3>
                          <p className="text-sm text-muted-foreground">
                            DOC {cycle.doc} • Iniciado em {new Date(cycle.stocking_date).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                        <Badge variant={cycle.profit_margin > 20 ? "default" : cycle.profit_margin > 0 ? "secondary" : "destructive"}>
                          {cycle.profit_margin.toFixed(1)}% margem
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Sobrevivência</p>
                          <p className="font-medium">{cycle.survival_rate.toFixed(1)}%</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Peso Médio</p>
                          <p className="font-medium">{cycle.average_weight}g</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Biomassa</p>
                          <p className="font-medium">{cycle.biomass.toFixed(1)} kg</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Receita Est.</p>
                          <p className="font-medium text-success">
                            R$ {cycle.estimated_revenue.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Custo do Ciclo</p>
                          <p className="font-medium text-destructive">
                            R$ {cycle.cycle_cost.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="financial" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Receitas vs Custos</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Receita Total Estimada</span>
                      <span className="font-bold text-success">
                        R$ {productionReport.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Custos Operacionais</span>
                      <span className="font-bold text-destructive">
                        R$ {productionReport.operationalCosts.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="border-t pt-2">
                      <div className="flex justify-between text-lg">
                        <span className="font-semibold">Lucro Estimado</span>
                        <span className={`font-bold ${productionReport.profitMargin > 0 ? 'text-success' : 'text-destructive'}`}>
                          R$ {(productionReport.totalRevenue - productionReport.operationalCosts).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Métricas de Eficiência</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span>Custo por kg produzido</span>
                      <span className="font-medium">
                        R$ {productionReport.totalProduction > 0 
                          ? (productionReport.operationalCosts / productionReport.totalProduction).toFixed(2) 
                          : '0.00'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Receita por kg</span>
                      <span className="font-medium">R$ 25.00</span>
                    </div>
                    <div className="flex justify-between">
                      <span>ROI por ciclo</span>
                      <span className="font-medium">
                        {productionReport.operationalCosts > 0 
                          ? ((productionReport.totalRevenue / productionReport.operationalCosts - 1) * 100).toFixed(1) 
                          : '0.0'}%
                      </span>
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