import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
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
    pond: {
      name: string;
      area: number;
    };
    batch: {
      name: string;
    };
  };
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

      const { data, error } = await supabase
        .from('harvest_records')
        .select(`
          *,
          pond_batch:pond_batches!inner (
            id,
            pl_quantity,
            stocking_date,
            final_survival_rate,
            cycle_status,
            pond:ponds!inner (
              name,
              area
            ),
            batch:batches!inner (
              name
            )
          )
        `)
        .eq('id', harvestId)
        .single();

      if (error) throw error;

      setHarvestData(data as HarvestDetailData);

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
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