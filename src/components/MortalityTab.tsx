import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Skull, History, Trash2, Settings, Calculator, TrendingUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getCurrentDateForInput, formatDateForDisplay } from '@/lib/utils';

interface PondWithBatch {
  id: string;
  name: string;
  area: number;
  status: string;
  current_batch?: {
    id: string;
    batch_name: string;
    stocking_date: string;
    current_population: number;
    initial_population: number;
  };
}

interface MortalityRecord {
  id: string;
  pond_batch_id: string;
  record_date: string;
  dead_count: number;
  notes: string | null;
  pond_name: string;
  batch_name: string;
  created_at: string;
}

interface SurvivalAdjustment {
  id: string;
  pond_batch_id: string;
  adjustment_date: string;
  adjustment_type: 'survival_rate' | 'biomass_estimate';
  estimated_survival_rate: number | null;
  estimated_biomass_kg: number | null;
  calculated_survival_rate: number | null;
  previous_population: number;
  adjusted_population: number;
  biometry_based_biomass_kg: number | null;
  latest_average_weight_g: number | null;
  reason: string | null;
  notes: string | null;
  pond_name: string;
  batch_name: string;
  created_at: string;
}

export function MortalityTab() {
  const [ponds, setPonds] = useState<PondWithBatch[]>([]);
  const [mortalityRecords, setMortalityRecords] = useState<MortalityRecord[]>([]);
  const [survivalAdjustments, setSurvivalAdjustments] = useState<SurvivalAdjustment[]>([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showAdjustmentDialog, setShowAdjustmentDialog] = useState(false);
  const [showConfirmAdjustmentDialog, setShowConfirmAdjustmentDialog] = useState(false);
  const [selectedPond, setSelectedPond] = useState<PondWithBatch | null>(null);
  const [recordToDelete, setRecordToDelete] = useState<MortalityRecord | null>(null);
  const [adjustmentToDelete, setAdjustmentToDelete] = useState<SurvivalAdjustment | null>(null);
  const [adjustmentType, setAdjustmentType] = useState<'survival_rate' | 'biomass_estimate'>('survival_rate');
  const [adjustmentPreview, setAdjustmentPreview] = useState<any>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      loadData();
      loadMortalityHistory();
      loadSurvivalAdjustments();
    }
  }, [user]);

  const loadData = async () => {
    try {
      // Load farms first
      const { data: farmsData, error: farmsError } = await supabase
        .from('farms')
        .select('id')
        .eq('user_id', user?.id);

      if (farmsError) throw farmsError;

      if (farmsData && farmsData.length > 0) {
        // Load active ponds with active batch data  
        const { data: pondsData, error: pondsError } = await supabase
          .from('ponds')
          .select(`
            *,
            pond_batches!inner(
              id,
              current_population,
              pl_quantity,
              stocking_date,
              cycle_status,
              batches!inner(name)
            )
          `)
          .eq('farm_id', farmsData[0].id)
          .eq('status', 'in_use')
          .eq('pond_batches.cycle_status', 'active')
          .gt('pond_batches.current_population', 0)
          .order('name');

        if (pondsError) throw pondsError;

        // Process data to create PondWithBatch structure
        const processedPonds = pondsData?.map(pond => ({
          ...pond,
          current_batch: pond.pond_batches[0] ? {
            id: pond.pond_batches[0].id,
            batch_name: pond.pond_batches[0].batches.name,
            stocking_date: pond.pond_batches[0].stocking_date,
            current_population: pond.pond_batches[0].current_population,
            initial_population: pond.pond_batches[0].pl_quantity
          } : undefined
        })) || [];

        setPonds(processedPonds);

        // Load recent mortality records
        if (processedPonds.length > 0) {
          const pondBatchIds = processedPonds
            .filter(p => p.current_batch)
            .map(p => p.current_batch!.id);

          if (pondBatchIds.length > 0) {
            const { data: recordsData, error: recordsError } = await supabase
              .from('mortality_records')
              .select(`
                *,
                pond_batches!inner(
                  ponds!inner(name),
                  batches!inner(name)
                )
              `)
              .in('pond_batch_id', pondBatchIds)
              .order('record_date', { ascending: false })
              .limit(10);

            if (recordsError) throw recordsError;

            const processedRecords = recordsData?.map(record => ({
              ...record,
              pond_name: record.pond_batches.ponds.name,
              batch_name: record.pond_batches.batches.name
            })) || [];

            setMortalityRecords(processedRecords);
          }
        }
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

  const calculateDOC = (stockingDate: string) => {
    const today = new Date();
    const stocking = new Date(stockingDate);
    const diffTime = Math.abs(today.getTime() - stocking.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const calculateSurvivalRate = (current_population: number, initial_population: number) => {
    return Math.round(((current_population / initial_population) * 100) * 100) / 100;
  };

  const loadMortalityHistory = async () => {
    setHistoryLoading(true);
    try {
      const { data: farmsData, error: farmsError } = await supabase
        .from('farms')
        .select('id')
        .eq('user_id', user?.id);

      if (farmsError) throw farmsError;

      if (farmsData && farmsData.length > 0) {
        const { data: recordsData, error: recordsError } = await supabase
          .from('mortality_records')
          .select(`
            *,
            pond_batches!inner(
              ponds!inner(name, farm_id),
              batches!inner(name)
            )
          `)
          .eq('pond_batches.ponds.farm_id', farmsData[0].id)
          .order('created_at', { ascending: false });

        if (recordsError) throw recordsError;

        const processedRecords = recordsData?.map(record => ({
          ...record,
          pond_name: record.pond_batches.ponds.name,
          batch_name: record.pond_batches.batches.name
        })) || [];

        setMortalityRecords(processedRecords);
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message
      });
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleMortalitySubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedPond?.current_batch) return;

    const formData = new FormData(e.currentTarget);
    const deadCount = parseInt(formData.get('dead_count') as string);
    
    // Validate that dead count doesn't exceed current population
    if (deadCount > selectedPond.current_batch.current_population) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: `Número de mortos (${deadCount}) não pode ser maior que a população atual (${selectedPond.current_batch.current_population}).`
      });
      return;
    }

    setSubmitting(true);

    try {
      // Insert mortality record
      const mortalityRecord = {
        pond_batch_id: selectedPond.current_batch.id,
        record_date: formData.get('record_date') as string,
        dead_count: deadCount,
        notes: formData.get('notes') as string || null
      };

      const { error: insertError } = await supabase
        .from('mortality_records')
        .insert([mortalityRecord]);

      if (insertError) throw insertError;

      // Update pond_batches current_population
      const newPopulation = selectedPond.current_batch.current_population - deadCount;
      const { error: updateError } = await supabase
        .from('pond_batches')
        .update({ current_population: newPopulation })
        .eq('id', selectedPond.current_batch.id);

      if (updateError) throw updateError;

      toast({
        title: "Mortalidade registrada!",
        description: `${deadCount} mortos registrados para ${selectedPond.name}. População atualizada para ${newPopulation}.`
      });

      setShowDialog(false);
      setSelectedPond(null);
      loadData();
      loadMortalityHistory();
      loadSurvivalAdjustments();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message
      });
    } finally {
      setSubmitting(false);
    }
  };

  const openDeleteDialog = (record: MortalityRecord) => {
    setRecordToDelete(record);
    setShowDeleteDialog(true);
  };

  const handleDeleteRecord = async () => {
    if (!recordToDelete) return;

    setSubmitting(true);

    try {
      // First, get the pond_batch to update current population
      const { data: pondBatchData, error: fetchError } = await supabase
        .from('pond_batches')
        .select('current_population')
        .eq('id', recordToDelete.pond_batch_id)
        .single();

      if (fetchError) throw fetchError;

      // Delete the record
      const { error: deleteError } = await supabase
        .from('mortality_records')
        .delete()
        .eq('id', recordToDelete.id);

      if (deleteError) throw deleteError;

      // Restore the population
      const { error: updateError } = await supabase
        .from('pond_batches')
        .update({ 
          current_population: pondBatchData.current_population + recordToDelete.dead_count 
        })
        .eq('id', recordToDelete.pond_batch_id);

      if (updateError) throw updateError;

      toast({
        title: "Registro excluído!",
        description: `Registro de mortalidade foi excluído e população restaurada.`
      });

      setShowDeleteDialog(false);
      setRecordToDelete(null);
      loadData();
      loadMortalityHistory();
      loadSurvivalAdjustments();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message
      });
    } finally {
      setSubmitting(false);
    }
  };

  const loadSurvivalAdjustments = async () => {
    try {
      const { data: farmsData, error: farmsError } = await supabase
        .from('farms')
        .select('id')
        .eq('user_id', user?.id);

      if (farmsError) throw farmsError;

      if (farmsData && farmsData.length > 0) {
        const { data: adjustmentsData, error: adjustmentsError } = await supabase
          .from('survival_adjustments')
          .select(`
            *,
            pond_batches!inner(
              ponds!inner(name, farm_id),
              batches!inner(name)
            )
          `)
          .eq('pond_batches.ponds.farm_id', farmsData[0].id)
          .order('created_at', { ascending: false });

        if (adjustmentsError) throw adjustmentsError;

        const processedAdjustments = adjustmentsData?.map((adjustment: any) => ({
          ...adjustment,
          pond_name: adjustment.pond_batches?.ponds?.name || 'N/A',
          batch_name: adjustment.pond_batches?.batches?.name || 'N/A',
          adjustment_type: adjustment.adjustment_type as 'survival_rate' | 'biomass_estimate'
        })) || [];

        setSurvivalAdjustments(processedAdjustments);
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message
      });
    }
  };

  const calculateBiomassFromBiometry = async (pondBatchId: string, currentPopulation: number) => {
    try {
      const { data: biometryData, error } = await supabase
        .from('biometrics')
        .select('average_weight, measurement_date')
        .eq('pond_batch_id', pondBatchId)
        .order('measurement_date', { ascending: false })
        .limit(1);

      if (error) throw error;

      if (biometryData && biometryData.length > 0) {
        const latestBiometry = biometryData[0];
        const biomassKg = (currentPopulation * latestBiometry.average_weight) / 1000;
        return {
          biomass: biomassKg,
          averageWeight: latestBiometry.average_weight,
          measurementDate: latestBiometry.measurement_date
        };
      }

      return { biomass: 0, averageWeight: 1, measurementDate: null };
    } catch (error) {
      return { biomass: 0, averageWeight: 1, measurementDate: null };
    }
  };

  const handleAdjustmentPreview = async (formData: FormData) => {
    if (!selectedPond?.current_batch) return;

    const type = adjustmentType;
    const batch = selectedPond.current_batch;
    
    // Get latest biometry data
    const biometryData = await calculateBiomassFromBiometry(batch.id, batch.current_population);
    
    let newPopulation: number;
    let newSurvivalRate: number;
    let calculatedSurvivalRate: number | null = null;
    let estimatedBiomassKg: number | null = null;
    let estimatedSurvivalRate: number | null = null;

    if (type === 'survival_rate') {
      const inputRate = parseFloat(formData.get('survival_rate') as string);
      estimatedSurvivalRate = inputRate;
      newPopulation = Math.round((batch.initial_population * inputRate) / 100);
      newSurvivalRate = inputRate;
    } else {
      const inputBiomass = parseFloat(formData.get('biomass_kg') as string);
      estimatedBiomassKg = inputBiomass;
      newPopulation = Math.round((inputBiomass * 1000) / biometryData.averageWeight);
      newSurvivalRate = (newPopulation / batch.initial_population) * 100;
      calculatedSurvivalRate = newSurvivalRate;
    }

    const preview = {
      type,
      currentPopulation: batch.current_population,
      newPopulation,
      currentSurvivalRate: calculateSurvivalRate(batch.current_population, batch.initial_population),
      newSurvivalRate: Math.round(newSurvivalRate * 100) / 100,
      biometryBasedBiomass: biometryData.biomass,
      estimatedBiomassKg,
      estimatedSurvivalRate,
      calculatedSurvivalRate,
      latestAverageWeight: biometryData.averageWeight,
      biometryDate: biometryData.measurementDate,
      adjustmentDate: formData.get('adjustment_date') as string,
      reason: formData.get('reason') as string,
      notes: formData.get('notes') as string
    };

    setAdjustmentPreview(preview);
    setShowConfirmAdjustmentDialog(true);
  };

  const handleSurvivalAdjustmentSubmit = async () => {
    if (!selectedPond?.current_batch || !adjustmentPreview) return;

    setSubmitting(true);

    try {
      const batch = selectedPond.current_batch;
      
      // Prepare adjustment record
      const adjustmentRecord = {
        pond_batch_id: batch.id,
        adjustment_date: adjustmentPreview.adjustmentDate,
        adjustment_type: adjustmentPreview.type,
        estimated_survival_rate: adjustmentPreview.estimatedSurvivalRate,
        estimated_biomass_kg: adjustmentPreview.estimatedBiomassKg,
        calculated_survival_rate: adjustmentPreview.calculatedSurvivalRate,
        previous_population: adjustmentPreview.currentPopulation,
        adjusted_population: adjustmentPreview.newPopulation,
        biometry_based_biomass_kg: adjustmentPreview.biometryBasedBiomass,
        latest_average_weight_g: adjustmentPreview.latestAverageWeight,
        reason: adjustmentPreview.reason || null,
        notes: adjustmentPreview.notes || null
      };

      // Insert adjustment record
      const { error: insertError } = await supabase
        .from('survival_adjustments')
        .insert([adjustmentRecord]);

      if (insertError) throw insertError;

      // Update pond_batches current_population
      const { error: updateError } = await supabase
        .from('pond_batches')
        .update({ current_population: adjustmentPreview.newPopulation })
        .eq('id', batch.id);

      if (updateError) throw updateError;

      const changeType = adjustmentPreview.type === 'survival_rate' ? 'taxa de sobrevivência' : 'biomassa estimada';
      const changeValue = adjustmentPreview.type === 'survival_rate' 
        ? `${adjustmentPreview.estimatedSurvivalRate}%` 
        : `${adjustmentPreview.estimatedBiomassKg}kg`;

      toast({
        title: "Ajuste de sobrevivência realizado!",
        description: `Ajuste por ${changeType} (${changeValue}) registrado. População atualizada para ${adjustmentPreview.newPopulation.toLocaleString()}.`
      });

      setShowConfirmAdjustmentDialog(false);
      setShowAdjustmentDialog(false);
      setSelectedPond(null);
      setAdjustmentPreview(null);
      loadData();
      loadMortalityHistory();
      loadSurvivalAdjustments();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteAdjustment = async (adjustment: SurvivalAdjustment) => {
    setSubmitting(true);

    try {
      // Delete the adjustment record
      const { error: deleteError } = await supabase
        .from('survival_adjustments')
        .delete()
        .eq('id', adjustment.id);

      if (deleteError) throw deleteError;

      // Restore the population
      const { error: updateError } = await supabase
        .from('pond_batches')
        .update({ 
          current_population: adjustment.previous_population 
        })
        .eq('id', adjustment.pond_batch_id);

      if (updateError) throw updateError;

      toast({
        title: "Ajuste excluído!",
        description: `Ajuste de sobrevivência foi excluído e população restaurada.`
      });

      loadData();
      loadMortalityHistory();
      loadSurvivalAdjustments();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-muted rounded w-1/3"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2].map(i => (
            <div key={i} className="h-64 bg-muted rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (ponds.length === 0) {
    return (
      <div className="text-center py-12">
        <Skull className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Nenhum viveiro ativo</h2>
        <p className="text-muted-foreground mb-6">
          Não há viveiros povoados para registrar mortalidade.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="active" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="active" className="flex items-center gap-2">
            <Skull className="w-4 h-4" />
            Viveiros Ativos
          </TabsTrigger>
          <TabsTrigger value="adjustment" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Ajuste Sobrevivência
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="w-4 h-4" />
            Histórico
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="active" className="mt-6">
          <div className="space-y-6">
            {/* Active Ponds Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {ponds.map((pond) => {
                const batch = pond.current_batch!;
                const doc = calculateDOC(batch.stocking_date);
                const survivalRate = calculateSurvivalRate(batch.current_population, batch.initial_population);

                return (
                  <Card key={pond.id} className="shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-ocean)] transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{pond.name}</CardTitle>
                        <Badge variant="default" className="bg-success">
                          DOC {doc}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Lote:</span>
                          <span className="font-medium">{batch.batch_name}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">População Atual:</span>
                          <span className="font-medium">
                            {batch.current_population.toLocaleString()} PL
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">População Inicial:</span>
                          <span className="font-medium">
                            {batch.initial_population.toLocaleString()} PL
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Taxa de Sobrevivência:</span>
                          <span className={`font-medium ${survivalRate >= 80 ? 'text-green-600' : survivalRate >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                            {survivalRate}%
                          </span>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-border">
                        <div className="grid grid-cols-1 gap-2">
                          <Button 
                            onClick={() => {
                              setSelectedPond(pond);
                              setShowDialog(true);
                            }}
                            className="w-full"
                            size="sm"
                          >
                            <Skull className="w-4 h-4 mr-2" />
                            Registrar Mortalidade
                          </Button>
                          <Button 
                            onClick={() => {
                              setSelectedPond(pond);
                              setShowAdjustmentDialog(true);
                            }}
                            className="w-full"
                            size="sm"
                            variant="outline"
                          >
                            <Settings className="w-4 h-4 mr-2" />
                            Ajustar Sobrevivência
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="adjustment" className="mt-6">
          <div className="space-y-6">
            {/* Adjustment Instructions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Ajuste de Sobrevivência
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Use esta funcionalidade para ajustar a sobrevivência baseada em observações indiretas como consumo de ração, comportamento dos animais, ou estimativas visuais da biomassa.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Calculator className="w-4 h-4 text-blue-600" />
                      <span className="font-medium">Por Taxa %</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Informe a taxa de sobrevivência estimada e o sistema calculará a nova população.
                    </p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="w-4 h-4 text-green-600" />
                      <span className="font-medium">Por Biomassa</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Informe a biomassa estimada e o sistema calculará a população baseada na biometria.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Active Ponds for Adjustment */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {ponds.map((pond) => {
                const batch = pond.current_batch!;
                const doc = calculateDOC(batch.stocking_date);
                const survivalRate = calculateSurvivalRate(batch.current_population, batch.initial_population);

                return (
                  <Card key={pond.id} className="shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-ocean)] transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{pond.name}</CardTitle>
                        <Badge variant="default" className="bg-success">
                          DOC {doc}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Lote:</span>
                          <span className="font-medium">{batch.batch_name}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">População Atual:</span>
                          <span className="font-medium">
                            {batch.current_population.toLocaleString()} PL
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Taxa de Sobrevivência:</span>
                          <span className={`font-medium ${survivalRate >= 80 ? 'text-green-600' : survivalRate >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                            {survivalRate}%
                          </span>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-border">
                        <Button 
                          onClick={() => {
                            setSelectedPond(pond);
                            setShowAdjustmentDialog(true);
                          }}
                          className="w-full"
                          size="sm"
                        >
                          <Settings className="w-4 h-4 mr-2" />
                          Ajustar Sobrevivência
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="history" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Histórico Completo</CardTitle>
            </CardHeader>
            <CardContent>
              {historyLoading ? (
                <div className="animate-pulse space-y-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-12 bg-muted rounded"></div>
                  ))}
                </div>
              ) : mortalityRecords.length === 0 && survivalAdjustments.length === 0 ? (
                <div className="text-center py-8">
                  <History className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Nenhum registro ainda.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Survival Adjustments */}
                  {survivalAdjustments.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <Settings className="w-5 h-5" />
                        Ajustes de Sobrevivência
                      </h3>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Viveiro</TableHead>
                            <TableHead>Lote</TableHead>
                            <TableHead>Data</TableHead>
                            <TableHead>Tipo</TableHead>
                            <TableHead>Valor</TableHead>
                            <TableHead>Pop. Anterior</TableHead>
                            <TableHead>Pop. Ajustada</TableHead>
                            <TableHead>Motivo</TableHead>
                            <TableHead>Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {survivalAdjustments.map((adjustment) => (
                            <TableRow key={adjustment.id}>
                              <TableCell className="font-medium">{adjustment.pond_name}</TableCell>
                              <TableCell>{adjustment.batch_name}</TableCell>
                              <TableCell>
                                {formatDateForDisplay(adjustment.adjustment_date)}
                              </TableCell>
                              <TableCell>
                                <Badge variant={adjustment.adjustment_type === 'survival_rate' ? 'default' : 'secondary'}>
                                  {adjustment.adjustment_type === 'survival_rate' ? 'Taxa %' : 'Biomassa'}
                                </Badge>
                              </TableCell>
                              <TableCell className="font-medium text-blue-600">
                                {adjustment.adjustment_type === 'survival_rate' 
                                  ? `${adjustment.estimated_survival_rate}%`
                                  : `${adjustment.estimated_biomass_kg}kg`
                                }
                              </TableCell>
                              <TableCell>
                                {adjustment.previous_population.toLocaleString()}
                              </TableCell>
                              <TableCell className="font-medium text-green-600">
                                {adjustment.adjusted_population.toLocaleString()}
                              </TableCell>
                              <TableCell>
                                {adjustment.reason || '-'}
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteAdjustment(adjustment)}
                                  disabled={submitting}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}

                  {/* Mortality Records */}
                  {mortalityRecords.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <Skull className="w-5 h-5" />
                        Eventos de Mortalidade
                      </h3>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Viveiro</TableHead>
                            <TableHead>Lote</TableHead>
                            <TableHead>Data</TableHead>
                            <TableHead>Quantidade</TableHead>
                            <TableHead>Observações</TableHead>
                            <TableHead>Registrado em</TableHead>
                            <TableHead>Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {mortalityRecords.map((record) => (
                            <TableRow key={record.id}>
                              <TableCell className="font-medium">{record.pond_name}</TableCell>
                              <TableCell>{record.batch_name}</TableCell>
                              <TableCell>
                                {formatDateForDisplay(record.record_date)}
                              </TableCell>
                              <TableCell className="font-medium text-red-600">
                                {record.dead_count}
                              </TableCell>
                              <TableCell>
                                {record.notes || '-'}
                              </TableCell>
                              <TableCell>
                                {new Date(record.created_at).toLocaleDateString('pt-BR')} {new Date(record.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openDeleteDialog(record)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Mortality Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>
              Registrar Mortalidade - {selectedPond?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto flex-1">
            <form id="mortality-form" onSubmit={handleMortalitySubmit} className="space-y-4 p-1">
            <div className="space-y-2">
              <Label htmlFor="record_date">Data do Registro</Label>
              <Input
                id="record_date"
                name="record_date"
                type="date"
                defaultValue={getCurrentDateForInput()}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dead_count">Número de Mortos</Label>
              <Input
                id="dead_count"
                name="dead_count"
                type="number"
                min="1"
                max={selectedPond?.current_batch?.current_population || 1}
                placeholder="Ex: 50"
                required
              />
              <div className="text-xs text-muted-foreground">
                População atual: {selectedPond?.current_batch?.current_population.toLocaleString()} PL
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Observações (opcional)</Label>
              <Textarea
                id="notes"
                name="notes"
                placeholder="Ex: Mortalidade por estresse térmico..."
                rows={3}
              />
            </div>
            </form>
          </div>
          <div className="flex gap-2 pt-4 border-t bg-background flex-shrink-0">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setShowDialog(false)}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={submitting}
              className="flex-1"
              form="mortality-form"
            >
              {submitting ? 'Salvando...' : 'Salvar Registro'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>Tem certeza que deseja excluir este registro de mortalidade?</p>
            {recordToDelete && (
              <div className="p-3 bg-muted rounded-lg">
                <p><strong>Viveiro:</strong> {recordToDelete.pond_name}</p>
                <p><strong>Data:</strong> {formatDateForDisplay(recordToDelete.record_date)}</p>
                <p><strong>Quantidade:</strong> {recordToDelete.dead_count} mortos</p>
              </div>
            )}
            <div className="text-sm text-amber-600 bg-amber-50 p-3 rounded-lg">
              <strong>Atenção:</strong> A população do viveiro será restaurada automaticamente.
            </div>
            <div className="flex gap-2 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setShowDeleteDialog(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleDeleteRecord}
                disabled={submitting}
                variant="destructive"
                className="flex-1"
              >
                {submitting ? 'Excluindo...' : 'Excluir'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Survival Adjustment Dialog */}
      <Dialog open={showAdjustmentDialog} onOpenChange={setShowAdjustmentDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>
              Ajustar Sobrevivência - {selectedPond?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto flex-1">
            <form id="adjustment-form" onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              handleAdjustmentPreview(formData);
            }} className="space-y-4 p-1">
              
              <div className="space-y-2">
                <Label htmlFor="adjustment_date">Data do Ajuste</Label>
                <Input
                  id="adjustment_date"
                  name="adjustment_date"
                  type="date"
                  defaultValue={getCurrentDateForInput()}
                  required
                />
              </div>

              <div className="space-y-3">
                <Label>Método de Ajuste</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant={adjustmentType === 'survival_rate' ? 'default' : 'outline'}
                    onClick={() => setAdjustmentType('survival_rate')}
                    className="w-full"
                  >
                    <Calculator className="w-4 h-4 mr-2" />
                    Por Taxa %
                  </Button>
                  <Button
                    type="button"
                    variant={adjustmentType === 'biomass_estimate' ? 'default' : 'outline'}
                    onClick={() => setAdjustmentType('biomass_estimate')}
                    className="w-full"
                  >
                    <TrendingUp className="w-4 h-4 mr-2" />
                    Por Biomassa
                  </Button>
                </div>
              </div>

              {adjustmentType === 'survival_rate' ? (
                <div className="space-y-2">
                  <Label htmlFor="survival_rate">Taxa de Sobrevivência Estimada (%)</Label>
                  <Input
                    id="survival_rate"
                    name="survival_rate"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    placeholder="Ex: 85.5"
                    required
                  />
                  <div className="text-xs text-muted-foreground">
                    População atual: {selectedPond?.current_batch?.current_population.toLocaleString()} PL ({calculateSurvivalRate(selectedPond?.current_batch?.current_population || 0, selectedPond?.current_batch?.initial_population || 1)}%)
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="biomass_kg">Biomassa Estimada (kg)</Label>
                  <Input
                    id="biomass_kg"
                    name="biomass_kg"
                    type="number"
                    min="0"
                    step="0.1"
                    placeholder="Ex: 450.5"
                    required
                  />
                  <div className="text-xs text-muted-foreground">
                    O sistema calculará a população baseada na biometria mais recente
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="reason">Motivo do Ajuste</Label>
                <select
                  id="reason"
                  name="reason"
                  className="w-full px-3 py-2 border border-input rounded-md text-sm"
                  required
                >
                  <option value="">Selecione um motivo</option>
                  <option value="Redução no consumo de ração">Redução no consumo de ração</option>
                  <option value="Comportamento anômalo observado">Comportamento anômalo observado</option>
                  <option value="Estimativa visual da biomassa">Estimativa visual da biomassa</option>
                  <option value="Experiência histórica do produtor">Experiência histórica do produtor</option>
                  <option value="Outros indicadores indiretos">Outros indicadores indiretos</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Observações (opcional)</Label>
                <Textarea
                  id="notes"
                  name="notes"
                  placeholder="Ex: Observei redução de 30% no consumo de ração nas últimas duas semanas..."
                  rows={3}
                />
              </div>
            </form>
          </div>
          <div className="flex gap-2 pt-4 border-t bg-background flex-shrink-0">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setShowAdjustmentDialog(false)}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={submitting}
              className="flex-1"
              form="adjustment-form"
            >
              <Calculator className="w-4 h-4 mr-2" />
              Calcular e Revisar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Adjustment Confirmation Dialog */}
      <Dialog open={showConfirmAdjustmentDialog} onOpenChange={setShowConfirmAdjustmentDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar Ajuste de Sobrevivência</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {adjustmentPreview && (
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 rounded-lg border">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Calculator className="w-4 h-4" />
                    Método: {adjustmentPreview.type === 'survival_rate' ? 'Taxa de Sobrevivência' : 'Biomassa Estimada'}
                  </h4>
                  {adjustmentPreview.type === 'survival_rate' ? (
                    <p className="text-sm">Taxa informada: <strong>{adjustmentPreview.estimatedSurvivalRate}%</strong></p>
                  ) : (
                    <div className="text-sm space-y-1">
                      <p>Biomassa informada: <strong>{adjustmentPreview.estimatedBiomassKg}kg</strong></p>
                      <p>Biomassa atual (biometria): <strong>{adjustmentPreview.biometryBasedBiomass.toFixed(1)}kg</strong></p>
                      <p>Peso médio atual: <strong>{adjustmentPreview.latestAverageWeight}g</strong></p>
                      {adjustmentPreview.biometryDate && (
                        <p className="text-xs text-muted-foreground">
                          Biometria de: {formatDateForDisplay(adjustmentPreview.biometryDate)}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <div className="p-4 bg-green-50 rounded-lg border">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Resultado do Ajuste
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">População Atual:</p>
                      <p className="font-medium">{adjustmentPreview.currentPopulation.toLocaleString()} PL</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Nova População:</p>
                      <p className="font-medium text-green-600">{adjustmentPreview.newPopulation.toLocaleString()} PL</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Sobrevivência Atual:</p>
                      <p className="font-medium">{adjustmentPreview.currentSurvivalRate}%</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Nova Sobrevivência:</p>
                      <p className="font-medium text-green-600">{adjustmentPreview.newSurvivalRate}%</p>
                    </div>
                  </div>
                  <div className="mt-2 pt-2 border-t">
                    <p className="text-sm">
                      <strong>Variação:</strong> {adjustmentPreview.newPopulation > adjustmentPreview.currentPopulation ? '+' : ''}{(adjustmentPreview.newPopulation - adjustmentPreview.currentPopulation).toLocaleString()} PL
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-amber-50 rounded-lg border text-sm">
                  <p><strong>Motivo:</strong> {adjustmentPreview.reason}</p>
                  {adjustmentPreview.notes && (
                    <p className="mt-1"><strong>Observações:</strong> {adjustmentPreview.notes}</p>
                  )}
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setShowConfirmAdjustmentDialog(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleSurvivalAdjustmentSubmit}
                disabled={submitting}
                className="flex-1"
              >
                {submitting ? 'Aplicando...' : 'Confirmar Ajuste'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}