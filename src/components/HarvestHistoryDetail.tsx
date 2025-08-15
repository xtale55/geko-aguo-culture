import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { QuantityUtils } from '@/lib/quantityUtils';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Loader2, AlertTriangle, CheckCircle, Info, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface HarvestDetailData {
  id: string;
  harvest_date: string;
  harvest_type: 'total' | 'partial';
  biomass_harvested: number;
  population_harvested: number;
  average_weight_at_harvest: number;
  price_per_kg: number | null;
  total_value: number | null;
  notes: string | null;
  expected_population: number | null;
  expected_biomass: number | null;
  actual_mortality_detected: number | null;
  reconciliation_notes: string | null;
  pond_batch: {
    id: string;
    pl_quantity: number;
    stocking_date: string;
    final_survival_rate: number | null;
    cycle_status: string;
    preparation_cost: number | null;
    pond: {
      name: string;
      area: number;
    };
    batch: {
      name: string;
      pl_cost: number;
    };
  };
  feeding_records: Array<{
    actual_amount: number;
    unit_cost: number | null;
  }>;
  input_applications: Array<{
    total_cost: number | null;
  }>;
  biometrics: Array<{
    measurement_date: string;
    average_weight: number;
  }>;
}

interface HarvestHistoryDetailProps {
  harvestId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const HarvestHistoryDetail = ({ harvestId, open, onOpenChange }: HarvestHistoryDetailProps) => {
  const { toast } = useToast();
  const [harvestData, setHarvestData] = useState<HarvestDetailData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (harvestId && open) {
      loadHarvestDetail();
    }
  }, [harvestId, open]);

  const loadHarvestDetail = async () => {
    if (!harvestId) return;

    try {
      setLoading(true);

      // Fetch harvest data with related information
      const { data: harvestRecord, error: harvestError } = await supabase
        .from('harvest_records')
        .select(`
          *,
          pond_batch:pond_batches!inner (
            id,
            pl_quantity,
            stocking_date,
            final_survival_rate,
            cycle_status,
            preparation_cost,
            pond:ponds!inner (
              name,
              area
            ),
            batch:batches!inner (
              name,
              pl_cost
            )
          )
        `)
        .eq('id', harvestId)
        .single();

      if (harvestError) throw harvestError;

      // Fetch feeding records for the cycle
      const { data: feedingRecords } = await supabase
        .from('feeding_records')
        .select('actual_amount, unit_cost')
        .eq('pond_batch_id', harvestRecord.pond_batch.id);

      // Fetch input applications for the cycle
      const { data: inputApplications } = await supabase
        .from('input_applications')
        .select('total_cost')
        .eq('pond_batch_id', harvestRecord.pond_batch.id);

      // Fetch biometry data for growth analysis
      const { data: biometrics } = await supabase
        .from('biometrics')
        .select('measurement_date, average_weight')
        .eq('pond_batch_id', harvestRecord.pond_batch.id)
        .order('measurement_date');

      // Combine all data
      const combinedData: HarvestDetailData = {
        ...harvestRecord,
        harvest_type: harvestRecord.harvest_type as 'total' | 'partial',
        feeding_records: feedingRecords || [],
        input_applications: inputApplications || [],
        biometrics: biometrics || []
      };

      setHarvestData(combinedData);

    } catch (error: any) {
      console.error('Error loading harvest detail:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar detalhes da despesca",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateDOC = (stockingDate: string, harvestDate: string): number => {
    const stocking = new Date(stockingDate);
    const harvest = new Date(harvestDate);
    const diffTime = Math.abs(harvest.getTime() - stocking.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const calculateFCA = (totalFeed: number, biomassHarvested: number): number => {
    if (!biomassHarvested) return 0;
    return totalFeed / biomassHarvested;
  };

  const calculateProductivity = (biomassHarvested: number, pondArea: number): number => {
    return biomassHarvested / pondArea; // kg/m²
  };

  const getReconciliationIcon = (mortalityDetected: number | null) => {
    if (!mortalityDetected) return <CheckCircle className="h-4 w-4 text-green-500" />;
    if (mortalityDetected > 0) return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    return <Info className="h-4 w-4 text-blue-500" />;
  };

  const getVariationIcon = (variation: number) => {
    if (variation > 0.5) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (variation < -0.5) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-gray-500" />;
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!harvestData) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Detalhes da Despesca</DialogTitle>
            <DialogDescription>Nenhum dado encontrado</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  const docDays = calculateDOC(harvestData.pond_batch.stocking_date, harvestData.harvest_date);
  const productivity = calculateProductivity(harvestData.biomass_harvested, harvestData.pond_batch.pond.area);
  
  // Calculate survival rates
  const expectedSurvivalRate = harvestData.expected_population 
    ? (harvestData.expected_population / harvestData.pond_batch.pl_quantity) * 100
    : null;
  const actualSurvivalRate = (harvestData.population_harvested / harvestData.pond_batch.pl_quantity) * 100;

  // Calculate comprehensive cycle metrics
  const plCost = (harvestData.pond_batch.batch.pl_cost * harvestData.pond_batch.pl_quantity) / 1000;
  const preparationCost = harvestData.pond_batch.preparation_cost || 0;
  
  // Calculate feed costs and consumption (Anti-Drift: converter gramas para kg)
  const totalFeedCost = harvestData.feeding_records.reduce((sum, record) => 
    sum + (QuantityUtils.gramsToKg(record.actual_amount) * (record.unit_cost || 0)), 0);
  const totalFeedConsumed = harvestData.feeding_records.reduce((sum, record) => 
    sum + QuantityUtils.gramsToKg(record.actual_amount), 0);
  
  // Calculate input costs
  const totalInputCost = harvestData.input_applications.reduce((sum, input) => 
    sum + (input.total_cost || 0), 0);
  
  // Calculate total costs
  const totalCost = plCost + preparationCost + totalFeedCost + totalInputCost;
  const costPerKg = totalCost / harvestData.biomass_harvested;
  
  // Calculate FCR (Feed Conversion Ratio)
  const fca = calculateFCA(totalFeedConsumed, harvestData.biomass_harvested);
  
  // Calculate financial metrics
  const revenue = harvestData.total_value || 0;
  const profit = revenue - totalCost;
  const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0;
  const roi = totalCost > 0 ? (profit / totalCost) * 100 : 0;
  
  // Calculate density
  const finalDensity = harvestData.population_harvested / harvestData.pond_batch.pond.area;
  
  // Calculate weekly growth
  let weeklyGrowth = 0;
  if (harvestData.biometrics.length >= 2) {
    const firstBiometry = harvestData.biometrics[0];
    const lastBiometry = harvestData.biometrics[harvestData.biometrics.length - 1];
    const daysDiff = (new Date(lastBiometry.measurement_date).getTime() - 
                     new Date(firstBiometry.measurement_date).getTime()) / (1000 * 60 * 60 * 24);
    const weeksDiff = daysDiff / 7;
    weeklyGrowth = weeksDiff > 0 ? (lastBiometry.average_weight - firstBiometry.average_weight) / weeksDiff : 0;
  }
  
  // Performance score calculation
  const getPerformanceScore = () => {
    let score = 0;
    
    // Survival rate (40% weight)
    if (actualSurvivalRate >= 90) score += 40;
    else if (actualSurvivalRate >= 80) score += 30;
    else if (actualSurvivalRate >= 70) score += 20;
    else score += 10;
    
    // FCR (30% weight)
    if (fca <= 1.3) score += 30;
    else if (fca <= 1.5) score += 20;
    else if (fca <= 1.8) score += 15;
    else score += 5;
    
    // Growth rate (30% weight)
    if (weeklyGrowth >= 1.5) score += 30;
    else if (weeklyGrowth >= 1.0) score += 20;
    else if (weeklyGrowth >= 0.5) score += 15;
    else score += 5;
    
    if (score >= 90) return { label: 'Excelente', color: 'bg-green-500' };
    if (score >= 75) return { label: 'Bom', color: 'bg-blue-500' };
    if (score >= 60) return { label: 'Médio', color: 'bg-yellow-500' };
    return { label: 'Ruim', color: 'bg-red-500' };
  };
  
  const performanceScore = getPerformanceScore();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Detalhes da Despesca - {harvestData.pond_batch.pond.name}
            <Badge variant={harvestData.harvest_type === 'total' ? 'default' : 'secondary'}>
              {harvestData.harvest_type === 'total' ? 'Total' : 'Parcial'}
            </Badge>
            {harvestData.harvest_type === 'total' && (
              <Badge variant="outline">Ciclo Finalizado</Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            {harvestData.pond_batch.batch.name} • {format(new Date(harvestData.harvest_date), 'dd/MM/yyyy', { locale: ptBR })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Dados Principais */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Dados da Despesca</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Biomassa</p>
                  <p className="text-xl font-semibold">{harvestData.biomass_harvested.toFixed(1)} kg</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">População</p>
                  <p className="text-xl font-semibold">{harvestData.population_harvested.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Peso Médio</p>
                  <p className="text-xl font-semibold">{harvestData.average_weight_at_harvest.toFixed(1)}g</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">DOC</p>
                  <p className="text-xl font-semibold">{docDays} dias</p>
                </div>
              </div>

              {harvestData.price_per_kg && (
                <Separator className="my-4" />
              )}

              {harvestData.price_per_kg && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Preço/kg</p>
                    <p className="text-lg font-semibold text-green-600">R$ {harvestData.price_per_kg.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Receita Total</p>
                    <p className="text-lg font-semibold text-green-600">R$ {harvestData.total_value?.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Produtividade</p>
                    <p className="text-lg font-semibold">{productivity.toFixed(2)} kg/m²</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Performance do Ciclo */}
          {harvestData.harvest_type === 'total' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Performance do Ciclo
                  <Badge className={`${performanceScore.color} text-white`}>
                    {performanceScore.label}
                  </Badge>
                </CardTitle>
                <CardDescription>
                  Métricas de performance baseadas nos dados reconciliados
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">FCA Real</p>
                    <p className="text-xl font-semibold">{fca.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Custo/kg</p>
                    <p className="text-xl font-semibold">R$ {costPerKg.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Produtividade</p>
                    <p className="text-xl font-semibold">{(productivity * 10000).toFixed(0)} kg/ha</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Densidade Final</p>
                    <p className="text-xl font-semibold">{finalDensity.toFixed(1)} un/m²</p>
                  </div>
                </div>
                <Separator className="my-4" />
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Crescimento Semanal</p>
                    <p className="text-lg font-medium">{weeklyGrowth.toFixed(1)} g/semana</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Sobrevivência Real</p>
                    <p className="text-lg font-medium">{actualSurvivalRate.toFixed(1)}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Análise de Custos */}
          {harvestData.harvest_type === 'total' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Análise de Custos</CardTitle>
                <CardDescription>
                  Detalhamento completo dos custos do ciclo
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 bg-muted/30 rounded-lg">
                      <p className="text-sm text-muted-foreground">Custo PLs</p>
                      <p className="text-lg font-medium">R$ {plCost.toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">
                        {(harvestData.pond_batch.pl_quantity / 1000).toFixed(0)}k PLs × R$ {harvestData.pond_batch.batch.pl_cost.toFixed(2)}
                      </p>
                    </div>
                    <div className="p-4 bg-muted/30 rounded-lg">
                      <p className="text-sm text-muted-foreground">Preparação</p>
                      <p className="text-lg font-medium">R$ {preparationCost.toFixed(2)}</p>
                    </div>
                    <div className="p-4 bg-muted/30 rounded-lg">
                      <p className="text-sm text-muted-foreground">Ração</p>
                      <p className="text-lg font-medium">R$ {totalFeedCost.toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">
                        {totalFeedConsumed.toFixed(1)} kg consumidos
                      </p>
                    </div>
                    <div className="p-4 bg-muted/30 rounded-lg">
                      <p className="text-sm text-muted-foreground">Insumos</p>
                      <p className="text-lg font-medium">R$ {totalInputCost.toFixed(2)}</p>
                    </div>
                  </div>
                  <Separator />
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-primary/10 rounded-lg">
                      <p className="text-sm text-muted-foreground">Custo Total</p>
                      <p className="text-2xl font-bold text-primary">R$ {totalCost.toFixed(2)}</p>
                    </div>
                    <div className="p-4 bg-primary/10 rounded-lg">
                      <p className="text-sm text-muted-foreground">Custo por Kg</p>
                      <p className="text-2xl font-bold text-primary">R$ {costPerKg.toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Resultado Financeiro */}
          {harvestData.harvest_type === 'total' && harvestData.price_per_kg && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Resultado Financeiro</CardTitle>
                <CardDescription>
                  Análise completa de receita, custos e lucratividade
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-sm text-green-700">Receita Total</p>
                      <p className="text-2xl font-bold text-green-800">R$ {revenue.toFixed(2)}</p>
                      <p className="text-xs text-green-600">
                        {harvestData.biomass_harvested.toFixed(1)} kg × R$ {harvestData.price_per_kg.toFixed(2)}
                      </p>
                    </div>
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm text-red-700">Custo Total</p>
                      <p className="text-2xl font-bold text-red-800">R$ {totalCost.toFixed(2)}</p>
                    </div>
                    <div className={`p-4 border rounded-lg ${profit >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                      <p className={`text-sm ${profit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                        {profit >= 0 ? 'Lucro' : 'Prejuízo'}
                      </p>
                      <p className={`text-2xl font-bold ${profit >= 0 ? 'text-green-800' : 'text-red-800'}`}>
                        R$ {Math.abs(profit).toFixed(2)}
                      </p>
                    </div>
                  </div>
                  <Separator />
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Margem de Lucro</p>
                      <p className={`text-xl font-semibold ${profitMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {profitMargin.toFixed(1)}%
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">ROI do Ciclo</p>
                      <p className={`text-xl font-semibold ${roi >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {roi.toFixed(1)}%
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Preço Realizado</p>
                      <p className="text-xl font-semibold">R$ {harvestData.price_per_kg.toFixed(2)}/kg</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Reconciliação de Dados */}
          {harvestData.harvest_type === 'total' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {getReconciliationIcon(harvestData.actual_mortality_detected)}
                  Reconciliação de Dados
                </CardTitle>
                <CardDescription>
                  Comparação entre dados esperados vs. dados reais da despesca
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Comparação de População */}
                  <div className="grid grid-cols-3 gap-4 p-4 bg-muted/30 rounded-lg">
                    <div>
                      <p className="text-sm text-muted-foreground">População Esperada</p>
                      <p className="text-lg font-medium">{harvestData.expected_population?.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">População Real</p>
                      <p className="text-lg font-medium">{harvestData.population_harvested.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Diferença</p>
                      <p className={`text-lg font-medium flex items-center gap-1 ${
                        (harvestData.actual_mortality_detected || 0) > 0 ? 'text-red-600' : 
                        (harvestData.actual_mortality_detected || 0) < 0 ? 'text-green-600' : 'text-gray-600'
                      }`}>
                        {harvestData.actual_mortality_detected ? (
                          <>
                            {harvestData.actual_mortality_detected > 0 ? '-' : '+'}
                            {Math.abs(harvestData.actual_mortality_detected).toLocaleString()}
                          </>
                        ) : '0'}
                      </p>
                    </div>
                  </div>

                  {/* Comparação de Biomassa */}
                  <div className="grid grid-cols-3 gap-4 p-4 bg-muted/30 rounded-lg">
                    <div>
                      <p className="text-sm text-muted-foreground">Biomassa Esperada</p>
                      <p className="text-lg font-medium">{harvestData.expected_biomass?.toFixed(1)} kg</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Biomassa Real</p>
                      <p className="text-lg font-medium">{harvestData.biomass_harvested.toFixed(1)} kg</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Variação</p>
                      <p className={`text-lg font-medium flex items-center gap-1 ${
                        (harvestData.biomass_harvested - (harvestData.expected_biomass || 0)) > 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {getVariationIcon(harvestData.biomass_harvested - (harvestData.expected_biomass || 0))}
                        {(harvestData.biomass_harvested - (harvestData.expected_biomass || 0)) > 0 ? '+' : ''}
                        {(harvestData.biomass_harvested - (harvestData.expected_biomass || 0)).toFixed(1)} kg
                      </p>
                    </div>
                  </div>

                  {/* Taxa de Sobrevivência */}
                  <div className="grid grid-cols-3 gap-4 p-4 bg-muted/30 rounded-lg">
                    <div>
                      <p className="text-sm text-muted-foreground">Sobrevivência Esperada</p>
                      <p className="text-lg font-medium">{expectedSurvivalRate?.toFixed(1)}%</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Sobrevivência Real</p>
                      <p className="text-lg font-medium">{actualSurvivalRate.toFixed(1)}%</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Diferença</p>
                      <p className={`text-lg font-medium ${
                        (actualSurvivalRate - (expectedSurvivalRate || 0)) > 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {(actualSurvivalRate - (expectedSurvivalRate || 0)) > 0 ? '+' : ''}
                        {(actualSurvivalRate - (expectedSurvivalRate || 0)).toFixed(1)}%
                      </p>
                    </div>
                  </div>

                  {/* Notas de Reconciliação */}
                  {harvestData.reconciliation_notes && (
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <h4 className="font-medium text-blue-900 mb-2">Análise Automática</h4>
                      <p className="text-sm text-blue-800">{harvestData.reconciliation_notes}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Dados do Ciclo */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Informações do Ciclo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">PLs Estocadas</p>
                  <p className="text-lg font-medium">{harvestData.pond_batch.pl_quantity.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Data de Estocagem</p>
                  <p className="text-lg font-medium">
                    {format(new Date(harvestData.pond_batch.stocking_date), 'dd/MM/yyyy', { locale: ptBR })}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Área do Viveiro</p>
                  <p className="text-lg font-medium">{harvestData.pond_batch.pond.area} m²</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge variant={harvestData.pond_batch.cycle_status === 'completed' ? 'default' : 'secondary'}>
                    {harvestData.pond_batch.cycle_status === 'completed' ? 'Finalizado' : 'Ativo'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Observações */}
          {harvestData.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Observações</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed">{harvestData.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default HarvestHistoryDetail;