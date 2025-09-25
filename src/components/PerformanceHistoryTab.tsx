import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp, Calendar, TrendingUp, DollarSign, Scale, Activity, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { QuantityUtils } from "@/lib/quantityUtils";
import { CycleManagementHistory } from "@/components/CycleManagementHistory";

interface HistoricalCycleData {
  pond_batch_id: string;
  pond_name: string;
  batch_name: string;
  stocking_date: string;
  completion_date: string | null;
  doc: number;
  
  // Métricas consolidadas
  total_biomass_harvested: number;
  total_population_harvested: number;
  final_survival_rate: number;
  real_fca: number;
  cost_per_kg: number;
  profit_margin: number;
  
  // Custos
  total_feed_cost: number;
  total_input_cost: number;
  total_pl_cost: number;
  total_preparation_cost: number;
  total_cost: number;
  
  // Revenue
  total_revenue: number;
  
  // Histórico de despescas
  harvest_history: {
    date: string;
    type: 'partial' | 'total';
    biomass: number;
    population: number;
    average_weight: number;
  }[];
  
  // Performance
  performance_rating: 'Ruim' | 'Moderada' | 'Boa';
}

interface PerformanceHistoryTabProps {
  farmIds: string[];
}

export function PerformanceHistoryTab({ farmIds }: PerformanceHistoryTabProps) {
  const [historicalCycles, setHistoricalCycles] = useState<HistoricalCycleData[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [expandedManagementHistory, setExpandedManagementHistory] = useState<Set<string>>(new Set());
  const { user } = useAuth();

  useEffect(() => {
    if (farmIds.length > 0) {
      loadHistoricalCycles();
    }
  }, [farmIds]);

  const loadHistoricalCycles = async () => {
    try {
      setLoading(true);

      // Get completed pond batches
      const { data: completedBatches, error: batchesError } = await supabase
        .from('pond_batches')
        .select(`
          id,
          stocking_date,
          pl_quantity,
          preparation_cost,
          cycle_status,
          final_population,
          final_biomass,
          final_survival_rate,
          ponds!inner(
            name,
            farm_id
          ),
          batches!inner(
            name,
            pl_cost
          )
        `)
        .in('ponds.farm_id', farmIds)
        .eq('cycle_status', 'completed')
        .order('stocking_date', { ascending: false });

      if (batchesError) throw batchesError;
      if (!completedBatches || completedBatches.length === 0) {
        setLoading(false);
        return;
      }

      const batchIds = completedBatches.map(b => b.id);

      // Get harvest records for these batches
      const { data: harvestRecords } = await supabase
        .from('harvest_records')
        .select('*')
        .in('pond_batch_id', batchIds)
        .order('harvest_date', { ascending: true });

      // Get feeding records for FCA calculation
      const { data: feedingRecords } = await supabase
        .from('feeding_records')
        .select('*')
        .in('pond_batch_id', batchIds);

      // Get input applications for cost calculation
      const { data: inputApplications } = await supabase
        .from('input_applications')
        .select('*')
        .in('pond_batch_id', batchIds);

      const processedCycles: HistoricalCycleData[] = completedBatches.map(batch => {
        const batchHarvests = harvestRecords?.filter(hr => hr.pond_batch_id === batch.id) || [];
        const batchFeeding = feedingRecords?.filter(fr => fr.pond_batch_id === batch.id) || [];
        const batchInputs = inputApplications?.filter(ia => ia.pond_batch_id === batch.id) || [];

        // Calculate totals from harvests
        const totalBiomassHarvested = batchHarvests.reduce((sum, hr) => sum + hr.biomass_harvested, 0);
        const totalPopulationHarvested = batchHarvests.reduce((sum, hr) => sum + hr.population_harvested, 0);

        // Calculate costs
        const totalFeedCost = batchFeeding.reduce((sum, fr) => {
          return sum + (QuantityUtils.gramsToKg(fr.actual_amount) * (fr.unit_cost || 0));
        }, 0);
        
        const totalInputCost = batchInputs.reduce((sum, ia) => sum + (ia.total_cost || 0), 0);
        const totalPLCost = (batch.batches.pl_cost || 0) * (batch.pl_quantity / 1000);
        const totalPreparationCost = batch.preparation_cost || 0;
        const totalCost = totalFeedCost + totalInputCost + totalPLCost + totalPreparationCost;

        // Calculate FCA
        const totalFeedConsumed = batchFeeding.reduce((sum, fr) => {
          return sum + QuantityUtils.gramsToKg(fr.actual_amount);
        }, 0);
        const realFCA = totalFeedConsumed > 0 && totalBiomassHarvested > 0 
          ? totalFeedConsumed / totalBiomassHarvested 
          : 0;

        // Calculate revenue (using average price of R$19/kg as base)
        const averagePrice = 19;
        const totalRevenue = totalBiomassHarvested * averagePrice;

        // Calculate metrics
        const costPerKg = totalBiomassHarvested > 0 ? totalCost / totalBiomassHarvested : 0;
        const profitMargin = totalRevenue > 0 ? ((totalRevenue - totalCost) / totalRevenue) * 100 : 0;
        const finalSurvivalRate = batch.final_survival_rate || 0;

        // Get completion date (last harvest date)
        const completionDate = batchHarvests.length > 0 
          ? batchHarvests[batchHarvests.length - 1].harvest_date 
          : null;

        // Calculate DOC
        const stockingDate = new Date(batch.stocking_date);
        const endDate = completionDate ? new Date(completionDate) : new Date();
        const doc = Math.ceil((endDate.getTime() - stockingDate.getTime()) / (1000 * 60 * 60 * 24));

        // Create harvest history
        const harvestHistory = batchHarvests.map(hr => ({
          date: hr.harvest_date,
          type: hr.harvest_type as 'partial' | 'total',
          biomass: hr.biomass_harvested,
          population: hr.population_harvested,
          average_weight: hr.average_weight_at_harvest || 0
        }));

        // Determine performance rating based on profit margin
        let performanceRating: 'Ruim' | 'Moderada' | 'Boa' = 'Ruim';
        if (profitMargin >= 25) {
          performanceRating = 'Boa';
        } else if (profitMargin >= 5) {
          performanceRating = 'Moderada';
        }

        return {
          pond_batch_id: batch.id,
          pond_name: batch.ponds.name,
          batch_name: batch.batches.name,
          stocking_date: batch.stocking_date,
          completion_date: completionDate,
          doc,
          total_biomass_harvested: totalBiomassHarvested,
          total_population_harvested: totalPopulationHarvested,
          final_survival_rate: finalSurvivalRate,
          real_fca: realFCA,
          cost_per_kg: costPerKg,
          profit_margin: profitMargin,
          total_feed_cost: totalFeedCost,
          total_input_cost: totalInputCost,
          total_pl_cost: totalPLCost,
          total_preparation_cost: totalPreparationCost,
          total_cost: totalCost,
          total_revenue: totalRevenue,
          harvest_history: harvestHistory,
          performance_rating: performanceRating
        };
      });

      setHistoricalCycles(processedCycles);
    } catch (error) {
      console.error('Error loading historical cycles:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleCard = (cardId: string) => {
    const newExpanded = new Set(expandedCards);
    if (newExpanded.has(cardId)) {
      newExpanded.delete(cardId);
    } else {
      newExpanded.add(cardId);
    }
    setExpandedCards(newExpanded);
  };

  const toggleManagementHistory = (cardId: string) => {
    const newExpanded = new Set(expandedManagementHistory);
    if (newExpanded.has(cardId)) {
      newExpanded.delete(cardId);
    } else {
      newExpanded.add(cardId);
    }
    setExpandedManagementHistory(newExpanded);
  };

  const getPerformanceBadgeColor = (rating: string) => {
    switch (rating) {
      case 'Boa':
        return 'bg-green-500 text-white';
      case 'Moderada':
        return 'bg-yellow-500 text-white';
      case 'Ruim':
        return 'bg-red-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-24 bg-gray-100 rounded-lg animate-pulse" />
        <div className="h-24 bg-gray-100 rounded-lg animate-pulse" />
        <div className="h-24 bg-gray-100 rounded-lg animate-pulse" />
      </div>
    );
  }

  if (historicalCycles.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Activity className="h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Nenhum Ciclo Finalizado
          </h3>
          <p className="text-gray-500 text-center">
            Complete alguns ciclos de cultivo para ver o histórico de performance aqui.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Histórico de Performance</h2>
        <Badge variant="outline" className="text-sm">
          {historicalCycles.length} ciclos finalizados
        </Badge>
      </div>

      <div className="space-y-4">
        {historicalCycles.map((cycle) => (
          <Collapsible key={cycle.pond_batch_id}>
            <Card className="overflow-hidden">
              <CollapsibleTrigger 
                className="w-full"
                onClick={() => toggleCard(cycle.pond_batch_id)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="text-left">
                        <CardTitle className="text-lg">
                          {cycle.pond_name} - {cycle.batch_name}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">
                          {new Date(cycle.stocking_date).toLocaleDateString('pt-BR')} • {cycle.doc} dias
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-6">
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">Biomassa Total</p>
                        <p className="font-semibold">{cycle.total_biomass_harvested.toFixed(1)} kg</p>
                      </div>
                      
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">FCA</p>
                        <p className="font-semibold">{cycle.real_fca.toFixed(2)}</p>
                      </div>
                      
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">Custo/kg</p>
                        <p className="font-semibold">R$ {cycle.cost_per_kg.toFixed(2)}</p>
                      </div>
                      
                      <Badge className={getPerformanceBadgeColor(cycle.performance_rating)}>
                        {cycle.performance_rating}
                      </Badge>
                      
                      {expandedCards.has(cycle.pond_batch_id) ? (
                        <ChevronUp className="h-5 w-5" />
                      ) : (
                        <ChevronDown className="h-5 w-5" />
                      )}
                    </div>
                  </div>
                </CardHeader>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Resumo do Ciclo */}
                    <div className="space-y-4">
                      <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                        Resumo do Ciclo
                      </h4>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm text-muted-foreground">Finalização</p>
                            <p className="font-medium">
                              {cycle.completion_date 
                                ? new Date(cycle.completion_date).toLocaleDateString('pt-BR')
                                : 'N/A'
                              }
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm text-muted-foreground">Sobrevivência</p>
                            <p className="font-medium">{cycle.final_survival_rate.toFixed(1)}%</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Scale className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm text-muted-foreground">População Total</p>
                            <p className="font-medium">{cycle.total_population_harvested.toLocaleString()} und</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm text-muted-foreground">Margem de Lucro</p>
                            <p className="font-medium">{cycle.profit_margin.toFixed(1)}%</p>
                          </div>
                        </div>
                      </div>

                      {/* Custos Detalhados */}
                      <div className="mt-4">
                        <h5 className="text-sm font-medium mb-2">Composição de Custos</h5>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>Ração:</span>
                            <span>R$ {cycle.total_feed_cost.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Insumos:</span>
                            <span>R$ {cycle.total_input_cost.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>PLs:</span>
                            <span>R$ {cycle.total_pl_cost.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Preparação:</span>
                            <span>R$ {cycle.total_preparation_cost.toFixed(2)}</span>
                          </div>
                          <hr className="my-2" />
                          <div className="flex justify-between font-medium">
                            <span>Total:</span>
                            <span>R$ {cycle.total_cost.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-green-600">
                            <span>Receita:</span>
                            <span>R$ {cycle.total_revenue.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Histórico de Despescas */}
                    <div className="space-y-4">
                      <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                        Histórico de Despescas
                      </h4>
                      
                      <div className="space-y-3">
                        {cycle.harvest_history.map((harvest, index) => (
                          <div key={index} className="border rounded-lg p-3">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <Badge 
                                  variant={harvest.type === 'total' ? 'default' : 'secondary'}
                                  className="text-xs"
                                >
                                  {harvest.type === 'total' ? 'Final' : 'Parcial'}
                                </Badge>
                                <span className="text-sm font-medium">
                                  {new Date(harvest.date).toLocaleDateString('pt-BR')}
                                </span>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-3 gap-4 text-sm">
                              <div>
                                <p className="text-muted-foreground">Biomassa</p>
                                <p className="font-medium">{harvest.biomass.toFixed(1)} kg</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">População</p>
                                <p className="font-medium">{harvest.population.toLocaleString()}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Peso Médio</p>
                                <p className="font-medium">{harvest.average_weight.toFixed(1)}g</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Botão para Histórico de Manejos */}
                  <div className="mt-6 pt-4 border-t">
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleManagementHistory(cycle.pond_batch_id);
                      }}
                    >
                      <History className="h-4 w-4 mr-2" />
                      {expandedManagementHistory.has(cycle.pond_batch_id) 
                        ? 'Ocultar Histórico de Manejos' 
                        : 'Ver Histórico de Manejos'
                      }
                    </Button>

                    {/* Histórico de Manejos */}
                    {expandedManagementHistory.has(cycle.pond_batch_id) && (
                      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                        <CycleManagementHistory cycleId={cycle.pond_batch_id} />
                      </div>
                    )}
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        ))}
      </div>
    </div>
  );
}