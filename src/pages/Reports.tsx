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
  Activity, BarChart3, PieChart, LineChart, FileText, Fish
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { FeedingHistoryPanel } from "@/components/FeedingHistoryPanel";
import { GrowthAnalysis } from "@/components/GrowthAnalysis";
import { OperationalCosts } from "@/components/OperationalCosts";
import { QuantityUtils } from "@/lib/quantityUtils";

interface ProductionReport {
  totalCycles: number;
  activeCycles: number;
  totalProduction: number;
  averageWeight: number;
  survivalRate: number;
  productivityPerHa: number;
  totalRevenue: number;
  totalCost: number;
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
  feed_conversion: number | null;
  real_fca?: number | null;
  total_feed_consumed?: number;
  estimated_revenue: number;
  cycle_cost: number;
  profit_margin: number;
}

interface PondCardData {
  pond_batch_id: string;
  pond_name: string;
  batch_name: string;
  stocking_date: string;
  doc: number;
  current_population: number;
  initial_population: number;
  survival_rate: number;
  current_weight: number;
  biomass: number;
  real_fca: number | null;
  weekly_growth: number;
  performance_score: 'excellent' | 'good' | 'average' | 'poor';
  estimated_revenue: number;
  total_cost: number;
  pond_result: number;
  profit_margin: number;
  cost_per_kg: number;
  density: number; // Units per m²
  productivity_per_ha: number; // kg/ha for this pond
  pond_area: number; // pond area in m²
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
    totalCost: 0,
    operationalCosts: 0,
    profitMargin: 0,
  });
  const [cycleAnalyses, setCycleAnalyses] = useState<CycleAnalysis[]>([]);
  const [pondCards, setPondCards] = useState<PondCardData[]>([]);
  const [farmArea, setFarmArea] = useState<number>(1);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('last_30_days');
  const [operationalCosts, setOperationalCosts] = useState<number>(0);
  const [materialsConsumed, setMaterialsConsumed] = useState<number>(0);
  const [priceTable, setPriceTable] = useState<number>(19); // Default table price for 10g shrimp
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      loadReports();
    }
  }, [user, selectedPeriod, priceTable]);

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

      const farmIds = farms.map(f => f.id);
      const currentFarmArea = farms.reduce((sum, farm) => sum + (farm.total_area || 0), 0) || 1;
      setFarmArea(currentFarmArea);

      // Get ponds first
      const { data: ponds, error: pondsError } = await supabase
        .from('ponds')
        .select('id, name, area, farm_id')
        .in('farm_id', farmIds);

      if (pondsError) throw pondsError;
      if (!ponds || ponds.length === 0) {
        setLoading(false);
        return;
      }

      const pondIds = ponds.map(p => p.id);

      // Get pond batches with active populations
      const { data: pondBatches, error: batchesError } = await supabase
        .from('pond_batches')
        .select('*')
        .in('pond_id', pondIds)
        .gte('current_population', 1);

      if (batchesError) throw batchesError;
      if (!pondBatches || pondBatches.length === 0) {
        setLoading(false);
        return;
      }

      const pondBatchIds = pondBatches.map(pb => pb.id);
      const batchIds = pondBatches.map(pb => pb.batch_id);

      // Get batches data
      const { data: batches } = await supabase
        .from('batches')
        .select('*')
        .in('id', batchIds);

      // Get biometrics data
      const { data: biometrics } = await supabase
        .from('biometrics')
        .select('*')
        .in('pond_batch_id', pondBatchIds)
        .order('created_at', { ascending: false });

      // Get mortality records
      const { data: mortality } = await supabase
        .from('mortality_records')
        .select('*')
        .in('pond_batch_id', pondBatchIds);

      // Get feeding records
      const { data: feeding } = await supabase
        .from('feeding_records')
        .select('*')
        .in('pond_batch_id', pondBatchIds);

      // Get input applications
      const { data: inputApplications } = await supabase
        .from('input_applications')
        .select('*')
        .in('pond_batch_id', pondBatchIds);

      // Get harvest records to consider partial harvests
      const { data: harvestRecords } = await supabase
        .from('harvest_records')
        .select('*')
        .in('pond_batch_id', pondBatchIds);

      const cycles = pondBatches.map(pb => {
        const pond = ponds.find(p => p.id === pb.pond_id);
        const batch = batches?.find(b => b.id === pb.batch_id);
        const pbBiometrics = biometrics?.filter(b => b.pond_batch_id === pb.id) || [];
        const pbMortality = mortality?.filter(m => m.pond_batch_id === pb.id) || [];
        const pbFeeding = feeding?.filter(f => f.pond_batch_id === pb.id) || [];

        return {
          ...pb,
          ponds: pond,
          batches: batch,
          biometrics: pbBiometrics,
          mortality_records: pbMortality,
          feeding_records: pbFeeding
        };
      });

      // Get operational costs for all farms
      const { data: operationalCosts } = await supabase
        .from('operational_costs')
        .select('amount, category')
        .in('farm_id', farmIds);

      // Get inventory costs for all farms
      const { data: inventory } = await supabase
        .from('inventory')
        .select('total_value, category')
        .in('farm_id', farmIds);

      // Calculate operational costs
      const calculatedOpCosts = operationalCosts?.reduce((sum, cost) => sum + cost.amount, 0) || 0;
      
      // Calculate consumed materials costs (Anti-Drift: converter gramas para kg)
      const calculatedFeedConsumed = feeding?.reduce((sum, feed) => {
        return sum + (QuantityUtils.gramsToKg(feed.actual_amount) * (feed.unit_cost || 0));
      }, 0) || 0;
      
      const calculatedInputsConsumed = inputApplications?.reduce((sum, input) => {
        return sum + (input.total_cost || 0);
      }, 0) || 0;
      
      const calculatedMaterialsConsumed = calculatedFeedConsumed + calculatedInputsConsumed;

      // Calculate price based on weight and table
      const calculatePriceByWeight = (weight: number, tableValue: number) => {
        // Correct formula: table + (weight - 10g)
        return tableValue + (weight - 10);
      };

      // Process cycles for analysis
      const processedCycles: CycleAnalysis[] = [];
      const processedPondCards: PondCardData[] = [];
      let totalProduction = 0;
      let totalCosts = 0;
      let activeCycles = 0;
      let totalProductivityPerHa = 0;

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
          
          // Calculate real feed consumption and cost (Anti-Drift: converter gramas para kg)
          const totalFeedConsumed = Array.isArray(cycle.feeding_records)
            ? cycle.feeding_records.reduce((sum, fr) => sum + QuantityUtils.gramsToKg(fr.actual_amount), 0)
            : 0;
            
          const realFeedCost = Array.isArray(cycle.feeding_records)
            ? cycle.feeding_records.reduce((sum, fr) => sum + (QuantityUtils.gramsToKg(fr.actual_amount) * (fr.unit_cost || 7)), 0)
            : 0;
          
          // Calculate total biomass produced (current + harvested)
          const harvestedBiomass = harvestRecords
            ?.filter(hr => hr.pond_batch_id === cycle.id)
            ?.reduce((sum, hr) => sum + hr.biomass_harvested, 0) || 0;
          
          const totalBiomassProduced = biomass + harvestedBiomass;
          
          // Calculate real FCA: Total ração / Biomassa total produzida
          let realFCA: number | null = null;
          if (totalFeedConsumed > 0 && totalBiomassProduced > 0) {
            realFCA = totalFeedConsumed / totalBiomassProduced; // Usar biomassa total produzida
          }
          
          // Calculate weekly growth
          let weeklyGrowth = 0;
          if (cycle.biometrics && cycle.biometrics.length >= 2) {
            const sortedBio = cycle.biometrics.sort((a, b) => 
              new Date(a.measurement_date).getTime() - new Date(b.measurement_date).getTime()
            );
            const recent = sortedBio[sortedBio.length - 1];
            const previous = sortedBio[sortedBio.length - 2];
            const daysDiff = Math.ceil(
              (new Date(recent.measurement_date).getTime() - new Date(previous.measurement_date).getTime()) 
              / (1000 * 60 * 60 * 24)
            );
            if (daysDiff > 0) {
              weeklyGrowth = ((recent.average_weight - previous.average_weight) / daysDiff) * 7;
            }
          }
          
          // Calculate costs considerando custos já alocados em despescas parciais
          const plCost = cycle.batches?.pl_cost || 0;
          const preparationCost = cycle.preparation_cost || 0;
          
          // Calculate allocated costs from harvests
          const allocatedCosts = harvestRecords
            ?.filter(hr => hr.pond_batch_id === cycle.id)
            ?.reduce((sum, hr) => sum + (hr.allocated_feed_cost || 0) + (hr.allocated_input_cost || 0) + (hr.allocated_pl_cost || 0) + (hr.allocated_preparation_cost || 0), 0) || 0;
          
          // Use real feed cost if available, otherwise estimate, minus already allocated
          const feedCost = Math.max(0, (realFeedCost > 0 ? realFeedCost : (totalBiomassProduced * (realFCA || 1.5) * 7)) - (harvestRecords?.filter(hr => hr.pond_batch_id === cycle.id)?.reduce((sum, hr) => sum + (hr.allocated_feed_cost || 0), 0) || 0));
          
          const cycleCost = (plCost * cycle.pl_quantity / 1000) + preparationCost + feedCost;
          totalCosts += cycleCost;

          // Calculate revenue using price table
          const pricePerKg = calculatePriceByWeight(latestBiometry.average_weight, priceTable);
          const estimatedRevenue = biomass * pricePerKg;
          const profitMargin = ((estimatedRevenue - cycleCost) / estimatedRevenue) * 100;

          // Calculate pond area in hectares and productivity per ha
          const pondArea = cycle.ponds?.area || 1;
          const pondAreaHa = pondArea / 10000; // Convert m² to ha
          const productivityPerHa = biomass / pondAreaHa;
          totalProductivityPerHa += productivityPerHa;

          // Calculate performance score
          let performanceScore: 'excellent' | 'good' | 'average' | 'poor' = 'poor';
          if (survivalRate >= 90 && realFCA && realFCA <= 1.3 && weeklyGrowth >= 1.5) {
            performanceScore = 'excellent';
          } else if (survivalRate >= 80 && realFCA && realFCA <= 1.5 && weeklyGrowth >= 1.0) {
            performanceScore = 'good';
          } else if (survivalRate >= 70 && realFCA && realFCA <= 1.8) {
            performanceScore = 'average';
          }

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
            feed_conversion: realFCA || 0,
            real_fca: realFCA,
            total_feed_consumed: totalFeedConsumed,
            estimated_revenue: estimatedRevenue,
            cycle_cost: cycleCost,
            profit_margin: profitMargin
          });

          // Calculate cost per kg
          const costPerKg = biomass > 0 ? cycleCost / biomass : 0;

          // Calculate density (units per m²)
          const density = cycle.current_population / pondArea;

          // Create pond card data
          processedPondCards.push({
            pond_batch_id: cycle.id,
            pond_name: cycle.ponds?.name || '',
            batch_name: cycle.batches?.name || '',
            stocking_date: cycle.stocking_date,
            doc,
            current_population: cycle.current_population,
            initial_population: cycle.pl_quantity,
            survival_rate: survivalRate,
            current_weight: latestBiometry.average_weight,
            biomass,
            real_fca: realFCA,
            weekly_growth: weeklyGrowth,
            performance_score: performanceScore,
            estimated_revenue: estimatedRevenue,
            total_cost: cycleCost,
            pond_result: estimatedRevenue - cycleCost,
            profit_margin: profitMargin,
            cost_per_kg: costPerKg,
            density: density,
            productivity_per_ha: productivityPerHa,
            pond_area: pondArea
          });
        }
      });

      const totalOperationalCosts = totalCosts + calculatedOpCosts + calculatedMaterialsConsumed;

      // Calculate overall metrics with average price
      const averageWeight = processedCycles.length > 0
        ? processedCycles.reduce((sum, c) => sum + c.average_weight, 0) / processedCycles.length
        : 0;

      const averagePrice = calculatePriceByWeight(averageWeight, priceTable);
      const totalRevenue = totalProduction * averagePrice;
      const overallProfitMargin = totalRevenue > 0 
        ? ((totalRevenue - totalOperationalCosts) / totalRevenue) * 100 
        : 0;

      const averageSurvival = processedCycles.length > 0
        ? processedCycles.reduce((sum, c) => sum + c.survival_rate, 0) / processedCycles.length
        : 0;

      // Calculate average productivity per hectare
      const averageProductivityPerHa = activeCycles > 0 
        ? totalProductivityPerHa / activeCycles 
        : 0;

      setProductionReport({
        totalCycles: cycles?.length || 0,
        activeCycles,
        totalProduction,
        averageWeight,
        survivalRate: averageSurvival,
        productivityPerHa: averageProductivityPerHa,
        totalRevenue,
        totalCost: totalOperationalCosts,
        operationalCosts: totalOperationalCosts,
        profitMargin: overallProfitMargin
      });

      setOperationalCosts(calculatedOpCosts);
      setMaterialsConsumed(calculatedMaterialsConsumed);

      setCycleAnalyses(processedCycles.sort((a, b) => b.doc - a.doc));
      setPondCards(processedPondCards.sort((a, b) => a.pond_name.localeCompare(b.pond_name)));
      
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
                  <p className="text-sm font-medium text-muted-foreground">Custo Total</p>
                  <p className="text-2xl font-bold text-warning">
                    R$ {productionReport.totalCost.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                  </p>
                </div>
                <DollarSign className="w-8 h-8 text-warning/70" />
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
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm font-medium text-foreground/80 data-[state=active]:font-semibold transition-all">Visão Geral</TabsTrigger>
            <TabsTrigger value="costs" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm font-medium text-foreground/80 data-[state=active]:font-semibold transition-all">Custos Operacionais</TabsTrigger>
            <TabsTrigger value="financial" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm font-medium text-foreground/80 data-[state=active]:font-semibold transition-all">Análise Financeira</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Fish className="w-5 h-5" />
                  Viveiros Ativos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {pondCards.map((pond) => (
                    <Card 
                      key={pond.pond_batch_id}
                      className="hover:shadow-lg transition-shadow cursor-pointer border-l-4 border-l-primary"
                      onClick={() => navigate(`/pond-history/${pond.pond_batch_id}`)}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-lg">{pond.pond_name}</CardTitle>
                            <p className="text-sm text-muted-foreground">{pond.batch_name}</p>
                          </div>
                          <Badge 
                            variant={
                              pond.performance_score === 'excellent' ? 'default' :
                              pond.performance_score === 'good' ? 'secondary' :
                              pond.performance_score === 'average' ? 'outline' : 'destructive'
                            }
                          >
                            DOC {pond.doc}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                         <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Biomassa</p>
                            <p className="font-medium">{pond.biomass.toFixed(1)} kg</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Peso Atual</p>
                            <p className="font-medium text-primary">{pond.current_weight.toFixed(1)}g</p>
                          </div>
                           <div>
                             <p className="text-muted-foreground">Crescimento Semanal</p>
                             <p className={`font-medium ${pond.weekly_growth >= 1.5 ? 'text-success' : pond.weekly_growth >= 1.0 ? 'text-warning' : 'text-destructive'}`}>
                               {pond.weekly_growth.toFixed(1)}g/sem
                             </p>
                           </div>
                           <div>
                             <p className="text-muted-foreground">FCA Real</p>
                             <p className={`font-medium ${
                               !pond.real_fca ? 'text-muted-foreground' :
                               pond.real_fca <= 1.3 ? 'text-success' : 
                               pond.real_fca <= 1.6 ? 'text-warning' : 'text-destructive'
                             }`}>
                               {pond.real_fca ? pond.real_fca.toFixed(2) : '-'}
                             </p>
                           </div>
                          <div>
                            <p className="text-muted-foreground">Densidade</p>
                            <p className="font-medium">{pond.density.toFixed(1)} Un/m²</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Custo/kg</p>
                            <p className={`font-medium ${
                              pond.cost_per_kg <= 15 ? 'text-success' : 
                              pond.cost_per_kg <= 20 ? 'text-warning' : 'text-destructive'
                            }`}>
                              R$ {pond.cost_per_kg.toFixed(2)}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">População</p>
                            <p className="font-medium">{pond.current_population.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Sobrevivência</p>
                            <p className={`font-medium ${pond.survival_rate >= 85 ? 'text-success' : pond.survival_rate >= 75 ? 'text-warning' : 'text-destructive'}`}>
                              {pond.survival_rate.toFixed(1)}%
                            </p>
                          </div>
                        </div>
                         
                          <div className="pt-3 border-t border-border space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Receita Estimada:</span>
                              <span className="font-medium text-success">
                                R$ {pond.estimated_revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Custo Total:</span>
                              <span className="font-medium text-destructive">
                                R$ {pond.total_cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Resultado:</span>
                              <span className={`font-medium ${pond.pond_result > 0 ? 'text-success' : 'text-destructive'}`}>
                                R$ {pond.pond_result.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Produtividade:</span>
                              <span className="font-medium text-accent">
                                {pond.productivity_per_ha.toFixed(0)} kg/ha
                              </span>
                            </div>
                          </div>

                        <div className="pt-2">
                          <Badge 
                            variant="outline" 
                            className={`w-full justify-center ${
                              pond.performance_score === 'excellent' ? 'border-success text-success' :
                              pond.performance_score === 'good' ? 'border-primary text-primary' :
                              pond.performance_score === 'average' ? 'border-warning text-warning' : 
                              'border-destructive text-destructive'
                            }`}
                          >
                            Performance: {
                              pond.performance_score === 'excellent' ? 'Excelente' :
                              pond.performance_score === 'good' ? 'Boa' :
                              pond.performance_score === 'average' ? 'Média' : 'Baixa'
                            }
                          </Badge>
                        </div>

                        <div className="text-xs text-muted-foreground text-center pt-2">
                          Clique para ver histórico completo →
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                
                {pondCards.length === 0 && (
                  <div className="text-center py-8">
                    <Fish className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Nenhum viveiro ativo encontrado</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="costs" className="space-y-4">
            <OperationalCosts />
          </TabsContent>

          <TabsContent value="financial" className="space-y-4">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5" />
                    Configuração de Preços
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <label className="text-sm font-medium">Tabela de Preços (10g):</label>
                      <select 
                        value={priceTable} 
                        onChange={(e) => setPriceTable(Number(e.target.value))}
                        className="px-3 py-1 border border-border rounded bg-background text-foreground"
                      >
                        {Array.from({ length: 31 }, (_, i) => 10 + i * 0.5).map(value => (
                          <option key={value} value={value}>R$ {value.toFixed(1)}</option>
                        ))}
                      </select>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Define o preço base para camarão de 10g. O preço varia proporcionalmente ao peso.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className="w-5 h-5" />
                      Receitas vs Custos
                    </CardTitle>
                  </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-3 bg-success/10 rounded">
                      <span className="text-muted-foreground">Receita Total Estimada:</span>
                      <span className="font-bold text-success text-lg">
                        R$ {productionReport.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-destructive/10 rounded">
                      <span className="text-muted-foreground">Custos Operacionais:</span>
                      <span className="font-bold text-destructive text-lg">
                        R$ {operationalCosts.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-warning/10 rounded">
                      <span className="text-muted-foreground">Materiais Consumidos:</span>
                      <span className="font-bold text-warning text-lg">
                        R$ {materialsConsumed.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-primary/10 rounded">
                      <span className="text-muted-foreground">Lucro Líquido:</span>
                      <span className={`font-bold text-lg ${(productionReport.totalRevenue - operationalCosts - materialsConsumed) > 0 ? 'text-success' : 'text-destructive'}`}>
                        R$ {(productionReport.totalRevenue - operationalCosts - materialsConsumed).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    Métricas de Eficiência
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">ROI Estimado:</span>
                      <span className={`font-medium ${productionReport.profitMargin > 0 ? 'text-success' : 'text-destructive'}`}>
                        {productionReport.profitMargin.toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Custo por kg produzido:</span>
                      <span className="font-medium">
                        R$ {pondCards.length > 0 ? (pondCards.reduce((sum, card) => sum + card.cost_per_kg, 0) / pondCards.length).toFixed(2) : '0.00'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                       <span className="text-muted-foreground">Receita por hectare:</span>
                       <span className="font-medium text-success">
                         R$ {pondCards.length > 0 ? (pondCards.reduce((sum, card) => sum + card.productivity_per_ha, 0) / pondCards.length * (pondCards.reduce((sum, card) => sum + (card.estimated_revenue / card.biomass), 0) / pondCards.length)).toLocaleString('pt-BR', { minimumFractionDigits: 0 }) : '0'}
                       </span>
                     </div>
                   </div>
                 </CardContent>
                </Card>
              </div>
            </div>
            </TabsContent>
          </Tabs>
        </div>
      </Layout>
    );
 }