import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { QuantityUtils } from '@/lib/quantityUtils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Fish, Calendar, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import HarvestHistoryDetail from './HarvestHistoryDetail';

interface PondBatch {
  id: string;
  pond_name: string;
  batch_name: string;
  current_population: number;
  stocking_date: string;
  latest_average_weight?: number;
  latest_uniformity?: number;
  latest_measurement_date?: string;
}

interface HarvestRecord {
  id: string;
  harvest_date: string;
  harvest_type: 'total' | 'partial';
  biomass_harvested: number;
  population_harvested: number;
  price_per_kg: number | null;
  total_value: number | null;
  notes: string | null;
  pond_name: string;
  batch_name: string;
  average_weight_at_harvest?: number;
}

const HarvestTab = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [activePondBatches, setActivePondBatches] = useState<PondBatch[]>([]);
  const [harvestRecords, setHarvestRecords] = useState<HarvestRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPondBatch, setSelectedPondBatch] = useState<PondBatch | null>(null);
  const [selectedHarvestId, setSelectedHarvestId] = useState<string | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  // Form states
  const [harvestDate, setHarvestDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [harvestType, setHarvestType] = useState<'total' | 'partial'>('partial');
  const [biomassHarvested, setBiomassHarvested] = useState('');
  const [averageWeightAtHarvest, setAverageWeightAtHarvest] = useState('');
  const [populationHarvested, setPopulationHarvested] = useState('');
  const [pricePerKg, setPricePerKg] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load active pond batches with latest biometry data
      const { data: pondBatchesData, error: pondBatchesError } = await supabase
        .from('pond_batches')
        .select(`
          id,
          current_population,
          stocking_date,
          ponds!inner (
            id,
            name,
            status
          ),
          batches!inner (
            name
          ),
          biometrics (
            average_weight,
            uniformity,
            measurement_date
          )
        `)
        .eq('ponds.status', 'in_use')
        .gt('current_population', 0)
        .order('measurement_date', { foreignTable: 'biometrics', ascending: false });

      if (pondBatchesError) throw pondBatchesError;

      const activeBatches: PondBatch[] = [];
      pondBatchesData?.forEach((pb: any) => {
        // Get the latest biometry record (first one due to ordering)
        const latestBiometry = pb.biometrics && pb.biometrics.length > 0 ? pb.biometrics[0] : null;
        
        activeBatches.push({
          id: pb.id,
          pond_name: pb.ponds.name,
          batch_name: pb.batches.name,
          current_population: pb.current_population,
          stocking_date: pb.stocking_date,
          latest_average_weight: latestBiometry?.average_weight || undefined,
          latest_uniformity: latestBiometry?.uniformity || undefined,
          latest_measurement_date: latestBiometry?.measurement_date || undefined
        });
      });

      setActivePondBatches(activeBatches.sort((a, b) => a.pond_name.localeCompare(b.pond_name)));

      // Load harvest records with proper joins
      const { data: harvests, error: harvestsError } = await supabase
        .from('harvest_records')
        .select(`
          id,
          harvest_date,
          harvest_type,
          biomass_harvested,
          population_harvested,
          price_per_kg,
          total_value,
          notes,
          average_weight_at_harvest,
          pond_batches!inner (
            ponds!inner (name),
            batches!inner (name)
          )
        `)
        .order('harvest_date', { ascending: false })
        .limit(20);

      if (harvestsError) throw harvestsError;

      const formattedHarvests: HarvestRecord[] = harvests?.map((h: any) => ({
        id: h.id,
          harvest_date: h.harvest_date,
        harvest_type: h.harvest_type as 'total' | 'partial',
        biomass_harvested: h.biomass_harvested,
        population_harvested: h.population_harvested,
        price_per_kg: h.price_per_kg,
        total_value: h.total_value,
        notes: h.notes,
        pond_name: h.pond_batches.ponds.name,
        batch_name: h.pond_batches.batches.name,
        average_weight_at_harvest: h.average_weight_at_harvest
      })) || [];

      setHarvestRecords(formattedHarvests);

    } catch (error: any) {
      console.error('Error loading data:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar dados",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getDefaultPrice = (averageWeight: number): number => {
    // Get price table from localStorage or use default
    const storedPriceTable = localStorage.getItem('priceTable');
    const basePrice = storedPriceTable ? parseFloat(storedPriceTable) : 19;
    
    // Calculate price based on weight: basePrice + (weight - 10)
    const calculatedPrice = basePrice + (averageWeight - 10);
    return Math.max(calculatedPrice, 0); // Ensure price is not negative
  };

  const calculateShrimpCount = (biomass: number, averageWeight: number): number => {
    if (!biomass || !averageWeight) return 0;
    return Math.round((biomass * 1000) / averageWeight); // biomass in kg to grams, divided by weight in grams
  };

  const openHarvestDialog = (pondBatch: PondBatch) => {
    setSelectedPondBatch(pondBatch);
    setDialogOpen(true);
    // Reset form
    setHarvestDate(format(new Date(), 'yyyy-MM-dd'));
    setHarvestType('partial');
    setBiomassHarvested('');
    
    // Pre-fill average weight with latest biometry data
    const defaultWeight = pondBatch.latest_average_weight || 0;
    setAverageWeightAtHarvest(defaultWeight.toString());
    
    setPopulationHarvested('');
    
    // Set default price based on weight
    if (defaultWeight > 0) {
      setPricePerKg(getDefaultPrice(defaultWeight).toFixed(2));
    } else {
      setPricePerKg('19.00');
    }
    
    setNotes('');
  };

  const handleHarvestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedPondBatch) return;

    try {
      const biomassValue = parseFloat(biomassHarvested);
      const averageWeightValue = parseFloat(averageWeightAtHarvest);
      const populationValue = calculateShrimpCount(biomassValue, averageWeightValue);
      const priceValue = pricePerKg ? parseFloat(pricePerKg) : null;
      const totalValue = priceValue ? biomassValue * priceValue : null;

      // Calculate expected values for reconciliation
      const expectedPopulation = selectedPondBatch.current_population;
      const expectedBiomass = (expectedPopulation * (selectedPondBatch.latest_average_weight || 0)) / 1000;
      const actualMortalityDetected = expectedPopulation - populationValue;

      // Generate reconciliation notes
      let reconciliationNotes = '';
      if (harvestType === 'total') {
        const mortalityDifference = actualMortalityDetected;
        const expectedSurvivalRate = (expectedPopulation / selectedPondBatch.current_population) * 100; // This should be calculated from original PL quantity
        const actualSurvivalRate = (populationValue / selectedPondBatch.current_population) * 100; // This should be calculated from original PL quantity
        
        if (mortalityDifference > 0) {
          reconciliationNotes = `Mortalidade adicional detectada: ${mortalityDifference.toLocaleString()} camarões. População real menor que esperada.`;
        } else if (mortalityDifference < 0) {
          reconciliationNotes = `População real maior que esperada em ${Math.abs(mortalityDifference).toLocaleString()} camarões. Possível erro na biometria anterior.`;
        } else {
          reconciliationNotes = `Dados da despesca conferem com a biometria.`;
        }

        // Add weight comparison
        const expectedWeight = selectedPondBatch.latest_average_weight || 0;
        const weightDifference = averageWeightValue - expectedWeight;
        if (Math.abs(weightDifference) > 0.5) {
          reconciliationNotes += ` Variação de peso: ${weightDifference > 0 ? '+' : ''}${weightDifference.toFixed(1)}g vs biometria.`;
        }
      }

      // Validate harvest amounts
      if (harvestType === 'total') {
        if (populationValue > selectedPondBatch.current_population) {
          toast({
            title: "Erro",
            description: "Quantidade de despesca não pode ser maior que a população atual",
            variant: "destructive",
          });
          return;
        }
      } else {
        if (populationValue >= selectedPondBatch.current_population) {
          toast({
            title: "Erro",
            description: "Para despesca parcial, a quantidade deve ser menor que a população total",
            variant: "destructive",
          });
          return;
        }
      }

      // Insert harvest record with reconciliation data
      const { error: harvestError } = await supabase
        .from('harvest_records')
        .insert({
          pond_batch_id: selectedPondBatch.id,
          harvest_date: harvestDate,
          harvest_type: harvestType,
          biomass_harvested: biomassValue,
          population_harvested: populationValue,
          price_per_kg: priceValue,
          total_value: totalValue,
          notes: notes || null,
          average_weight_at_harvest: averageWeightValue,
          expected_population: expectedPopulation,
          expected_biomass: expectedBiomass,
          actual_mortality_detected: actualMortalityDetected,
          reconciliation_notes: reconciliationNotes
        });

      if (harvestError) throw harvestError;

      // Update pond_batch and pond status based on harvest type
      if (harvestType === 'total') {
        // For total harvest, mark pond_batch as completed and pond as free
        const { error: updatePondBatchError } = await supabase
          .from('pond_batches')
          .update({ 
            current_population: 0,
            cycle_status: 'completed',
            final_population: populationValue,
            final_biomass: biomassValue,
            final_average_weight: averageWeightValue,
            final_survival_rate: (populationValue / selectedPondBatch.current_population) * 100
          })
          .eq('id', selectedPondBatch.id);

        if (updatePondBatchError) throw updatePondBatchError;

        // Update pond status to free
        const { data: pondData, error: pondQueryError } = await supabase
          .from('pond_batches')
          .select('pond_id')
          .eq('id', selectedPondBatch.id)
          .single();

        if (pondQueryError) throw pondQueryError;

        const { error: updatePondError } = await supabase
          .from('ponds')
          .update({ status: 'free' })
          .eq('id', pondData.pond_id);

        if (updatePondError) throw updatePondError;

      } else {
        // For partial harvests, just update population
        const newPopulation = selectedPondBatch.current_population - populationValue;
        
        const { error: updateError } = await supabase
          .from('pond_batches')
          .update({ current_population: newPopulation })
          .eq('id', selectedPondBatch.id);

        if (updateError) throw updateError;
      }

      toast({
        title: "Sucesso",
        description: harvestType === 'total' 
          ? "Ciclo finalizado com sucesso. Dados de reconciliação calculados automaticamente."
          : "Despesca parcial registrada com sucesso.",
      });

      setDialogOpen(false);
      loadData();

    } catch (error: any) {
      console.error('Error submitting harvest:', error);
      toast({
        title: "Erro",
        description: "Erro ao registrar despesca",
        variant: "destructive",
      });
    }
  };

  const calculateDOC = (stockingDate: string): number => {
    const stocking = new Date(stockingDate);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - stocking.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const calculateBiomass = (population: number, averageWeight?: number): number => {
    if (!averageWeight) return 0;
    return (population * averageWeight) / 1000; // Convert to kg
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Active Pond Batches */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Fish className="h-5 w-5" />
            Viveiros Ativos para Despesca
          </CardTitle>
          <CardDescription>
            Selecione um viveiro para realizar a despesca
          </CardDescription>
        </CardHeader>
        <CardContent>
          {activePondBatches.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Nenhum viveiro ativo encontrado
            </p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {activePondBatches.map((pondBatch) => (
                <Card key={pondBatch.id} className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">{pondBatch.pond_name}</CardTitle>
                    <CardDescription>{pondBatch.batch_name}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex justify-between">
                        <span>População:</span>
                        <span className="font-medium">{pondBatch.current_population.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>DOC:</span>
                        <span className="font-medium">{calculateDOC(pondBatch.stocking_date)} dias</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Biomassa:</span>
                        <span className="font-medium">
                          {pondBatch.latest_average_weight 
                            ? `${calculateBiomass(pondBatch.current_population, pondBatch.latest_average_weight).toFixed(1)} kg`
                            : 'N/A'
                          }
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Peso médio:</span>
                        <span className="font-medium">
                          {pondBatch.latest_average_weight 
                            ? `${pondBatch.latest_average_weight.toFixed(1)}g`
                            : 'N/A'
                          }
                        </span>
                      </div>
                      <div className="flex justify-between col-span-2">
                        <span>Uniformidade:</span>
                        <span className="font-medium">
                          {pondBatch.latest_uniformity 
                            ? `${pondBatch.latest_uniformity.toFixed(1)}%`
                            : 'N/A'
                          }
                        </span>
                      </div>
                      {pondBatch.latest_measurement_date && (
                        <div className="flex justify-between col-span-2 text-xs text-muted-foreground">
                          <span>Última biometria:</span>
                          <span>{format(new Date(pondBatch.latest_measurement_date), 'dd/MM/yyyy', { locale: ptBR })}</span>
                        </div>
                      )}
                    </div>
                    <Button 
                      onClick={() => openHarvestDialog(pondBatch)}
                      className="w-full mt-3"
                    >
                      Registrar Despesca
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Harvest Records History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Histórico de Despescas
          </CardTitle>
          <CardDescription>
            Registros recentes de despescas realizadas
          </CardDescription>
        </CardHeader>
        <CardContent>
          {harvestRecords.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Nenhuma despesca registrada
            </p>
          ) : (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {harvestRecords.map((record) => (
                <Card 
                  key={record.id} 
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => {
                    setSelectedHarvestId(record.id);
                    setDetailDialogOpen(true);
                  }}
                >
                  <CardContent className="pt-4">
                    <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-4">
                      <div>
                        <p className="text-sm font-medium">{record.pond_name}</p>
                        <p className="text-xs text-muted-foreground">{record.batch_name}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {format(new Date(record.harvest_date), 'dd/MM/yyyy', { locale: ptBR })}
                        </p>
                        <p className="text-xs text-muted-foreground capitalize">
                          Despesca {record.harvest_type}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {record.biomass_harvested.toFixed(1)} kg
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {record.population_harvested.toLocaleString()} camarões
                        </p>
                      </div>
                      <div>
                        {record.total_value && (
                          <>
                            <p className="text-sm font-medium text-green-600">
                              R$ {record.total_value.toFixed(2)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              R$ {record.price_per_kg?.toFixed(2)}/kg
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                    {record.notes && (
                      <p className="text-xs text-muted-foreground mt-2 italic">
                        {record.notes}
                      </p>
                    )}
                    <p className="text-xs text-blue-600 mt-2 font-medium">
                      Clique para ver detalhes completos do ciclo
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Harvest Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Registrar Despesca</DialogTitle>
            <DialogDescription>
              {selectedPondBatch && (
                <>
                  {selectedPondBatch.pond_name} - {selectedPondBatch.batch_name}
                  <br />
                  População atual: {selectedPondBatch.current_population.toLocaleString()} camarões
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto flex-1">
            <form id="harvest-form" onSubmit={handleHarvestSubmit} className="space-y-4 p-1">
            <div>
              <Label htmlFor="harvest_date">Data da Despesca</Label>
              <Input
                id="harvest_date"
                type="date"
                value={harvestDate}
                onChange={(e) => setHarvestDate(e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="harvest_type">Tipo de Despesca</Label>
              <Select value={harvestType} onValueChange={(value: 'total' | 'partial') => setHarvestType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="partial">Parcial</SelectItem>
                  <SelectItem value="total">Total</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="biomass_harvested">Biomassa Despescada (kg)</Label>
              <Input
                id="biomass_harvested"
                type="number"
                step="0.1"
                value={biomassHarvested}
                onChange={(e) => {
                  setBiomassHarvested(e.target.value);
                  // Recalculate price when biomass changes
                  const weight = parseFloat(averageWeightAtHarvest);
                  if (weight > 0) {
                    setPricePerKg(getDefaultPrice(weight).toFixed(2));
                  }
                }}
                required
              />
            </div>

            <div>
              <Label htmlFor="average_weight_at_harvest">Peso Médio na Despesca (g)</Label>
              <Input
                id="average_weight_at_harvest"
                type="number"
                step="0.1"
                value={averageWeightAtHarvest}
                onChange={(e) => {
                  setAverageWeightAtHarvest(e.target.value);
                  // Recalculate price when weight changes
                  const weight = parseFloat(e.target.value);
                  if (weight > 0) {
                    setPricePerKg(getDefaultPrice(weight).toFixed(2));
                  }
                }}
                required
              />
            </div>

            <div>
              <Label htmlFor="population_harvested">Quantidade de Camarões (calculado)</Label>
              <Input
                id="population_harvested"
                type="number"
                value={calculateShrimpCount(parseFloat(biomassHarvested) || 0, parseFloat(averageWeightAtHarvest) || 0)}
                readOnly
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Calculado automaticamente: Biomassa ÷ Peso Médio
              </p>
            </div>

            <div>
              <Label htmlFor="price_per_kg">Preço por kg (R$) - Opcional</Label>
              <Input
                id="price_per_kg"
                type="number"
                step="0.01"
                value={pricePerKg}
                onChange={(e) => setPricePerKg(e.target.value)}
                placeholder="Ex: 12.50"
              />
            </div>

            <div>
              <Label htmlFor="notes">Observações</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Observações sobre a despesca..."
                rows={3}
              />
            </div>

            </form>
          </div>
          <div className="flex gap-2 pt-4 border-t bg-background flex-shrink-0">
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" form="harvest-form">
              Registrar Despesca
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Harvest History Detail Dialog */}
      <HarvestHistoryDetail
        harvestId={selectedHarvestId}
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
      />
    </div>
  );
};

export default HarvestTab;