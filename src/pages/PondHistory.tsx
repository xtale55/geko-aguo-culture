import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useParams } from "react-router-dom";
import { 
  ArrowLeft, Calendar, DollarSign, Scale, TrendingUp, 
  Package, Droplets, Skull, Fish, Edit2 
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CostBreakdown {
  pl_cost: number;
  preparation_cost: number;
  feed_cost: number;
  labor_cost: number;
  inventory_cost: number;
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
  const [waterQualityRecords, setWaterQualityRecords] = useState<WaterQualityRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCost, setEditingCost] = useState<{ cycleId: string, costType: string } | null>(null);
  const [newCostValue, setNewCostValue] = useState<string>("");
  const [editingCycleData, setEditingCycleData] = useState<any>(null);
  const { pondId: cycleId } = useParams(); // Actually receiving cycle_id
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

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
          ponds(name)
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
            mortality_records(record_date, dead_count, notes)
          `)
          .eq('pond_id', actualPondId)
          .order('stocking_date', { ascending: false });

        // Get water quality records
        const { data: waterData } = await supabase
          .from('water_quality')
          .select('measurement_date, oxygen_level, temperature, ph_level')
          .eq('pond_id', actualPondId)
          .order('measurement_date', { ascending: false });

        // Get inventory costs for this farm
        const { data: farmData } = await supabase
          .from('ponds')
          .select('farm_id')
          .eq('id', actualPondId)
          .single();

        let inventoryCosts = 0;
        if (farmData) {
          const { data: inventory } = await supabase
            .from('inventory')
            .select('total_value, category')
            .eq('farm_id', farmData.farm_id);
          
          inventoryCosts = inventory?.reduce((sum, item) => sum + item.total_value, 0) || 0;
        }

        // Process cycles
      const processedCycles: PondCycleHistory[] = [];
      const allBiometry: BiometryRecord[] = [];
      const allMortality: MortalityRecord[] = [];

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

        if (latestBiometry) {
          const survivalRate = cycle.pl_quantity > 0 
            ? (cycle.current_population / cycle.pl_quantity) * 100 
            : 0;

          const biomass = (cycle.current_population * latestBiometry.average_weight) / 1000;
          
          // Calculate detailed costs
          const plCostTotal = (cycle.batches?.pl_cost || 0) * (cycle.pl_quantity / 1000);
          const preparationCost = cycle.preparation_cost || 0;
          const estimatedFeedCost = biomass * 1.5 * 7; // 1.5 FCR * R$7/kg
          const laborCost = doc * 50; // R$50/day estimated labor
          const inventoryCostPerCycle = inventoryCosts / Math.max(cyclesData.length, 1);
          
          const totalCost = plCostTotal + preparationCost + estimatedFeedCost + laborCost + inventoryCostPerCycle;
          const estimatedRevenue = biomass * 25; // R$25/kg
          const profitMargin = estimatedRevenue > 0 ? ((estimatedRevenue - totalCost) / estimatedRevenue) * 100 : 0;

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
            costs: {
              pl_cost: plCostTotal,
              preparation_cost: preparationCost,
              feed_cost: estimatedFeedCost,
              labor_cost: laborCost,
              inventory_cost: inventoryCostPerCycle,
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

                <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Sobrevivência</p>
                    <p className="font-medium">{cycle.survival_rate.toFixed(1)}%</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Peso Médio</p>
                    <p className="font-medium">{cycle.average_weight.toFixed(1)}g</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Biomassa</p>
                    <p className="font-medium">{cycle.biomass.toFixed(1)} kg</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Receita Est.</p>
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
                    <p className="text-muted-foreground">Margem</p>
                    <p className={`font-medium ${cycle.profit_margin > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {cycle.profit_margin.toFixed(1)}%
                    </p>
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
                    
                    {/* Mão de Obra */}
                    <div>
                      <div className="flex items-center justify-between">
                        <p className="text-muted-foreground">Mão de Obra</p>
                        <span className="text-xs text-muted-foreground">(Calculado)</span>
                      </div>
                      <p className="font-medium">R$ {cycle.costs.labor_cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    </div>
                    
                    {/* Outros */}
                    <div>
                      <div className="flex items-center justify-between">
                        <p className="text-muted-foreground">Outros</p>
                        <span className="text-xs text-muted-foreground">(Inventário)</span>
                      </div>
                      <p className="font-medium">R$ {cycle.costs.inventory_cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Performance Records */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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