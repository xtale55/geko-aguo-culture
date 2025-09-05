import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { QuantityUtils } from '@/lib/quantityUtils';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Loader2, AlertTriangle, CheckCircle, Info, TrendingUp, TrendingDown, Minus, Edit, Save, X } from 'lucide-react';
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
  allocated_feed_cost: number | null;
  allocated_input_cost: number | null;
  allocated_pl_cost: number | null;
  allocated_preparation_cost: number | null;
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
  const [isEditing, setIsEditing] = useState(false);
  
  // Editable fields state
  const [editData, setEditData] = useState({
    harvest_date: '',
    harvest_type: 'partial' as 'total' | 'partial',
    biomass_harvested: '',
    average_weight_at_harvest: '',
    price_per_kg: '',
    notes: ''
  });

  useEffect(() => {
    if (harvestId && open) {
      loadHarvestDetail();
    }
  }, [harvestId, open]);

  useEffect(() => {
    if (harvestData) {
      setEditData({
        harvest_date: harvestData.harvest_date,
        harvest_type: harvestData.harvest_type,
        biomass_harvested: harvestData.biomass_harvested.toString(),
        average_weight_at_harvest: harvestData.average_weight_at_harvest?.toString() || '',
        price_per_kg: harvestData.price_per_kg?.toString() || '',
        notes: harvestData.notes || ''
      });
    }
  }, [harvestData]);

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

  const handleEditSave = async () => {
    if (!harvestData) return;

    try {
      const biomassValue = parseFloat(editData.biomass_harvested);
      const averageWeightValue = parseFloat(editData.average_weight_at_harvest);
      const priceValue = editData.price_per_kg ? parseFloat(editData.price_per_kg) : null;
      const totalValue = priceValue ? biomassValue * priceValue : null;
      
      // Calculate new population based on new biomass and weight
      const newPopulation = averageWeightValue > 0 ? Math.round((biomassValue * 1000) / averageWeightValue) : 0;

      const { error } = await supabase
        .from('harvest_records')
        .update({
          harvest_date: editData.harvest_date,
          harvest_type: editData.harvest_type,
          biomass_harvested: biomassValue,
          average_weight_at_harvest: averageWeightValue,
          population_harvested: newPopulation,
          price_per_kg: priceValue,
          total_value: totalValue,
          notes: editData.notes || null
        })
        .eq('id', harvestData.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Dados da despesca atualizados com sucesso",
      });

      setIsEditing(false);
      loadHarvestDetail(); // Reload data
    } catch (error: any) {
      console.error('Error updating harvest:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar dados da despesca",
        variant: "destructive",
      });
    }
  };

  const handleEditCancel = () => {
    setIsEditing(false);
    // Reset to original data
    if (harvestData) {
      setEditData({
        harvest_date: harvestData.harvest_date,
        harvest_type: harvestData.harvest_type,
        biomass_harvested: harvestData.biomass_harvested.toString(),
        average_weight_at_harvest: harvestData.average_weight_at_harvest?.toString() || '',
        price_per_kg: harvestData.price_per_kg?.toString() || '',
        notes: harvestData.notes || ''
      });
    }
  };

  const calculateDOC = (stockingDate: string, harvestDate: string): number => {
    const stocking = new Date(stockingDate);
    const harvest = new Date(harvestDate);
    const diffTime = Math.abs(harvest.getTime() - stocking.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const calculateFCA = (totalFeed: number, biomassHarvested: number, expectedBiomass?: number | null): number => {
    if (!biomassHarvested) return 0;
    
    // Para despesca parcial, calcular proporcionalmente
    if (expectedBiomass && expectedBiomass > 0 && biomassHarvested < expectedBiomass) {
      const proportionalFeed = totalFeed * (biomassHarvested / expectedBiomass);
      return proportionalFeed / biomassHarvested;
    }
    
    return totalFeed / biomassHarvested;
  };

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
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
  
  // Calculate survival rates correctly for partial harvests
  const expectedSurvivalRate = harvestData.expected_population 
    ? (harvestData.expected_population / harvestData.pond_batch.pl_quantity) * 100
    : null;
  
  // For any harvest type, survival rate is based on cumulative harvested population vs PLs stocked
  // This shows actual harvest efficiency, not mortality
  const cumulativeSurvivalRate = harvestData.harvest_type === 'total' 
    ? harvestData.pond_batch.final_survival_rate || 
      (harvestData.population_harvested / harvestData.pond_batch.pl_quantity) * 100
    : (harvestData.population_harvested / harvestData.pond_batch.pl_quantity) * 100;

  // Calculate comprehensive cycle metrics
  const plCost = (harvestData.pond_batch.batch.pl_cost * harvestData.pond_batch.pl_quantity) / 1000;
  const preparationCost = harvestData.pond_batch.preparation_cost || 0;
  
  // Calculate costs - use allocated costs for partial harvests
  const totalFeedCost = harvestData.harvest_type === 'partial' && harvestData.allocated_feed_cost 
    ? harvestData.allocated_feed_cost
    : harvestData.feeding_records.reduce((sum, record) => 
        sum + (QuantityUtils.gramsToKg(record.actual_amount) * (record.unit_cost || 0)), 0);
  
  const totalInputCost = harvestData.harvest_type === 'partial' && harvestData.allocated_input_cost
    ? harvestData.allocated_input_cost
    : harvestData.input_applications.reduce((sum, input) => 
        sum + (input.total_cost || 0), 0);

  const allocatedPlCost = harvestData.harvest_type === 'partial' && harvestData.allocated_pl_cost
    ? harvestData.allocated_pl_cost
    : plCost;

  const allocatedPrepCost = harvestData.harvest_type === 'partial' && harvestData.allocated_preparation_cost
    ? harvestData.allocated_preparation_cost
    : preparationCost;
  
  // Calculate total costs for this harvest
  const totalCost = allocatedPlCost + allocatedPrepCost + totalFeedCost + totalInputCost;
  const costPerKg = totalCost / harvestData.biomass_harvested;
  
  // Calculate total feed consumed for the entire cycle
  const totalCycleFeedConsumed = harvestData.feeding_records.reduce((sum, record) => 
    sum + QuantityUtils.gramsToKg(record.actual_amount), 0);
  
  // Calculate FCR for this harvest using proportional feed calculation
  const fca = calculateFCA(totalCycleFeedConsumed, harvestData.biomass_harvested, harvestData.expected_biomass);
  
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
    if (cumulativeSurvivalRate >= 90) score += 40;
    else if (cumulativeSurvivalRate >= 80) score += 30;
    else if (cumulativeSurvivalRate >= 70) score += 20;
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
          <DialogTitle className="flex items-center gap-2 justify-between">
            <div className="flex items-center gap-2">
              Detalhes da Despesca - {harvestData.pond_batch.pond.name}
              <Badge variant={harvestData.harvest_type === 'total' ? 'default' : 'secondary'}>
                {harvestData.harvest_type === 'total' ? 'Total' : 'Parcial'}
              </Badge>
              {harvestData.harvest_type === 'total' && (
                <Badge variant="outline">Ciclo Finalizado</Badge>
              )}
            </div>
            <div className="flex gap-2">
              {isEditing ? (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleEditCancel}
                    className="flex items-center gap-1"
                  >
                    <X className="h-4 w-4" />
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleEditSave}
                    className="flex items-center gap-1"
                  >
                    <Save className="h-4 w-4" />
                    Salvar
                  </Button>
                </>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-1"
                >
                  <Edit className="h-4 w-4" />
                  Editar
                </Button>
              )}
            </div>
          </DialogTitle>
          <DialogDescription>
            {harvestData.pond_batch.batch.name} • {format(new Date(harvestData.harvest_date), 'dd/MM/yyyy', { locale: ptBR })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informações do Ciclo */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Informações do Ciclo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Data da Despesca</p>
                  {isEditing ? (
                    <Input
                      type="date"
                      value={editData.harvest_date}
                      onChange={(e) => setEditData({ ...editData, harvest_date: e.target.value })}
                    />
                  ) : (
                    <p className="font-medium">
                      {format(new Date(harvestData.harvest_date), 'dd/MM/yyyy', { locale: ptBR })}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Tipo</p>
                  {isEditing ? (
                    <Select value={editData.harvest_type} onValueChange={(value: 'total' | 'partial') => setEditData({ ...editData, harvest_type: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="partial">Parcial</SelectItem>
                        <SelectItem value="total">Total</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge variant={harvestData.harvest_type === 'total' ? 'default' : 'secondary'}>
                      Despesca {harvestData.harvest_type === 'total' ? 'Total' : 'Parcial'}
                    </Badge>
                  )}
                </div>
              </div>
              
              <Separator className="my-4" />
              
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
                      <p className="text-lg font-medium">{cumulativeSurvivalRate.toFixed(1)}%</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Variação</p>
                      <p className={`text-lg font-medium flex items-center gap-1 ${
                        (cumulativeSurvivalRate - (expectedSurvivalRate || 0)) > 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {getVariationIcon(cumulativeSurvivalRate - (expectedSurvivalRate || 0))}
                        {(cumulativeSurvivalRate - (expectedSurvivalRate || 0)) > 0 ? '+' : ''}
                        {(cumulativeSurvivalRate - (expectedSurvivalRate || 0)).toFixed(1)}pp
                      </p>
                    </div>
                  </div>

                  {/* Notas de Reconciliação */}
                  {harvestData.reconciliation_notes && (
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm font-medium text-blue-900 mb-1">Análise Automática</p>
                      <p className="text-sm text-blue-800">{harvestData.reconciliation_notes}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Métricas da Despesca */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Métricas da Despesca</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-6 gap-6">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">DOC (Dias)</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {docDays}
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Peso Médio (g)</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {harvestData.average_weight_at_harvest?.toFixed(1) || 'N/A'}
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Biomassa Despescada (kg)</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {harvestData.biomass_harvested.toFixed(1)}
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">FCA</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {fca.toFixed(2)}
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Custo/KG</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {formatCurrency(costPerKg)}
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Crescimento Semanal (g)</p>
                  <p className="text-2xl font-bold text-indigo-600">
                    {weeklyGrowth.toFixed(1)}
                  </p>
                </div>
                {harvestData.harvest_type === 'total' && (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Taxa de Sobrevivência (%)</p>
                    <p className="text-2xl font-bold text-emerald-600">
                      {cumulativeSurvivalRate.toFixed(1)}%
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Análise de Custos */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Análise de Custos{harvestData.harvest_type === 'partial' && ' (Alocados para esta despesca)'}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">PL</p>
                  <p className="text-xl font-bold text-blue-600">
                    {formatCurrency(allocatedPlCost)}
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Preparação</p>
                  <p className="text-xl font-bold text-green-600">
                    {formatCurrency(allocatedPrepCost)}
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Ração</p>
                  <p className="text-xl font-bold text-orange-600">
                    {formatCurrency(totalFeedCost)}
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Insumos</p>
                  <p className="text-xl font-bold text-purple-600">
                    {formatCurrency(totalInputCost)}
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Custo Total</p>
                  <p className="text-xl font-bold text-red-600">
                    {formatCurrency(totalCost)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Dados da Despesca */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Dados da Despesca</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-6 gap-6">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Biomassa Despescada</p>
                  {isEditing ? (
                    <Input
                      type="number"
                      step="0.1"
                      value={editData.biomass_harvested}
                      onChange={(e) => setEditData({ ...editData, biomass_harvested: e.target.value })}
                      className="text-lg font-bold"
                    />
                  ) : (
                    <p className="text-2xl font-bold text-blue-600">
                      {harvestData.biomass_harvested.toFixed(1)} kg
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">População Despescada</p>
                  <p className="text-2xl font-bold text-green-600">
                    {isEditing 
                      ? Math.round((parseFloat(editData.biomass_harvested) * 1000) / parseFloat(editData.average_weight_at_harvest) || 0).toLocaleString()
                      : harvestData.population_harvested.toLocaleString()
                    }
                  </p>
                  {isEditing && (
                    <p className="text-xs text-muted-foreground">Calculado automaticamente</p>
                  )}
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Peso Médio</p>
                  {isEditing ? (
                    <Input
                      type="number"
                      step="0.1"
                      value={editData.average_weight_at_harvest}
                      onChange={(e) => setEditData({ ...editData, average_weight_at_harvest: e.target.value })}
                      className="text-lg font-bold"
                    />
                  ) : (
                    <p className="text-2xl font-bold text-orange-600">
                      {harvestData.average_weight_at_harvest?.toFixed(1) || 'N/A'}g
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">DOC</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {docDays} dias
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Preço por kg</p>
                  {isEditing ? (
                    <Input
                      type="number"
                      step="0.01"
                      value={editData.price_per_kg}
                      onChange={(e) => setEditData({ ...editData, price_per_kg: e.target.value })}
                      className="text-lg font-bold"
                      placeholder="R$ 0,00"
                    />
                  ) : (
                    <p className="text-2xl font-bold text-green-600">
                      {harvestData.price_per_kg ? formatCurrency(harvestData.price_per_kg) : 'N/A'}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Valor Total</p>
                  <p className="text-2xl font-bold text-green-600">
                    {isEditing 
                      ? formatCurrency(parseFloat(editData.biomass_harvested) * parseFloat(editData.price_per_kg) || 0)
                      : harvestData.total_value ? formatCurrency(harvestData.total_value) : 'N/A'
                    }
                  </p>
                  {isEditing && editData.price_per_kg && (
                    <p className="text-xs text-muted-foreground">Calculado automaticamente</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Resultados Financeiros */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Resultados Financeiros</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Preço por KG</p>
                  <p className="text-xl font-bold text-blue-600">
                    {harvestData.price_per_kg ? formatCurrency(harvestData.price_per_kg) : 'N/A'}
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Receita</p>
                  <p className="text-xl font-bold text-green-600">
                    {formatCurrency(revenue)}
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Custos</p>
                  <p className="text-xl font-bold text-red-600">
                    {formatCurrency(totalCost)}
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Lucro</p>
                  <p className={`text-xl font-bold ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(profit)}
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Margem de Lucro (%)</p>
                  <p className={`text-xl font-bold ${profitMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {profitMargin.toFixed(1)}%
                  </p>
                </div>
              </div>
              
              <Separator className="my-4" />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">ROI (Return on Investment)</p>
                  <p className={`text-xl font-bold ${roi >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {roi.toFixed(1)}%
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Performance Geral</p>
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${performanceScore.color}`}></div>
                    <span className="font-medium">{performanceScore.label}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Observações */}
          <Card>
            <CardHeader>
              <CardTitle>Observações</CardTitle>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <Textarea
                  value={editData.notes}
                  onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                  placeholder="Observações sobre a despesca..."
                  rows={3}
                />
              ) : (
                <p className="text-muted-foreground">
                  {harvestData.notes || 'Nenhuma observação registrada'}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default HarvestHistoryDetail;