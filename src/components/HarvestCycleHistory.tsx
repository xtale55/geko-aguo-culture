import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { 
  Calendar, 
  DollarSign, 
  Fish, 
  TrendingUp, 
  ChevronDown, 
  ChevronRight,
  Scale,
  Activity,
  Target,
  BarChart3
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import HarvestHistoryDetail from './HarvestHistoryDetail';

interface HarvestRecord {
  id: string;
  harvest_date: string;
  harvest_type: 'total' | 'partial';
  biomass_harvested: number;
  population_harvested: number;
  price_per_kg: number | null;
  total_value: number | null;
  notes: string | null;
  average_weight_at_harvest?: number;
  allocated_feed_cost?: number | null;
  allocated_input_cost?: number | null;
  allocated_pl_cost?: number | null;
  allocated_preparation_cost?: number | null;
}

interface CycleHarvest {
  pond_batch_id: string;
  pond_name: string;
  batch_name: string;
  stocking_date: string;
  cycle_status: string;
  pl_quantity: number;
  
  // Cycle totals
  total_biomass_harvested: number;
  total_population_harvested: number;
  total_revenue: number;
  cycle_duration: number;
  
  // Performance metrics
  survival_rate: number;
  average_harvest_weight: number;
  productivity_per_ha: number;
  
  // Financial metrics
  total_cycle_cost: number;
  profit_margin: number;
  cost_per_kg: number;
  real_fca: number; // Real Feed Conversion Ratio based on actual consumption
  
  // Individual harvests
  harvests: HarvestRecord[];
  
  // Pond area for calculations
  pond_area: number;
  
  // Real feed consumption
  total_real_feed_kg: number;
}

interface HarvestCycleHistoryProps {
  onRefresh?: () => void;
}

const HarvestCycleHistory = ({ onRefresh }: HarvestCycleHistoryProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [cycleHarvests, setCycleHarvests] = useState<CycleHarvest[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCycles, setExpandedCycles] = useState<Set<string>>(new Set());
  const [selectedHarvestId, setSelectedHarvestId] = useState<string | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  useEffect(() => {
    if (user) {
      loadCycleHarvests();
    }
  }, [user]);

  const loadCycleHarvests = async () => {
    try {
      setLoading(true);

      // Get all pond batches that have harvest records with allocated costs
      const { data: harvestData, error: harvestError } = await supabase
        .from('harvest_records')
        .select(`
          *,
          pond_batches!inner (
            id,
            pl_quantity,
            stocking_date,
            cycle_status,
            ponds!inner (
              name,
              area,
              farms!inner (
                user_id
              )
            ),
            batches!inner (
              name,
              pl_cost
            )
          )
        `)
        .eq('pond_batches.ponds.farms.user_id', user?.id)
        .order('harvest_date', { ascending: false });

      if (harvestError) throw harvestError;

      // Get real feed consumption data for all pond batches
      const pondBatchIds = [...new Set(harvestData?.map(h => h.pond_batch_id) || [])];
      const { data: feedingData, error: feedingError } = await supabase
        .from('feeding_records')
        .select('pond_batch_id, actual_amount')
        .in('pond_batch_id', pondBatchIds);

      if (feedingError) throw feedingError;

      // Calculate total feed consumption per pond batch
      const feedConsumptionMap = new Map<string, number>();
      feedingData?.forEach(record => {
        const currentTotal = feedConsumptionMap.get(record.pond_batch_id) || 0;
        feedConsumptionMap.set(record.pond_batch_id, currentTotal + (record.actual_amount || 0));
      });

      // Group harvests by pond_batch_id
      const cycleMap = new Map<string, CycleHarvest>();

      harvestData?.forEach((harvest: any) => {
        const pondBatch = harvest.pond_batches;
        const pond = pondBatch.ponds;
        const batch = pondBatch.batches;
        
        if (!cycleMap.has(pondBatch.id)) {
          // Calculate cycle duration
          const stockingDate = new Date(pondBatch.stocking_date);
          const lastHarvestDate = new Date(
            Math.max(...harvestData
              .filter((h: any) => h.pond_batch_id === pondBatch.id)
              .map((h: any) => new Date(h.harvest_date).getTime())
            )
          );
          const cycleDuration = Math.ceil(
            (lastHarvestDate.getTime() - stockingDate.getTime()) / (1000 * 60 * 60 * 24)
          );

          cycleMap.set(pondBatch.id, {
            pond_batch_id: pondBatch.id,
            pond_name: pond.name,
            batch_name: batch.name,
            stocking_date: pondBatch.stocking_date,
            cycle_status: pondBatch.cycle_status,
            pl_quantity: pondBatch.pl_quantity,
            cycle_duration: cycleDuration,
            total_biomass_harvested: 0,
            total_population_harvested: 0,
            total_revenue: 0,
            survival_rate: 0,
            average_harvest_weight: 0,
            productivity_per_ha: 0,
            total_cycle_cost: 0,
            profit_margin: 0,
            cost_per_kg: 0,
            real_fca: 0,
            total_real_feed_kg: feedConsumptionMap.get(pondBatch.id) ? (feedConsumptionMap.get(pondBatch.id)! / 1000) : 0,
            harvests: [],
            pond_area: pond.area || 1
          });
        }

        const cycle = cycleMap.get(pondBatch.id)!;
        
        // Add harvest to cycle (include allocated costs for calculations)
        cycle.harvests.push({
          id: harvest.id,
          harvest_date: harvest.harvest_date,
          harvest_type: harvest.harvest_type,
          biomass_harvested: harvest.biomass_harvested,
          population_harvested: harvest.population_harvested,
          price_per_kg: harvest.price_per_kg,
          total_value: harvest.total_value,
          notes: harvest.notes,
          average_weight_at_harvest: harvest.average_weight_at_harvest,
          allocated_feed_cost: harvest.allocated_feed_cost,
          allocated_input_cost: harvest.allocated_input_cost,
          allocated_pl_cost: harvest.allocated_pl_cost,
          allocated_preparation_cost: harvest.allocated_preparation_cost
        } as any);

        // Update cycle totals
        cycle.total_biomass_harvested += harvest.biomass_harvested;
        cycle.total_population_harvested += harvest.population_harvested;
        cycle.total_revenue += harvest.total_value || 0;
      });

      // Calculate metrics for each cycle
      const processedCycles = Array.from(cycleMap.values()).map(cycle => {
        // Calculate survival rate based on total harvested vs initial PLs
        cycle.survival_rate = cycle.pl_quantity > 0 
          ? (cycle.total_population_harvested / cycle.pl_quantity) * 100 
          : 0;

        // Calculate average harvest weight
        cycle.average_harvest_weight = cycle.total_population_harvested > 0
          ? (cycle.total_biomass_harvested * 1000) / cycle.total_population_harvested
          : 0;

        // Calculate productivity per hectare
        const pondAreaHa = cycle.pond_area / 10000; // Convert m² to ha
        cycle.productivity_per_ha = cycle.total_biomass_harvested / pondAreaHa;

        // Calculate costs using REAL data from harvests (allocated costs)
        cycle.total_cycle_cost = cycle.harvests.reduce((sum, harvest) => {
          const feedCost = (harvest as any).allocated_feed_cost || 0;
          const inputCost = (harvest as any).allocated_input_cost || 0; 
          const plCost = (harvest as any).allocated_pl_cost || 0;
          const prepCost = (harvest as any).allocated_preparation_cost || 0;
          return sum + feedCost + inputCost + plCost + prepCost;
        }, 0);
        
        // Calculate financial metrics
        cycle.profit_margin = cycle.total_revenue > 0 
          ? ((cycle.total_revenue - cycle.total_cycle_cost) / cycle.total_revenue) * 100 
          : 0;
        
        cycle.cost_per_kg = cycle.total_biomass_harvested > 0 
          ? cycle.total_cycle_cost / cycle.total_biomass_harvested 
          : 0;

        // Calculate real FCA based on actual feed consumption
        cycle.real_fca = cycle.total_biomass_harvested > 0 && cycle.total_real_feed_kg > 0
          ? cycle.total_real_feed_kg / cycle.total_biomass_harvested
          : 0;

        // Sort harvests by date
        cycle.harvests.sort((a, b) => new Date(a.harvest_date).getTime() - new Date(b.harvest_date).getTime());

        return cycle;
      });

      // Sort cycles by most recent harvest
      processedCycles.sort((a, b) => {
        const aLastHarvest = Math.max(...a.harvests.map(h => new Date(h.harvest_date).getTime()));
        const bLastHarvest = Math.max(...b.harvests.map(h => new Date(h.harvest_date).getTime()));
        return bLastHarvest - aLastHarvest;
      });

      setCycleHarvests(processedCycles);

    } catch (error: any) {
      console.error('Error loading cycle harvests:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar histórico de despescas",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleCycleExpanded = (pondBatchId: string) => {
    const newExpanded = new Set(expandedCycles);
    if (newExpanded.has(pondBatchId)) {
      newExpanded.delete(pondBatchId);
    } else {
      newExpanded.add(pondBatchId);
    }
    setExpandedCycles(newExpanded);
  };

  const getCycleStatusBadge = (status: string, harvests: HarvestRecord[]) => {
    const hasTotal = harvests.some(h => h.harvest_type === 'total');
    if (hasTotal || status === 'completed') {
      return <Badge variant="default">Concluído</Badge>;
    }
    return <Badge variant="secondary">Em Andamento</Badge>;
  };

  const getPerformanceColor = (survivalRate: number, profitMargin: number) => {
    if (survivalRate >= 85 && profitMargin >= 60) return 'text-green-600';
    if (survivalRate >= 75 && profitMargin >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Carregando histórico...</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Fish className="h-5 w-5" />
            Histórico de Ciclos e Despescas
          </CardTitle>
          <CardDescription>
            Dados consolidados por ciclo produtivo com detalhamento das despescas
          </CardDescription>
        </CardHeader>
        <CardContent>
          {cycleHarvests.length === 0 ? (
            <div className="text-center py-12">
              <Fish className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                Nenhum ciclo com despescas encontrado
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {cycleHarvests.map((cycle) => {
                // Determina se o ciclo está completo (tem despesca total)
                const hasTotal = cycle.harvests.some(h => h.harvest_type === 'total');
                const isCompleted = hasTotal || cycle.cycle_status === 'completed';
                
                return (
                  <Card key={cycle.pond_batch_id} className="border-l-4 border-l-primary">
                    <Collapsible
                      open={expandedCycles.has(cycle.pond_batch_id)}
                      onOpenChange={() => toggleCycleExpanded(cycle.pond_batch_id)}
                    >
                      <CollapsibleTrigger asChild>
                        <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {expandedCycles.has(cycle.pond_batch_id) ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                              <div>
                                <CardTitle className="text-lg">
                                  📊 {cycle.pond_name} - {cycle.batch_name}
                                </CardTitle>
                                <CardDescription className="flex items-center gap-4 mt-1">
                                  <span className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    {format(new Date(cycle.stocking_date), 'dd/MM/yyyy', { locale: ptBR })} 
                                    → {cycle.cycle_duration} dias
                                  </span>
                                  {getCycleStatusBadge(cycle.cycle_status, cycle.harvests)}
                                </CardDescription>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-semibold text-primary">
                                R$ {cycle.total_revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {cycle.total_biomass_harvested.toFixed(1)} kg total
                              </div>
                            </div>
                          </div>
                          
                          {/* Performance Summary */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                            {/* Só mostra sobrevivência se o ciclo estiver completo */}
                            {isCompleted && (
                              <div className="flex items-center gap-2">
                                <Target className="h-4 w-4 text-muted-foreground" />
                                <div>
                                  <div className="text-sm font-medium">
                                    {cycle.survival_rate.toFixed(1)}% sobrev.
                                  </div>
                                  <div className="text-xs text-muted-foreground">Sobrevivência</div>
                                </div>
                              </div>
                            )}
                            <div className="flex items-center gap-2">
                              <Scale className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <div className="text-sm font-medium">
                                  {cycle.average_harvest_weight.toFixed(1)}g
                                </div>
                                <div className="text-xs text-muted-foreground">Peso médio</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <BarChart3 className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <div className="text-sm font-medium">
                                  {cycle.productivity_per_ha.toFixed(0)} kg/ha
                                </div>
                                <div className="text-xs text-muted-foreground">Produtividade</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <TrendingUp className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <div className={`text-sm font-medium ${getPerformanceColor(cycle.survival_rate, cycle.profit_margin)}`}>
                                  {cycle.profit_margin.toFixed(0)}% margem
                                </div>
                                <div className="text-xs text-muted-foreground">Resultado</div>
                              </div>
                            </div>
                          </div>
                        </CardHeader>
                      </CollapsibleTrigger>

                      <CollapsibleContent>
                        <CardContent className="pt-0">
                          {/* Detailed Cycle Metrics */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/30 rounded-lg mb-4">
                            <div>
                              <div className="text-lg font-semibold">
                                {cycle.total_population_harvested.toLocaleString()}
                              </div>
                              <div className="text-sm text-muted-foreground">Population Total</div>
                            </div>
                            <div>
                              <div className="text-lg font-semibold">
                                R$ {cycle.cost_per_kg.toFixed(2)}/kg
                              </div>
                              <div className="text-sm text-muted-foreground">Custo por kg</div>
                            </div>
                            <div>
                              <div className="text-lg font-semibold">
                                R$ {(cycle.total_revenue - cycle.total_cycle_cost).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </div>
                              <div className="text-sm text-muted-foreground">Lucro Estimado</div>
                            </div>
                            <div>
                              <div className="text-lg font-semibold">
                                {cycle.harvests.length}x
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {cycle.harvests.filter(h => h.harvest_type === 'partial').length} parcial + 
                                {cycle.harvests.filter(h => h.harvest_type === 'total').length} total
                              </div>
                            </div>
                          </div>

          {/* Individual Harvests and Consolidation */}
          <div className="space-y-4">
            {/* Despescas Individuais */}
            <div>
              <h4 className="font-medium text-sm text-muted-foreground mb-3">
                📈 Despescas do Ciclo ({cycle.harvests.length}):
              </h4>
              <div className="space-y-3">
                {cycle.harvests.map((harvest, index) => (
                  <Card 
                    key={harvest.id} 
                    className="cursor-pointer hover:shadow-md transition-shadow bg-card/50 border-l-2"
                    style={{ 
                      borderLeftColor: harvest.harvest_type === 'partial' ? '#f59e0b' : '#10b981' 
                    }}
                    onClick={() => {
                      setSelectedHarvestId(harvest.id);
                      setDetailDialogOpen(true);
                    }}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Badge variant={harvest.harvest_type === 'partial' ? 'secondary' : 'default'}>
                              {harvest.harvest_type === 'partial' 
                                ? `🔸 Despesca Parcial #${index + 1}` 
                                : `🔹 Despesca Total #${index + 1}`
                              }
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {format(new Date(harvest.harvest_date), 'dd/MM/yyyy', { locale: ptBR })}
                            </span>
                          </div>
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">Biomassa:</span>
                              <div className="font-medium">{harvest.biomass_harvested.toFixed(1)} kg</div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">População:</span>
                              <div className="font-medium">{harvest.population_harvested.toLocaleString()}</div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Peso médio:</span>
                              <div className="font-medium">
                                {harvest.average_weight_at_harvest 
                                  ? `${harvest.average_weight_at_harvest.toFixed(1)}g`
                                  : harvest.population_harvested > 0 
                                    ? `${((harvest.biomass_harvested * 1000) / harvest.population_harvested).toFixed(1)}g`
                                    : 'N/A'
                                }
                              </div>
                            </div>
                          </div>
                          {harvest.notes && (
                            <div className="text-sm">
                              <span className="text-muted-foreground">Observações:</span> {harvest.notes}
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-semibold text-primary">
                            R$ {(harvest.total_value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {harvest.price_per_kg ? `R$ ${harvest.price_per_kg.toFixed(2)}/kg` : 'Preço não informado'}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Consolidação Final (só para ciclos completos) */}
            {isCompleted && (
              <div className="mt-6">
                <h4 className="font-medium text-sm text-muted-foreground mb-3">
                  📈 Consolidação do Ciclo Completo:
                </h4>
                <Card className="border-2 border-primary/20 bg-primary/5">
                  <CardContent className="p-6">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                      {/* Métricas de Performance */}
                      <div className="space-y-4">
                        <h5 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                          Performance Final
                        </h5>
                        <div className="space-y-3">
                          <div>
                            <div className="text-2xl font-bold text-primary">
                              {cycle.survival_rate.toFixed(1)}%
                            </div>
                            <div className="text-sm text-muted-foreground">Sobrevivência Final</div>
                            <div className="text-xs text-muted-foreground">
                              {cycle.total_population_harvested.toLocaleString()} / {cycle.pl_quantity.toLocaleString()} PLs
                            </div>
                          </div>
                          <div>
                            <div className="text-xl font-bold">
                              {cycle.average_harvest_weight.toFixed(1)}g
                            </div>
                            <div className="text-sm text-muted-foreground">Peso Médio Final</div>
                          </div>
                          <div>
                            <div className="text-xl font-bold">
                              {cycle.productivity_per_ha.toFixed(0)} kg/ha
                            </div>
                            <div className="text-sm text-muted-foreground">Produtividade</div>
                          </div>
                          <div>
                            <div className="text-xl font-bold text-blue-600">
                              {cycle.real_fca > 0 ? cycle.real_fca.toFixed(2) : 'N/A'}
                            </div>
                            <div className="text-sm text-muted-foreground">FCA Real do Ciclo</div>
                          </div>
                        </div>
                      </div>

                      {/* Métricas Financeiras */}
                      <div className="space-y-4">
                        <h5 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                          Resultado Financeiro
                        </h5>
                        <div className="space-y-3">
                          <div>
                            <div className="text-2xl font-bold text-green-600">
                              R$ {cycle.total_revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </div>
                            <div className="text-sm text-muted-foreground">Faturamento Total</div>
                          </div>
                          <div>
                            <div className="text-xl font-bold text-red-600">
                              R$ {cycle.total_cycle_cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </div>
                            <div className="text-sm text-muted-foreground">Custo Total Real</div>
                          </div>
                          <div>
                            <div className={`text-xl font-bold ${
                              cycle.total_revenue - cycle.total_cycle_cost >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              R$ {(cycle.total_revenue - cycle.total_cycle_cost).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </div>
                            <div className="text-sm text-muted-foreground">Lucro Total</div>
                          </div>
                        </div>
                      </div>

                      {/* Indicadores Técnicos */}
                      <div className="space-y-4">
                        <h5 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                          Indicadores Técnicos
                        </h5>
                        <div className="space-y-3">
                           <div>
                             <div className="text-xl font-bold">
                               R$ {cycle.cost_per_kg.toFixed(2)}/kg
                             </div>
                             <div className="text-sm text-muted-foreground">Custo por kg Real</div>
                           </div>
                           <div>
                             <div className="text-xl font-bold">
                               {(() => {
                                 const totalFeedCost = cycle.harvests.reduce((sum, h) => sum + ((h as any).allocated_feed_cost || 0), 0);
                                 const avgFeedPrice = 7; // R$ por kg - estimativa
                                 const totalFeedKg = totalFeedCost / avgFeedPrice;
                                 const cycleFCA = cycle.total_biomass_harvested > 0 ? totalFeedKg / cycle.total_biomass_harvested : 0;
                                 return cycleFCA.toFixed(2);
                               })()}
                             </div>
                             <div className="text-sm text-muted-foreground">FCA do Ciclo Completo</div>
                           </div>
                           <div>
                             <div className={`text-xl font-bold ${getPerformanceColor(cycle.survival_rate, cycle.profit_margin)}`}>
                               {cycle.profit_margin.toFixed(0)}%
                             </div>
                             <div className="text-sm text-muted-foreground">Margem de Lucro</div>
                           </div>
                           <div>
                             <div className="text-xl font-bold">
                               {cycle.cycle_duration} dias
                             </div>
                             <div className="text-sm text-muted-foreground">Duração do Ciclo</div>
                           </div>
                        </div>
                      </div>
                    </div>
                    
                     {/* Nota sobre dados reais */}
                     <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                       <p className="text-xs text-green-800">
                         ✅ <strong>Dados consolidados reais:</strong> Os valores acima são calculados a partir dos custos 
                         realmente alocados em cada despesca, proporcionalmente à biomassa despescada.
                       </p>
                     </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
                        </CardContent>
                      </CollapsibleContent>
                    </Collapsible>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Harvest Detail Dialog */}
      {selectedHarvestId && (
        <HarvestHistoryDetail
          harvestId={selectedHarvestId}
          open={detailDialogOpen}
          onOpenChange={(open) => {
            setDetailDialogOpen(open);
            if (!open) {
              setSelectedHarvestId(null);
              onRefresh?.();
            }
          }}
        />
      )}
    </>
  );
};

export default HarvestCycleHistory;