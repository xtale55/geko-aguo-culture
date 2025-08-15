import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useParams } from "react-router-dom";
import { 
  ArrowLeft, Calendar, DollarSign, Scale, TrendingUp, 
  Package, Droplets, Skull, Fish, Edit2 
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { QuantityUtils } from "@/lib/quantityUtils";

interface CostBreakdown {
  pl_cost: number;
  preparation_cost: number;
  feed_cost: number;
  operational_cost: number;
  total_cost: number;
}

interface PondCycleHistory {
  cycle_id: string;
  batch_name: string;
  stocking_date: string;
  harvest_date?: string;
  doc: number;
  initial_population: number;
  current_population: number;
  survival_rate: number;
  average_weight: number;
  biomass: number;
  costs: CostBreakdown;
  estimated_revenue: number;
  profit_margin: number;
  status: 'active' | 'harvested';
  pond_area: number;
  density: number;
  cost_per_kg: number;
  real_fca: number;
  weekly_growth: number;
  productivity_per_ha: number;
  pond_result: number;
}

interface BiometryRecord {
  measurement_date: string;
  average_weight: number;
  uniformity: number;
  sample_size: number;
}

interface MortalityRecord {
  record_date: string;
  dead_count: number;
  notes: string;
}

interface FeedingRecord {
  feeding_date: string;
  feeding_time: string;
  actual_amount: number;
  unit_cost: number;
  feed_type_name: string;
}

interface WaterQualityRecord {
  measurement_date: string;
  oxygen_level: number;
  temperature: number;
  ph_level: number;
}

export default function PondHistory() {
  const [pondName, setPondName] = useState("");
  const [cycles, setCycles] = useState<PondCycleHistory[]>([]);
  const [biometryRecords, setBiometryRecords] = useState<BiometryRecord[]>([]);
  const [mortalityRecords, setMortalityRecords] = useState<MortalityRecord[]>([]);
  const [feedingRecords, setFeedingRecords] = useState<FeedingRecord[]>([]);
  const [waterQualityRecords, setWaterQualityRecords] = useState<WaterQualityRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [priceTable, setPriceTable] = useState<number>(19);
  const [editingCost, setEditingCost] = useState<{ cycleId: string, costType: string } | null>(null);
  const [newCostValue, setNewCostValue] = useState<string>("");
  const [editingCycleData, setEditingCycleData] = useState<any>(null);
  const { pondId: cycleId } = useParams(); // Actually receiving cycle_id
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const calculatePriceByWeight = (weight: number, tableValue: number): number => {
    return tableValue + (weight - 10); // Correct formula: table + (weight - 10g)
  };

  useEffect(() => {
    if (user && cycleId) {
      loadPondHistory();
    }
  }, [user, cycleId]);

  const loadPondHistory = async () => {
    try {
      setLoading(true);

      // Get cycle and pond info from the cycle_id
      const { data: cycleData } = await supabase
        .from('pond_batches')
        .select(`
          pond_id,
          ponds(name, area)
        `)
        .eq('id', cycleId)
        .single();

      if (cycleData && cycleData.ponds) {
        setPondName(cycleData.ponds.name);
        const actualPondId = cycleData.pond_id;

        // Get all cycles for this pond
        const { data: cyclesData } = await supabase
          .from('pond_batches')
          .select(`
            *,
            batches(id, name, pl_cost),
            biometrics(average_weight, measurement_date, uniformity, sample_size),
            mortality_records(record_date, dead_count, notes),
            ponds(area)
          `)
          .eq('pond_id', actualPondId)
          .order('stocking_date', { ascending: false });

         // Get feeding records for this pond separately
        const { data: feedingData } = await supabase
          .from('feeding_records')
          .select('actual_amount, unit_cost, feeding_date, feeding_time, feed_type_name, pond_batch_id')
          .in('pond_batch_id', 
            await supabase
              .from('pond_batches')
              .select('id')
              .eq('pond_id', actualPondId)
              .then(({ data }) => data?.map(pb => pb.id) || [])
          )
          .order('feeding_date', { ascending: false });

        // Get operational costs for each cycle
        const { data: operationalCostsData } = await supabase
          .from('operational_costs')
          .select('amount, pond_batch_id')
          .in('pond_batch_id', 
            await supabase
              .from('pond_batches')
              .select('id')
              .eq('pond_id', actualPondId)
              .then(({ data }) => data?.map(pb => pb.id) || [])
          );

        // Process cycles
      const processedCycles: PondCycleHistory[] = [];
      const allBiometry: BiometryRecord[] = [];
      const allMortality: MortalityRecord[] = [];
      const allFeeding: FeedingRecord[] = [];

      cyclesData?.forEach(cycle => {
        const stocking = new Date(cycle.stocking_date);
        const today = new Date();
        const doc = Math.ceil((today.getTime() - stocking.getTime()) / (1000 * 60 * 60 * 24));
        
        // Get latest biometry
        const latestBiometry = cycle.biometrics
          ?.sort((a, b) => new Date(b.measurement_date).getTime() - new Date(a.measurement_date).getTime())[0];

        // Add all biometry records
        cycle.biometrics?.forEach(bio => {
          allBiometry.push({
            measurement_date: bio.measurement_date,
            average_weight: bio.average_weight,
            uniformity: bio.uniformity || 0,
            sample_size: bio.sample_size || 0
          });
        });

        // Add all mortality records
        cycle.mortality_records?.forEach(mort => {
          allMortality.push({
            record_date: mort.record_date,
            dead_count: mort.dead_count,
            notes: mort.notes || ''
          });
        });

        // Add all feeding records from separate query
        if (feedingData) {
          feedingData
            .filter(feed => cyclesData.some(c => c.id === feed.pond_batch_id))
            .forEach(feed => {
              allFeeding.push({
                feeding_date: feed.feeding_date,
                feeding_time: feed.feeding_time,
                actual_amount: feed.actual_amount,
                unit_cost: feed.unit_cost || 0,
                feed_type_name: feed.feed_type_name || 'N/A'
              });
            });
        }

        if (latestBiometry) {
          const survivalRate = cycle.pl_quantity > 0 
            ? (cycle.current_population / cycle.pl_quantity) * 100 
            : 0;

          const biomass = (cycle.current_population * latestBiometry.average_weight) / 1000;
          const pondArea = cycle.ponds?.area || 0;
          
          // Calculate detailed costs
          const plCostTotal = (cycle.batches?.pl_cost || 0) * (cycle.pl_quantity / 1000);
          const preparationCost = cycle.preparation_cost || 0;
          
          // Calculate real feed cost from feeding records (Anti-Drift: converter gramas para kg)
          const realFeedCost = feedingData
            ?.filter(feed => feed.pond_batch_id === cycle.id)
            ?.reduce((sum, feed) => sum + (QuantityUtils.gramsToKg(feed.actual_amount) * (feed.unit_cost || 0)), 0) || 0;
          
          // Calculate operational costs for this specific cycle
          const operationalCost = operationalCostsData
            ?.filter(cost => cost.pond_batch_id === cycle.id)
            ?.reduce((sum, cost) => sum + cost.amount, 0) || 0;
          
          const totalCost = plCostTotal + preparationCost + realFeedCost + operationalCost;
          
          // Calculate estimated revenue using dynamic price table
          const pricePerKg = calculatePriceByWeight(latestBiometry.average_weight, priceTable);
          const estimatedRevenue = biomass * pricePerKg;
          const profitMargin = estimatedRevenue > 0 ? ((estimatedRevenue - totalCost) / estimatedRevenue) * 100 : 0;
          
          // Calculate additional metrics
          const density = pondArea > 0 ? cycle.current_population / pondArea : 0;
          const costPerKg = biomass > 0 ? totalCost / biomass : 0;
          const productivityPerHa = pondArea > 0 ? biomass / (pondArea / 10000) : 0; // kg/ha
          const pondResult = estimatedRevenue - totalCost;
          
          // Calculate FCA and weekly growth (simplified) (Anti-Drift: converter gramas para kg)
          const totalFeedUsedKg = feedingData
            ?.filter(feed => feed.pond_batch_id === cycle.id)
            ?.reduce((sum, feed) => sum + QuantityUtils.gramsToKg(feed.actual_amount), 0) || 0;
          const realFca = biomass > 0 ? totalFeedUsedKg / biomass : 0;
          
          // Calculate weekly growth (Anti-Drift: usar toda a série de biometrias)
          let weeklyGrowth = 0;
          if (cycle.biometrics && cycle.biometrics.length >= 2) {
            const sortedBio = cycle.biometrics.sort((a, b) => 
              new Date(a.measurement_date).getTime() - new Date(b.measurement_date).getTime()
            );
            const firstBio = sortedBio[0];
            const lastBio = sortedBio[sortedBio.length - 1];
            const daysBetween = Math.ceil(
              (new Date(lastBio.measurement_date).getTime() - new Date(firstBio.measurement_date).getTime()) 
              / (1000 * 60 * 60 * 24)
            );
            weeklyGrowth = QuantityUtils.calculateWeeklyGrowth(
              firstBio.average_weight, 
              lastBio.average_weight, 
              daysBetween
            );
          }

          processedCycles.push({
            cycle_id: cycle.id,
            batch_name: cycle.batches?.name || '',
            stocking_date: cycle.stocking_date,
            doc,
            initial_population: cycle.pl_quantity,
            current_population: cycle.current_population,
            survival_rate: survivalRate,
            average_weight: latestBiometry.average_weight,
            biomass,
            pond_area: pondArea,
            density,
            cost_per_kg: costPerKg,
            real_fca: realFca,
            weekly_growth: weeklyGrowth,
            productivity_per_ha: productivityPerHa,
            pond_result: pondResult,
            costs: {
              pl_cost: plCostTotal,
              preparation_cost: preparationCost,
              feed_cost: realFeedCost,
              operational_cost: operationalCost,
              total_cost: totalCost
            },
            estimated_revenue: estimatedRevenue,
            profit_margin: profitMargin,
            status: cycle.current_population > 0 ? 'active' : 'harvested'
          });
        }
      });

      setCycles(processedCycles);
      setBiometryRecords(allBiometry.sort((a, b) => 
        new Date(b.measurement_date).getTime() - new Date(a.measurement_date).getTime()
      ));
      setMortalityRecords(allMortality.sort((a, b) => 
        new Date(b.record_date).getTime() - new Date(a.record_date).getTime()
      ));
      setFeedingRecords(allFeeding.sort((a, b) => 
        new Date(b.feeding_date).getTime() - new Date(a.feeding_date).getTime()
      ));
      
      // Get water quality records
      const { data: waterData } = await supabase
        .from('water_quality')
        .select('measurement_date, oxygen_level, temperature, ph_level')
        .eq('pond_id', actualPondId)
        .order('measurement_date', { ascending: false });
        
      setWaterQualityRecords(waterData || []);
      } else {
        throw new Error('Ciclo não encontrado');
      }

    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditCost = (cycleId: string, costType: string, currentValue: number, cycleData: any) => {
    setEditingCost({ cycleId, costType });
    setEditingCycleData(cycleData);
    
    // Set the appropriate current value based on cost type
    switch (costType) {
      case 'pl_cost':
        setNewCostValue((currentValue / (cycleData.pl_quantity / 1000)).toString()); // Convert to per thousand
        break;
      case 'preparation_cost':
        setNewCostValue(currentValue.toString());
        break;
      default:
        setNewCostValue(currentValue.toString());
    }
  };

  const handleSaveCost = async () => {
    if (!editingCost || !newCostValue || !editingCycleData) return;

    try {
      const newValue = parseFloat(newCostValue);

      if (editingCost.costType === 'pl_cost') {
        // Find the batch ID from the cycle data
        const cycleData = cycles.find(c => c.cycle_id === editingCost.cycleId);
        if (!cycleData) throw new Error('Ciclo não encontrado');

        // Get the batch ID from the database
        const { data: batchData } = await supabase
          .from('pond_batches')
          .select('batch_id')
          .eq('id', editingCost.cycleId)
          .single();

        if (!batchData) throw new Error('Batch não encontrado');

        const { error } = await supabase
          .from('batches')
          .update({ pl_cost: newValue })
          .eq('id', batchData.batch_id);

        if (error) throw error;
      } else if (editingCost.costType === 'preparation_cost') {
        const { error } = await supabase
          .from('pond_batches')
          .update({ preparation_cost: newValue })
          .eq('id', editingCost.cycleId);

        if (error) throw error;
      } else {
        throw new Error('Tipo de custo não suportado');
      }

      toast({
        title: "Sucesso",
        description: "Custo atualizado com sucesso!"
      });

      setEditingCost(null);
      setNewCostValue("");
      setEditingCycleData(null);
      loadPondHistory(); // Reload data
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message
      });
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2].map(i => (
              <div key={i} className="h-64 bg-muted rounded"></div>
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
        <div className="flex items-center justify-between">
          <div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate('/reports')}
              className="mb-2"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar aos Relatórios
            </Button>
            <h1 className="text-3xl font-bold text-foreground">Histórico - {pondName}</h1>
            <p className="text-muted-foreground">
              Análise completa de custos e performance do viveiro
            </p>
          </div>
          
          {/* Price Table Configuration */}
          <div className="flex items-center gap-2">
            <Label htmlFor="priceTable" className="text-sm font-medium">
              Tabela de Preços:
            </Label>
            <select
              id="priceTable"
              value={priceTable}
              onChange={(e) => setPriceTable(Number(e.target.value))}
              className="h-9 px-3 py-1 text-sm border border-input bg-background rounded-md"
            >
              {Array.from({ length: 31 }, (_, i) => 10 + (i * 0.5)).map(value => (
                <option key={value} value={value}>
                  R$ {value.toFixed(1)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Cycles Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total de Ciclos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{cycles.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Ciclos Ativos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {cycles.filter(c => c.status === 'active').length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Produção Total</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {cycles.reduce((sum, c) => sum + c.biomass, 0).toFixed(1)} kg
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Custo Total</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                R$ {cycles.reduce((sum, c) => sum + c.costs.total_cost, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Cycles History */}
        <Card>
          <CardHeader>
            <CardTitle>Histórico de Ciclos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {cycles.map((cycle) => (
              <div key={cycle.cycle_id} className="border rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-lg">{cycle.batch_name}</h3>
                    <p className="text-sm text-muted-foreground">
                      Povoamento: {new Date(cycle.stocking_date).toLocaleDateString('pt-BR')} 
                      • DOC: {cycle.doc} dias
                    </p>
                  </div>
                  <Badge variant={cycle.status === 'active' ? 'default' : 'secondary'}>
                    {cycle.status === 'active' ? 'Ativo' : 'Finalizado'}
                  </Badge>
                </div>

                {/* Main Performance Metrics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Biomassa</p>
                    <p className="font-medium">{cycle.biomass.toFixed(1)} kg</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Peso Atual</p>
                    <p className="font-medium">{cycle.average_weight.toFixed(1)}g</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Crescimento</p>
                    <p className="font-medium">{cycle.weekly_growth.toFixed(1)}g/sem</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">FCA Real</p>
                    <p className="font-medium">{cycle.real_fca.toFixed(2)}</p>
                  </div>
                </div>

                {/* Secondary Metrics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Densidade</p>
                    <p className="font-medium">{cycle.density.toFixed(1)} Un/m²</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Custo/kg</p>
                    <p className="font-medium">R$ {cycle.cost_per_kg.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">População</p>
                    <p className="font-medium">{cycle.current_population.toLocaleString('pt-BR')}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Sobrevivência</p>
                    <p className="font-medium">{cycle.survival_rate.toFixed(1)}%</p>
                  </div>
                </div>

                {/* Financial Summary */}
                <div className="bg-muted/50 rounded-lg p-3">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Receita Estimada</p>
                      <p className="font-medium text-green-600">
                        R$ {cycle.estimated_revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Custo Total</p>
                      <p className="font-medium text-red-600">
                        R$ {cycle.costs.total_cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Resultado do Viveiro</p>
                      <p className={`font-medium ${cycle.pond_result > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        R$ {cycle.pond_result.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Produtividade</p>
                      <p className="font-medium">{cycle.productivity_per_ha.toFixed(1)} kg/ha</p>
                    </div>
                  </div>
                </div>

                {/* Cost Breakdown */}
                <div className="border-t pt-3">
                  <h4 className="font-medium mb-2">Detalhamento de Custos</h4>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
                    {/* Pós-Larvas */}
                    <div>
                      <div className="flex items-center justify-between">
                        <p className="text-muted-foreground">Pós-Larvas</p>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleEditCost(cycle.cycle_id, 'pl_cost', cycle.costs.pl_cost, {
                                batch_id: cycles.find(c => c.cycle_id === cycle.cycle_id)?.cycle_id,
                                pl_quantity: cycle.initial_population
                              })}
                            >
                              <Edit2 className="w-3 h-3" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Editar Custo de Pós-Larvas</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <label className="text-sm font-medium">Valor por mil pós-larvas (R$)</label>
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={newCostValue}
                                  onChange={(e) => setNewCostValue(e.target.value)}
                                  placeholder="Ex: 0.50"
                                />
                              </div>
                              <div className="flex gap-2">
                                <Button onClick={handleSaveCost} disabled={!newCostValue}>
                                  Salvar
                                </Button>
                                <Button 
                                  variant="outline" 
                                  onClick={() => {
                                    setEditingCost(null);
                                    setNewCostValue("");
                                    setEditingCycleData(null);
                                  }}
                                >
                                  Cancelar
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                      <p className="font-medium">R$ {cycle.costs.pl_cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    </div>
                    
                    {/* Preparação */}
                    <div>
                      <div className="flex items-center justify-between">
                        <p className="text-muted-foreground">Preparação</p>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleEditCost(cycle.cycle_id, 'preparation_cost', cycle.costs.preparation_cost, {})}
                            >
                              <Edit2 className="w-3 h-3" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Editar Custo de Preparação</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <label className="text-sm font-medium">Custo de preparação (R$)</label>
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={newCostValue}
                                  onChange={(e) => setNewCostValue(e.target.value)}
                                  placeholder="Ex: 500.00"
                                />
                              </div>
                              <div className="flex gap-2">
                                <Button onClick={handleSaveCost} disabled={!newCostValue}>
                                  Salvar
                                </Button>
                                <Button 
                                  variant="outline" 
                                  onClick={() => {
                                    setEditingCost(null);
                                    setNewCostValue("");
                                    setEditingCycleData(null);
                                  }}
                                >
                                  Cancelar
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                      <p className="font-medium">R$ {cycle.costs.preparation_cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    </div>
                    
                    {/* Ração (Estimada) */}
                    <div>
                      <div className="flex items-center justify-between">
                        <p className="text-muted-foreground">Ração (Est.)</p>
                        <span className="text-xs text-muted-foreground">(Calculado)</span>
                      </div>
                      <p className="font-medium">R$ {cycle.costs.feed_cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    </div>
                    
                    {/* Custos Operacionais */}
                    <div>
                      <div className="flex items-center justify-between">
                        <p className="text-muted-foreground">Custos Operacionais</p>
                        <span className="text-xs text-muted-foreground">(Registrados)</span>
                      </div>
                      <p className="font-medium">R$ {cycle.costs.operational_cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Performance Records */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Biometry Records */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scale className="w-4 h-4" />
                Biometrias Recentes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {biometryRecords.slice(0, 5).map((record, index) => (
                <div key={index} className="flex justify-between items-center text-sm">
                  <div>
                    <p className="font-medium">{record.average_weight.toFixed(1)}g</p>
                    <p className="text-muted-foreground">
                      {new Date(record.measurement_date).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  {record.uniformity > 0 && (
                    <Badge variant="outline">{record.uniformity}% unif.</Badge>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Mortality Records */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Skull className="w-4 h-4" />
                Mortalidade Recente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {mortalityRecords.slice(0, 5).map((record, index) => (
                <div key={index} className="text-sm">
                  <div className="flex justify-between items-center">
                    <p className="font-medium text-red-600">{record.dead_count.toLocaleString()} mortos</p>
                    <p className="text-muted-foreground">
                      {new Date(record.record_date).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  {record.notes && (
                    <p className="text-muted-foreground text-xs mt-1">{record.notes}</p>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Feeding Records */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Fish className="w-4 h-4" />
                Alimentação Recente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {feedingRecords.slice(0, 5).map((record, index) => (
                <div key={index} className="text-sm">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">{QuantityUtils.formatKg(record.actual_amount)} kg</p>
                      <p className="text-muted-foreground">
                        {new Date(record.feeding_date).toLocaleDateString('pt-BR')} • {record.feeding_time}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline">{record.feed_type_name}</Badge>
                      <p className="text-muted-foreground text-xs mt-1">
                        R$ {(QuantityUtils.gramsToKg(record.actual_amount) * record.unit_cost).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              {feedingRecords.length === 0 && (
                <p className="text-muted-foreground text-sm">Nenhum registro de alimentação encontrado.</p>
              )}
            </CardContent>
          </Card>

          {/* Water Quality */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Droplets className="w-4 h-4" />
                Qualidade da Água
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {waterQualityRecords.slice(0, 5).map((record, index) => (
                <div key={index} className="text-sm">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">
                        {record.temperature}°C • pH {record.ph_level}
                      </p>
                      <p className="text-muted-foreground">
                        {new Date(record.measurement_date).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <p className="text-muted-foreground">
                      O₂: {record.oxygen_level} mg/L
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}