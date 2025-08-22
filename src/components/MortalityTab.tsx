import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Skull, History, Trash2 } from 'lucide-react';
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

export function MortalityTab() {
  const [ponds, setPonds] = useState<PondWithBatch[]>([]);
  const [mortalityRecords, setMortalityRecords] = useState<MortalityRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedPond, setSelectedPond] = useState<PondWithBatch | null>(null);
  const [recordToDelete, setRecordToDelete] = useState<MortalityRecord | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      loadData();
      loadMortalityHistory();
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
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="active" className="flex items-center gap-2">
            <Skull className="w-4 h-4" />
            Viveiros Ativos
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
              <CardTitle>Histórico de Mortalidade</CardTitle>
            </CardHeader>
            <CardContent>
              {historyLoading ? (
                <div className="animate-pulse space-y-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-12 bg-muted rounded"></div>
                  ))}
                </div>
              ) : mortalityRecords.length === 0 ? (
                <div className="text-center py-8">
                  <History className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Nenhum registro de mortalidade ainda.</p>
                </div>
              ) : (
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
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Mortality Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Registrar Mortalidade - {selectedPond?.name}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleMortalitySubmit} className="space-y-4">
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
            <div className="flex gap-2 pt-4">
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
              >
                {submitting ? 'Salvando...' : 'Salvar Registro'}
              </Button>
            </div>
          </form>
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
    </div>
  );
}