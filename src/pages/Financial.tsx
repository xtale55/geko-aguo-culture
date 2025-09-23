import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { StatsCard } from "@/components/StatsCard";
import { OperationalCosts } from "@/components/OperationalCosts";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { DollarSign, TrendingUp, TrendingDown, PieChart, BarChart3, Calculator, Target, AlertTriangle, Download, Calendar, ArrowUpRight, ArrowDownRight, Scale } from "lucide-react";
import { Shrimp } from '@phosphor-icons/react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RechartsPieChart, Cell, BarChart, Bar, Pie } from "recharts";
import { LoadingScreen } from "@/components/LoadingScreen";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { QuantityUtils } from "@/lib/quantityUtils";
interface FinancialData {
  totalRevenue: number;
  totalCosts: number;
  netProfit: number;
  profitMargin: number;
  feedCosts: number;
  inputCosts: number;
  plCosts: number;
  operationalCosts: number;
  preparationCosts: number;
}
interface RevenueData {
  date: string;
  revenue: number;
  costs: number;
  profit: number;
}
interface CostsByCategory {
  category: string;
  amount: number;
  percentage: number;
  color: string;
}
interface CycleFinancial {
  pond_name: string;
  batch_name: string;
  revenue: number;
  costs: number;
  profit: number;
  roi: number;
  doc: number;
  status: 'active' | 'completed';
}
interface PondCosts {
  pond_name: string;
  batch_name: string;
  pond_id: string;
  pond_batch_id: string;
  area: number;
  doc: number;
  feedCosts: number;
  inputCosts: number;
  plCosts: number;
  preparationCosts: number;
  operationalCosts: number;
  totalCosts: number;
  costPerHectare: number;
}
export default function Financial() {
  const [financialData, setFinancialData] = useState<FinancialData>({
    totalRevenue: 0,
    totalCosts: 0,
    netProfit: 0,
    profitMargin: 0,
    feedCosts: 0,
    inputCosts: 0,
    plCosts: 0,
    operationalCosts: 0,
    preparationCosts: 0
  });
  const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
  const [costsByCategory, setCostsByCategory] = useState<CostsByCategory[]>([]);
  const [cycleFinancials, setCycleFinancials] = useState<CycleFinancial[]>([]);
  const [pondCosts, setPondCosts] = useState<PondCosts[]>([]);
  const [pondBatchesData, setPondBatchesData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('last_30_days');
  const [priceTable, setPriceTable] = useState(19);
  const {
    user
  } = useAuth();
  const {
    toast
  } = useToast();
  const navigate = useNavigate();
  useEffect(() => {
    if (user) {
      loadFinancialData();
    }
  }, [user, selectedPeriod, priceTable]);
  const loadFinancialData = async () => {
    try {
      setLoading(true);

      // Get farms
      const {
        data: farms
      } = await supabase.from('farms').select('id').eq('user_id', user?.id);
      if (!farms || farms.length === 0) {
        setLoading(false);
        return;
      }
      const farmIds = farms.map(f => f.id);

      // Get ponds and pond batches
      const {
        data: ponds
      } = await supabase.from('ponds').select('id, name, area, farm_id').in('farm_id', farmIds);
      if (!ponds) return;
      const pondIds = ponds.map(p => p.id);
      const {
        data: pondBatches
      } = await supabase.from('pond_batches').select('*').in('pond_id', pondIds);
      if (!pondBatches) return;
      const pondBatchIds = pondBatches.map(pb => pb.id);
      const batchIds = pondBatches.map(pb => pb.batch_id);

      // Get all related data
      const [{
        data: batches
      }, {
        data: harvestRecords
      }, {
        data: feedingRecords
      }, {
        data: inputApplications
      }, {
        data: operationalCosts
      }, {
        data: biometrics
      }] = await Promise.all([supabase.from('batches').select('*').in('id', batchIds), supabase.from('harvest_records').select('*').in('pond_batch_id', pondBatchIds), supabase.from('feeding_records').select('*').in('pond_batch_id', pondBatchIds), supabase.from('input_applications').select('*').in('pond_batch_id', pondBatchIds), supabase.from('operational_costs').select('*').in('farm_id', farmIds), supabase.from('biometrics').select('*').in('pond_batch_id', pondBatchIds).order('created_at', {
        ascending: false
      })]);

      // Calculate revenues from harvests
      const totalRevenue = harvestRecords?.reduce((sum, hr) => sum + (hr.total_value || 0), 0) || 0;

      // Calculate costs by category
      const feedCosts = feedingRecords?.reduce((sum, fr) => {
        return sum + QuantityUtils.gramsToKg(fr.actual_amount) * (fr.unit_cost || 0);
      }, 0) || 0;
      const inputCosts = inputApplications?.reduce((sum, ia) => sum + (ia.total_cost || 0), 0) || 0;
      const plCosts = pondBatches?.reduce((sum, pb) => {
        const batch = batches?.find(b => b.id === pb.batch_id);
        return sum + pb.pl_quantity / 1000 * (batch?.pl_cost || 0);
      }, 0) || 0;
      const operationalCostTotal = operationalCosts?.reduce((sum, oc) => sum + oc.amount, 0) || 0;
      const preparationCosts = pondBatches?.reduce((sum, pb) => sum + (pb.preparation_cost || 0), 0) || 0;
      const totalCosts = feedCosts + inputCosts + plCosts + operationalCostTotal + preparationCosts;
      const netProfit = totalRevenue - totalCosts;
      const profitMargin = totalRevenue > 0 ? netProfit / totalRevenue * 100 : 0;

      // Calculate costs by category for pie chart
      const costs: CostsByCategory[] = [{
        category: 'Ração',
        amount: feedCosts,
        percentage: feedCosts / totalCosts * 100,
        color: '#8884d8'
      }, {
        category: 'Insumos',
        amount: inputCosts,
        percentage: inputCosts / totalCosts * 100,
        color: '#82ca9d'
      }, {
        category: 'Pós-larvas',
        amount: plCosts,
        percentage: plCosts / totalCosts * 100,
        color: '#ffc658'
      }, {
        category: 'Operacionais',
        amount: operationalCostTotal,
        percentage: operationalCostTotal / totalCosts * 100,
        color: '#ff7300'
      }, {
        category: 'Preparação',
        amount: preparationCosts,
        percentage: preparationCosts / totalCosts * 100,
        color: '#0088fe'
      }].filter(cost => cost.amount > 0);

      // Calculate costs by pond
      const pondCostsData: PondCosts[] = pondBatches?.map(pb => {
        const pond = ponds.find(p => p.id === pb.pond_id);
        const batch = batches?.find(b => b.id === pb.batch_id);
        const pbFeeding = feedingRecords?.filter(fr => fr.pond_batch_id === pb.id) || [];
        const pbInputs = inputApplications?.filter(ia => ia.pond_batch_id === pb.id) || [];
        const cycleFeedCost = pbFeeding.reduce((sum, fr) => {
          return sum + QuantityUtils.gramsToKg(fr.actual_amount) * (fr.unit_cost || 0);
        }, 0);
        const cycleInputCost = pbInputs.reduce((sum, ia) => sum + (ia.total_cost || 0), 0);
        const cyclePLCost = pb.pl_quantity / 1000 * (batch?.pl_cost || 0);
        const cyclePreparationCost = pb.preparation_cost || 0;

        // Allocate operational costs proportionally by area
        const totalActiveArea = pondBatches.filter(pbatch => pbatch.cycle_status === 'active').reduce((sum, pbatch) => {
          const p = ponds.find(p => p.id === pbatch.pond_id);
          return sum + (p?.area || 0);
        }, 0);
        const pondOperationalCosts = totalActiveArea > 0 ? operationalCostTotal * ((pond?.area || 0) / totalActiveArea) : 0;
        const cycleTotalCost = cycleFeedCost + cycleInputCost + cyclePLCost + cyclePreparationCost + pondOperationalCosts;
        const stocking = new Date(pb.stocking_date);
        const today = new Date();
        const doc = Math.ceil((today.getTime() - stocking.getTime()) / (1000 * 60 * 60 * 24));
        const area = pond?.area || 0;
        const costPerHectare = area > 0 ? cycleTotalCost / (area / 10000) : 0; // convert m² to hectares

        return {
          pond_name: pond?.name || '',
          batch_name: batch?.name || '',
          pond_id: pb.pond_id,
          pond_batch_id: pb.id,
          area,
          doc,
          feedCosts: cycleFeedCost,
          inputCosts: cycleInputCost,
          plCosts: cyclePLCost,
          preparationCosts: cyclePreparationCost,
          operationalCosts: pondOperationalCosts,
          totalCosts: cycleTotalCost,
          costPerHectare
        };
      }) || [];

      // Calculate cycle financials
      const cycleFinancials: CycleFinancial[] = pondBatches?.map(pb => {
        const pond = ponds.find(p => p.id === pb.pond_id);
        const batch = batches?.find(b => b.id === pb.batch_id);
        const pbHarvests = harvestRecords?.filter(hr => hr.pond_batch_id === pb.id) || [];
        const pbFeeding = feedingRecords?.filter(fr => fr.pond_batch_id === pb.id) || [];
        const pbInputs = inputApplications?.filter(ia => ia.pond_batch_id === pb.id) || [];
        const pbBiometrics = biometrics?.filter(b => b.pond_batch_id === pb.id) || [];
        const cycleRevenue = pbHarvests.reduce((sum, hr) => sum + (hr.total_value || 0), 0);

        // If no harvests yet, estimate revenue from current biomass
        let estimatedRevenue = cycleRevenue;
        if (cycleRevenue === 0 && pb.current_population > 0) {
          const latestBio = pbBiometrics[0];
          if (latestBio) {
            const biomass = pb.current_population * latestBio.average_weight / 1000;
            const pricePerKg = priceTable + (latestBio.average_weight - 10);
            estimatedRevenue = biomass * pricePerKg;
          }
        }
        const pondCostData = pondCostsData.find(pc => pc.pond_batch_id === pb.id);
        const cycleTotalCost = pondCostData?.totalCosts || 0;
        const cycleProfit = estimatedRevenue - cycleTotalCost;
        const cycleROI = cycleTotalCost > 0 ? cycleProfit / cycleTotalCost * 100 : 0;
        const stocking = new Date(pb.stocking_date);
        const today = new Date();
        const doc = Math.ceil((today.getTime() - stocking.getTime()) / (1000 * 60 * 60 * 24));
        return {
          pond_name: pond?.name || '',
          batch_name: batch?.name || '',
          revenue: estimatedRevenue,
          costs: cycleTotalCost,
          profit: cycleProfit,
          roi: cycleROI,
          doc,
          status: pb.cycle_status === 'completed' ? 'completed' : 'active'
        };
      }) || [];

      // Generate revenue trend data (mock for now - in real app, aggregate by month)
      const mockRevenueData: RevenueData[] = Array.from({
        length: 6
      }, (_, i) => {
        const date = new Date();
        date.setMonth(date.getMonth() - (5 - i));
        return {
          date: date.toLocaleDateString('pt-BR', {
            month: 'short'
          }),
          revenue: totalRevenue * (0.7 + Math.random() * 0.6) / 6,
          costs: totalCosts * (0.7 + Math.random() * 0.6) / 6,
          profit: 0
        };
      });
      mockRevenueData.forEach(item => {
        item.profit = item.revenue - item.costs;
      });
      setFinancialData({
        totalRevenue,
        totalCosts,
        netProfit,
        profitMargin,
        feedCosts,
        inputCosts,
        plCosts,
        operationalCosts: operationalCostTotal,
        preparationCosts
      });
      setRevenueData(mockRevenueData);
      setCostsByCategory(costs);
      setCycleFinancials(cycleFinancials);
      setPondCosts(pondCostsData);
      setPondBatchesData(pondBatches);
    } catch (error) {
      console.error('Error loading financial data:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar dados financeiros",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };
  if (loading) {
    return <LoadingScreen />;
  }
  return <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-900 via-blue-800 to-slate-700 bg-clip-text text-transparent tracking-tight">Financeiro</h1>
            <p className="text-muted-foreground">
              Análise completa da situação financeira da fazenda
            </p>
          </div>
          <div className="flex gap-2">
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="last_30_days">Últimos 30 dias</SelectItem>
                <SelectItem value="last_60_days">Últimos 60 dias</SelectItem>
                <SelectItem value="last_90_days">Últimos 90 dias</SelectItem>
                <SelectItem value="current_year">Ano atual</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Exportar
            </Button>
          </div>
        </div>

        {/* Operational Costs Highlight Card */}
        <Card className="border-l-4 border-l-purple-500 bg-gradient-to-r from-purple-50/50 to-white cursor-pointer hover:shadow-lg hover:shadow-purple-500/10 transition-all duration-300 group" onClick={() => navigate('/operational-costs')}>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg">
                <Calculator className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-purple-800 group-hover:text-purple-900 transition-colors">Custos Operacionais</h3>
                <p className="text-sm text-purple-600 font-normal">Clique aqui para adicionar e gerenciar custos operacionais</p>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="text-center p-4 bg-white rounded-lg border border-purple-100 group-hover:border-purple-200 transition-colors">
                <p className="text-sm text-muted-foreground mb-1">Total Operacional</p>
                <p className="text-2xl font-bold text-purple-700">{formatCurrency(financialData.operationalCosts)}</p>
              </div>
              <div className="text-center p-4 bg-white rounded-lg border border-purple-100 group-hover:border-purple-200 transition-colors">
                <p className="text-sm text-muted-foreground mb-1">% dos Custos Totais</p>
                <p className="text-2xl font-bold text-purple-700">
                  {financialData.totalCosts > 0 ? (financialData.operationalCosts / financialData.totalCosts * 100).toFixed(1) : '0.0'}%
                </p>
              </div>
              <Button onClick={() => {
              navigate('/operational-costs');
              setTimeout(() => (window as any).openOperationalCostDialog?.(), 100);
            }} className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white shadow-md hover:shadow-lg transition-all duration-300 py-[30px] my-[15px]">
                <DollarSign className="w-4 h-4 mr-2" />
                + Adicionar Custo
              </Button>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="operational">Custos Operacionais</TabsTrigger>
            <TabsTrigger value="costs">Custos Detalhados</TabsTrigger>
            <TabsTrigger value="profitability">Rentabilidade</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Financial Summary Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <StatsCard title="Receita Total" value={formatCurrency(financialData.totalRevenue)} icon={<DollarSign />} variant="primary" subtitle="Vendas realizadas" />
              <StatsCard title="Custos Totais" value={formatCurrency(financialData.totalCosts)} icon={<TrendingDown />} variant="secondary" subtitle="Todos os custos" />
              <StatsCard title="Lucro Líquido" value={formatCurrency(financialData.netProfit)} icon={financialData.netProfit >= 0 ? <TrendingUp /> : <TrendingDown />} variant={financialData.netProfit >= 0 ? "success" : "secondary"} subtitle="Receita - Custos" />
              <StatsCard title="Margem de Lucro" value={`${financialData.profitMargin.toFixed(1)}%`} icon={<Target />} variant={financialData.profitMargin >= 20 ? "success" : financialData.profitMargin >= 10 ? "primary" : "secondary"} subtitle="% de rentabilidade" />
            </div>

            {/* Charts Row */}
            <div className="grid gap-6 md:grid-cols-2">
              {/* Revenue vs Costs Trend */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    Evolução Financeira
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={revenueData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis tickFormatter={value => `R$ ${(value / 1000).toFixed(0)}k`} />
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      <Line type="monotone" dataKey="revenue" stroke="#8884d8" name="Receita" />
                      <Line type="monotone" dataKey="costs" stroke="#82ca9d" name="Custos" />
                      <Line type="monotone" dataKey="profit" stroke="#ffc658" name="Lucro" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Costs Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="w-5 h-5" />
                    Distribuição de Custos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsPieChart>
                      <Pie data={costsByCategory} cx="50%" cy="50%" outerRadius={80} fill="#8884d8" dataKey="amount" label={({
                      category,
                      percentage
                    }) => `${category}: ${percentage.toFixed(1)}%`}>
                        {costsByCategory.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                      </Pie>
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Costs Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Resumo de Custos por Categoria</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{formatCurrency(financialData.feedCosts)}</div>
                    <div className="text-sm text-muted-foreground">Ração</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{formatCurrency(financialData.inputCosts)}</div>
                    <div className="text-sm text-muted-foreground">Insumos</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-600">{formatCurrency(financialData.plCosts)}</div>
                    <div className="text-sm text-muted-foreground">Pós-larvas</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">{formatCurrency(financialData.operationalCosts)}</div>
                    <div className="text-sm text-muted-foreground">Operacionais</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">{formatCurrency(financialData.preparationCosts)}</div>
                    <div className="text-sm text-muted-foreground">Preparação</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="costs" className="space-y-6">
            {/* Pond Costs Overview - Active Cycles Only */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {pondCosts.filter(pondCost => {
                const cycle = cycleFinancials.find(c => c.pond_name === pondCost.pond_name && c.batch_name === pondCost.batch_name);
                return cycle?.status === 'active';
              }).map(pondCost => {
              const pieData = [{
                name: 'Ração',
                value: pondCost.feedCosts,
                color: '#8884d8'
              }, {
                name: 'Insumos',
                value: pondCost.inputCosts,
                color: '#82ca9d'
              }, {
                name: 'PL',
                value: pondCost.plCosts,
                color: '#ffc658'
              }, {
                name: 'Preparação',
                value: pondCost.preparationCosts,
                color: '#ff7300'
              }, {
                name: 'Operacionais',
                value: pondCost.operationalCosts,
                color: '#0088fe'
              }].filter(item => item.value > 0);
              return <Card key={pondCost.pond_batch_id}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center justify-between">
                        <span>{pondCost.pond_name}</span>
                        <Badge variant="outline">{pondCost.doc} DOC</Badge>
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {pondCost.batch_name} • {pondCost.area.toLocaleString('pt-BR')} m²
                      </p>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4">
                        {/* Cost breakdown */}
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-sm">Ração</span>
                            <span className="font-medium">{formatCurrency(pondCost.feedCosts)}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm">Insumos</span>
                            <span className="font-medium">{formatCurrency(pondCost.inputCosts)}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm">Pós-larvas</span>
                            <span className="font-medium">{formatCurrency(pondCost.plCosts)}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm">Preparação</span>
                            <span className="font-medium">{formatCurrency(pondCost.preparationCosts)}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm">Operacionais</span>
                            <span className="font-medium">{formatCurrency(pondCost.operationalCosts)}</span>
                          </div>
                          <div className="border-t pt-2 flex justify-between items-center font-bold">
                            <span>Total</span>
                            <span>{formatCurrency(pondCost.totalCosts)}</span>
                          </div>
                          <div className="text-xs text-muted-foreground text-center">
                            {formatCurrency(pondCost.costPerHectare)}/ha
                          </div>
                        </div>
                        
                        {/* Pie chart and legend */}
                        <div className="space-y-2">
                          <div className="flex justify-center">
                            <ResponsiveContainer width="100%" height={120}>
                              <RechartsPieChart>
                                <Pie data={pieData} cx="50%" cy="50%" innerRadius={15} outerRadius={50} fill="#8884d8" dataKey="value">
                                  {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                                </Pie>
                                <Tooltip formatter={(value: number) => [formatCurrency(value), `${(value / pondCost.totalCosts * 100).toFixed(1)}%`]} />
                              </RechartsPieChart>
                            </ResponsiveContainer>
                          </div>
                          
                          {/* Legend */}
                          <div className="space-y-1">
                            {pieData.map((item, index) => <div key={index} className="flex items-center justify-between text-xs">
                                <div className="flex items-center gap-1">
                                  <div className="w-2 h-2 rounded-full" style={{
                              backgroundColor: item.color
                            }} />
                                  <span>{item.name}</span>
                                </div>
                                <span className="font-medium">
                                  {(item.value / pondCost.totalCosts * 100).toFixed(1)}%
                                </span>
                              </div>)}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>;
            })}
            </div>

            {/* Comparative Table - Historical Data with Status */}
            <Card>
              <CardHeader>
                <CardTitle>Histórico Completo de Cultivos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Viveiro</th>
                        <th className="text-left p-2">Lote</th>
                        <th className="text-left p-2">Data Início</th>
                        <th className="text-center p-2">Status</th>
                        <th className="text-right p-2">DOC</th>
                        <th className="text-right p-2">Área (m²)</th>
                        <th className="text-right p-2">Ração</th>
                        <th className="text-right p-2">Insumos</th>
                        <th className="text-right p-2">PL</th>
                        <th className="text-right p-2">Preparação</th>
                        <th className="text-right p-2">Operacionais</th>
                        <th className="text-right p-2">Total</th>
                        <th className="text-right p-2">R$/ha</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pondCosts.map(pondCost => {
                        const cycle = cycleFinancials.find(c => c.pond_name === pondCost.pond_name && c.batch_name === pondCost.batch_name);
                        const pondBatchData = pondBatchesData?.find(pb => pb.id === pondCost.pond_batch_id);
                        const startDate = pondBatchData ? new Date(pondBatchData.stocking_date).toLocaleDateString('pt-BR') : '-';
                        
                        return (
                          <tr key={pondCost.pond_batch_id} className="border-b">
                            <td className="p-2 font-medium">{pondCost.pond_name}</td>
                            <td className="p-2">{pondCost.batch_name}</td>
                            <td className="p-2">{startDate}</td>
                            <td className="p-2 text-center">
                              <Badge variant={cycle?.status === 'completed' ? 'default' : 'secondary'}>
                                {cycle?.status === 'completed' ? 'Finalizado' : 'Ativo'}
                              </Badge>
                            </td>
                            <td className="p-2 text-right">{pondCost.doc}</td>
                            <td className="p-2 text-right">{pondCost.area.toLocaleString('pt-BR')}</td>
                            <td className="p-2 text-right">{formatCurrency(pondCost.feedCosts)}</td>
                            <td className="p-2 text-right">{formatCurrency(pondCost.inputCosts)}</td>
                            <td className="p-2 text-right">{formatCurrency(pondCost.plCosts)}</td>
                            <td className="p-2 text-right">{formatCurrency(pondCost.preparationCosts)}</td>
                            <td className="p-2 text-right">{formatCurrency(pondCost.operationalCosts)}</td>
                            <td className="p-2 text-right font-bold">{formatCurrency(pondCost.totalCosts)}</td>
                            <td className="p-2 text-right">{formatCurrency(pondCost.costPerHectare)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Comparative Chart - Active Cycles Only */}
            <Card>
              <CardHeader>
                <CardTitle>Comparativo de Custos Totais - Cultivos Ativos</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={pondCosts.filter(pondCost => {
                    const cycle = cycleFinancials.find(c => c.pond_name === pondCost.pond_name && c.batch_name === pondCost.batch_name);
                    return cycle?.status === 'active';
                  })}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="pond_name" />
                    <YAxis tickFormatter={value => `R$ ${(value / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Bar dataKey="totalCosts" fill="#8884d8" name="Custo Total" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="operational" className="space-y-6">
            <OperationalCosts />
          </TabsContent>

          <TabsContent value="profitability" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Análise de Rentabilidade por Ciclo</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Viveiro</th>
                        <th className="text-left p-2">Lote</th>
                        <th className="text-right p-2">DOC</th>
                        <th className="text-right p-2">Receita</th>
                        <th className="text-right p-2">Custos</th>
                        <th className="text-right p-2">Lucro</th>
                        <th className="text-right p-2">ROI</th>
                        <th className="text-center p-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cycleFinancials.map((cycle, index) => <tr key={index} className="border-b">
                          <td className="p-2 font-medium">{cycle.pond_name}</td>
                          <td className="p-2">{cycle.batch_name}</td>
                          <td className="p-2 text-right">{cycle.doc}</td>
                          <td className="p-2 text-right">{formatCurrency(cycle.revenue)}</td>
                          <td className="p-2 text-right">{formatCurrency(cycle.costs)}</td>
                          <td className={`p-2 text-right font-medium ${cycle.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatCurrency(cycle.profit)}
                          </td>
                          <td className={`p-2 text-right font-medium ${cycle.roi >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {cycle.roi.toFixed(1)}%
                          </td>
                          <td className="p-2 text-center">
                            <Badge variant={cycle.status === 'completed' ? 'default' : 'secondary'}>
                              {cycle.status === 'completed' ? 'Finalizado' : 'Ativo'}
                            </Badge>
                          </td>
                        </tr>)}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* ROI Analysis */}
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Análise de ROI</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span>ROI Médio dos Ciclos Ativos:</span>
                      <span className="font-bold text-lg">
                        {cycleFinancials.filter(c => c.status === 'active').length > 0 ? (cycleFinancials.filter(c => c.status === 'active').reduce((sum, c) => sum + c.roi, 0) / cycleFinancials.filter(c => c.status === 'active').length).toFixed(1) : '0.0'}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>ROI Médio dos Ciclos Finalizados:</span>
                      <span className="font-bold text-lg">
                        {cycleFinancials.filter(c => c.status === 'completed').length > 0 ? (cycleFinancials.filter(c => c.status === 'completed').reduce((sum, c) => sum + c.roi, 0) / cycleFinancials.filter(c => c.status === 'completed').length).toFixed(1) : '0.0'}%
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Indicadores de Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span>Custo Médio por Kg:</span>
                      <span className="font-bold text-lg">
                        {financialData.totalRevenue > 0 ? formatCurrency(financialData.totalCosts / (financialData.totalRevenue / priceTable)) : 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Break-even por Kg:</span>
                      <span className="font-bold text-lg">{formatCurrency(priceTable * 0.8)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>;
}