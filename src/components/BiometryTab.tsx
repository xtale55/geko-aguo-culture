import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Scales, ClockCounterClockwise, Trash, FileText, Calendar, FloppyDisk, CheckCircle, Clock } from 'phosphor-react';
import { useToast } from '@/hooks/use-toast';
import { getCurrentDateForInput, formatDateForDisplay } from '@/lib/utils';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';

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
    latest_biometry?: {
      average_weight: number;
      measurement_date: string;
      uniformity: number;
      created_at?: string;
    };
  };
}

interface BiometryData {
  pond_batch_id: string;
  measurement_date: string;
  average_weight: number;
  uniformity: number;
  sample_size: number;
}

interface BiometryRecord {
  id: string;
  measurement_date: string;
  average_weight: number;
  uniformity: number;
  sample_size: number;
  created_at: string;
  pond_name: string;
  batch_name: string;
}

interface BatchBiometryRow {
  pondId: string;
  pond_batch_id: string;
  pond_name: string;
  batch_name: string;
  doc: number;
  current_population: number;
  current_weight: number | null;
  new_weight: string;
  uniformity: string;
  sample_size: string;
  status: 'pending' | 'saving' | 'saved' | 'error';
  error_message?: string;
}

export function BiometryTab() {
  const [ponds, setPonds] = useState<PondWithBatch[]>([]);
  const [biometryHistory, setBiometryHistory] = useState<BiometryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showBatchDialog, setShowBatchDialog] = useState(false);
  const [selectedPond, setSelectedPond] = useState<PondWithBatch | null>(null);
  const [recordToDelete, setRecordToDelete] = useState<BiometryRecord | null>(null);
  const [selectedPonds, setSelectedPonds] = useState<string[]>([]);
  const [batchDate, setBatchDate] = useState<Date | undefined>(new Date());
  const [batchRows, setBatchRows] = useState<BatchBiometryRow[]>([]);
  const [isSavingBatch, setIsSavingBatch] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      loadActivePonds();
      loadBiometryHistory();
    }
  }, [user]);

  const loadActivePonds = async () => {
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
              stocking_date,
              cycle_status,
              batches!inner(name),
              biometrics(
                average_weight,
                measurement_date,
                uniformity,
                created_at
              )
            )
          `)
          .eq('farm_id', farmsData[0].id)
          .eq('status', 'in_use')
          .eq('pond_batches.cycle_status', 'active')
          .gt('pond_batches.current_population', 0)
          .order('name');

        if (pondsError) throw pondsError;

        // Process data to get the latest biometry for each pond
        const processedPonds = pondsData?.map(pond => ({
          ...pond,
          current_batch: pond.pond_batches[0] ? {
            id: pond.pond_batches[0].id,
            batch_name: pond.pond_batches[0].batches.name,
            stocking_date: pond.pond_batches[0].stocking_date,
            current_population: pond.pond_batches[0].current_population,
            latest_biometry: pond.pond_batches[0].biometrics
              .sort((a, b) => new Date(b.measurement_date).getTime() - new Date(a.measurement_date).getTime())[0] || null
          } : undefined
        })) || [];

        setPonds(processedPonds);
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

  const calculateBiomass = (population: number, weight: number) => {
    return (population * weight / 1000).toFixed(1); // Convert to kg
  };

  const handleBiometrySubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedPond?.current_batch) return;

    const formData = new FormData(e.currentTarget);
    setSubmitting(true);

    try {
      const biometryData: BiometryData = {
        pond_batch_id: selectedPond.current_batch.id,
        measurement_date: formData.get('measurement_date') as string,
        average_weight: parseFloat(formData.get('average_weight') as string),
        uniformity: parseFloat(formData.get('uniformity') as string) || 0,
        sample_size: parseInt(formData.get('sample_size') as string) || 0
      };

      const { error } = await supabase
        .from('biometrics')
        .insert([biometryData]);

      if (error) throw error;

      toast({
        title: "Biometria registrada!",
        description: `Peso médio de ${biometryData.average_weight}g registrado para ${selectedPond.name}.`
      });

      setShowDialog(false);
      setSelectedPond(null);
      loadActivePonds();
      loadBiometryHistory();
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

  const loadBiometryHistory = async () => {
    setHistoryLoading(true);
    try {
      const { data: farmsData, error: farmsError } = await supabase
        .from('farms')
        .select('id')
        .eq('user_id', user?.id);

      if (farmsError) throw farmsError;

      if (farmsData && farmsData.length > 0) {
        const { data: biometryData, error: biometryError } = await supabase
          .from('biometrics')
          .select(`
            *,
            pond_batches!inner(
              ponds!inner(name, farm_id),
              batches!inner(name)
            )
          `)
          .eq('pond_batches.ponds.farm_id', farmsData[0].id)
          .order('created_at', { ascending: false });

        if (biometryError) throw biometryError;

        const formattedHistory = biometryData?.map(record => ({
          id: record.id,
          measurement_date: record.measurement_date,
          average_weight: record.average_weight,
          uniformity: record.uniformity || 0,
          sample_size: record.sample_size || 0,
          created_at: record.created_at,
          pond_name: record.pond_batches.ponds.name,
          batch_name: record.pond_batches.batches.name
        })) || [];

        setBiometryHistory(formattedHistory);
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

  const openBiometryDialog = (pond: PondWithBatch) => {
    setSelectedPond(pond);
    setShowDialog(true);
  };

  const openDeleteDialog = (biometry: BiometryRecord) => {
    setRecordToDelete(biometry);
    setShowDeleteDialog(true);
  };

  const handleDeleteRecord = async () => {
    if (!recordToDelete) return;

    setSubmitting(true);

    try {
      const { error } = await supabase
        .from('biometrics')
        .delete()
        .eq('id', recordToDelete.id);

      if (error) throw error;

      toast({
        title: "Biometria excluída!",
        description: `Registro de ${recordToDelete.pond_name} foi excluído com sucesso.`
      });

      setShowDeleteDialog(false);
      setRecordToDelete(null);
      loadActivePonds();
      loadBiometryHistory();
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

  const openBatchDialog = () => {
    // Prepare batch rows from active ponds
    const rows: BatchBiometryRow[] = ponds.map(pond => {
      const batch = pond.current_batch!;
      return {
        pondId: pond.id,
        pond_batch_id: batch.id,
        pond_name: pond.name,
        batch_name: batch.batch_name,
        doc: calculateDOC(batch.stocking_date),
        current_population: batch.current_population,
        current_weight: batch.latest_biometry?.average_weight || null,
        new_weight: '',
        uniformity: '',
        sample_size: '',
        status: 'pending'
      };
    });
    
    setBatchRows(rows);
    setBatchDate(new Date());
    setShowBatchDialog(true);
  };

  const updateBatchRow = (pondId: string, field: keyof BatchBiometryRow, value: string) => {
    setBatchRows(prev => prev.map(row => 
      row.pondId === pondId 
        ? { ...row, [field]: value, status: 'pending' }
        : row
    ));
  };

  const getValidRows = () => {
    return batchRows.filter(row => 
      row.new_weight.trim() !== '' && 
      !isNaN(parseFloat(row.new_weight))
    );
  };

  const handleBatchBiometrySubmit = async () => {
    const validRows = getValidRows();
    if (validRows.length === 0 || !batchDate) return;

    setIsSavingBatch(true);
    
    // Mark all valid rows as saving
    setBatchRows(prev => prev.map(row => 
      validRows.some(vr => vr.pondId === row.pondId)
        ? { ...row, status: 'saving' }
        : row
    ));

    try {
      const batchData = validRows.map(row => ({
        pond_batch_id: row.pond_batch_id,
        measurement_date: format(batchDate, 'yyyy-MM-dd'),
        average_weight: parseFloat(row.new_weight),
        uniformity: row.uniformity ? parseFloat(row.uniformity) : 0,
        sample_size: row.sample_size ? parseInt(row.sample_size) : 0
      }));

      const { error } = await supabase
        .from('biometrics')
        .insert(batchData);

      if (error) throw error;

      // Mark successful rows as saved
      setBatchRows(prev => prev.map(row => 
        validRows.some(vr => vr.pondId === row.pondId)
          ? { ...row, status: 'saved' }
          : row
      ));

      toast({
        title: "Biometrias registradas!",
        description: `${validRows.length} biometrias salvas com sucesso.`
      });

      // Reload data and close dialog after a delay
      setTimeout(() => {
        loadActivePonds();
        loadBiometryHistory();
        setShowBatchDialog(false);
      }, 1500);

    } catch (error: any) {
      // Mark failed rows as error
      setBatchRows(prev => prev.map(row => 
        validRows.some(vr => vr.pondId === row.pondId)
          ? { ...row, status: 'error', error_message: error.message }
          : row
      ));

      toast({
        variant: "destructive",
        title: "Erro no salvamento",
        description: error.message
      });
    } finally {
      setIsSavingBatch(false);
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
        <Scales className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Nenhum viveiro ativo</h2>
        <p className="text-muted-foreground mb-6">
          Não há viveiros povoados para realizar biometrias.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="active" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="active" className="flex items-center gap-2">
            <Scales className="w-4 h-4" />
            Viveiros Ativos
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <ClockCounterClockwise className="w-4 h-4" />
            Histórico
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="active" className="mt-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-lg font-semibold">Viveiros Ativos</h3>
              <p className="text-sm text-muted-foreground">
                {ponds.length} viveiro{ponds.length !== 1 ? 's' : ''} com população ativa
              </p>
            </div>
            <Button onClick={openBatchDialog} variant="outline" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Registro em Lote
            </Button>
          </div>
          
          {/* Ponds Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {ponds.map((pond) => {
          const batch = pond.current_batch!;
          const doc = calculateDOC(batch.stocking_date);
          const biomass = batch.latest_biometry 
            ? calculateBiomass(batch.current_population, batch.latest_biometry.average_weight)
            : '0.0';

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
                    <span className="text-muted-foreground">População:</span>
                    <span className="font-medium">
                      {batch.current_population.toLocaleString()} PL
                    </span>
                  </div>
                  {batch.latest_biometry && (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Peso Atual:</span>
                        <span className="font-medium text-primary">
                          {batch.latest_biometry.average_weight}g
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Biomassa:</span>
                        <span className="font-medium text-accent">
                          {biomass} kg
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Última Medição:</span>
                        <span className="font-medium">
                          {formatDateForDisplay(batch.latest_biometry.measurement_date)}
                        </span>
                      </div>
                      {batch.latest_biometry.uniformity > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Uniformidade:</span>
                          <span className="font-medium">
                            {batch.latest_biometry.uniformity}%
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </div>

                <div className="pt-4 border-t border-border">
                  <Button 
                    onClick={() => openBiometryDialog(pond)}
                    className="w-full"
                    size="sm"
                  >
                    <Scales className="w-4 h-4 mr-2" />
                    {batch.latest_biometry ? 'Nova Biometria' : 'Primeira Biometria'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
          </div>
        </TabsContent>
        
        <TabsContent value="history" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Biometrias</CardTitle>
            </CardHeader>
            <CardContent>
              {historyLoading ? (
                <div className="animate-pulse space-y-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-12 bg-muted rounded"></div>
                  ))}
                </div>
              ) : biometryHistory.length === 0 ? (
                <div className="text-center py-8">
                  <ClockCounterClockwise className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Nenhuma biometria registrada ainda.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Viveiro</TableHead>
                      <TableHead>Lote</TableHead>
                      <TableHead>Data Medição</TableHead>
                      <TableHead>Peso Médio</TableHead>
                      <TableHead>Uniformidade</TableHead>
                      <TableHead>Amostra</TableHead>
                      <TableHead>Registrado em</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {biometryHistory.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">{record.pond_name}</TableCell>
                        <TableCell>{record.batch_name}</TableCell>
                        <TableCell>
                          {formatDateForDisplay(record.measurement_date)}
                        </TableCell>
                        <TableCell className="font-medium text-primary">
                          {record.average_weight}g
                        </TableCell>
                        <TableCell>
                          {record.uniformity > 0 ? `${record.uniformity}%` : '-'}
                        </TableCell>
                        <TableCell>
                          {record.sample_size > 0 ? record.sample_size : '-'}
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
                            <Trash className="w-4 h-4" />
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

      {/* Biometry Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>
              Nova Biometria - {selectedPond?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto flex-1">
            <form id="biometry-form" onSubmit={handleBiometrySubmit} className="space-y-4 p-1">
              <div className="space-y-2">
                <Label htmlFor="measurement_date">Data da Medição</Label>
                <Input
                  id="measurement_date"
                  name="measurement_date"
                  type="date"
                  defaultValue={getCurrentDateForInput()}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="average_weight">Peso Médio (g)</Label>
                <Input
                id="average_weight"
                name="average_weight"
                type="number"
                step="0.01"
                placeholder="Ex: 12.5"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="uniformity">Uniformidade (%)</Label>
              <Input
                id="uniformity"
                name="uniformity"
                type="number"
                step="0.1"
                placeholder="Ex: 85.0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sample_size">Tamanho da Amostra</Label>
              <Input
                id="sample_size"
                name="sample_size"
                type="number"
                placeholder="Ex: 100"
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
              form="biometry-form"
            >
              {submitting ? 'Salvando...' : 'Salvar Biometria'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Batch Biometry Dialog - Excel Style */}
      <Dialog open={showBatchDialog} onOpenChange={setShowBatchDialog}>
        <DialogContent className="max-w-7xl max-h-[95vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Registro de Biometria em Lote
            </DialogTitle>
          </DialogHeader>
          
          <div className="overflow-y-auto flex-1 space-y-4">
            {/* Date Picker */}
            <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
              <Label htmlFor="batch-date" className="font-medium">Data da Medição:</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-[240px] justify-start text-left font-normal"
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {batchDate ? format(batchDate, 'dd/MM/yyyy') : 'Selecionar data'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={batchDate}
                    onSelect={setBatchDate}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Excel-style Table */}
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold">Viveiro</TableHead>
                    <TableHead className="font-semibold">DOC</TableHead>
                    <TableHead className="font-semibold">População</TableHead>
                    <TableHead className="font-semibold">Peso Atual</TableHead>
                    <TableHead className="font-semibold">Novo Peso (g)</TableHead>
                    <TableHead className="font-semibold">Uniformidade (%)</TableHead>
                    <TableHead className="font-semibold">Amostra</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {batchRows.map((row) => (
                    <TableRow key={row.pondId} className="hover:bg-muted/30">
                      <TableCell className="font-medium">
                        <div>
                          <div className="font-semibold">{row.pond_name}</div>
                          <div className="text-sm text-muted-foreground">{row.batch_name}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">{row.doc}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {row.current_population.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {row.current_weight ? `${row.current_weight}g` : '-'}
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={row.new_weight}
                          onChange={(e) => updateBatchRow(row.pondId, 'new_weight', e.target.value)}
                          className="w-full text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          disabled={row.status === 'saving' || row.status === 'saved'}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.1"
                          placeholder="0.0"
                          value={row.uniformity}
                          onChange={(e) => updateBatchRow(row.pondId, 'uniformity', e.target.value)}
                          className="w-full text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          disabled={row.status === 'saving' || row.status === 'saved'}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          placeholder="0"
                          value={row.sample_size}
                          onChange={(e) => updateBatchRow(row.pondId, 'sample_size', e.target.value)}
                          className="w-full text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          disabled={row.status === 'saving' || row.status === 'saved'}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Summary */}
            <div className="flex justify-between items-center p-4 bg-muted/50 rounded-lg">
              <div className="text-sm text-muted-foreground">
                {getValidRows().length} de {batchRows.length} viveiros com dados válidos
              </div>
              <div className="text-sm text-muted-foreground">
                {batchRows.filter(r => r.status === 'saved').length} salvos
              </div>
            </div>
          </div>
          
          <div className="flex gap-2 pt-4 border-t bg-background flex-shrink-0">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setShowBatchDialog(false)}
              className="flex-1"
              disabled={isSavingBatch}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleBatchBiometrySubmit}
              disabled={isSavingBatch || getValidRows().length === 0 || !batchDate}
              className="flex-1"
            >
              <FloppyDisk className="w-4 h-4 mr-2" />
              {isSavingBatch 
                ? 'Salvando...' 
                : `Salvar ${getValidRows().length} Biometria${getValidRows().length !== 1 ? 's' : ''}`
              }
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>Tem certeza que deseja excluir esta biometria?</p>
            {recordToDelete && (
              <div className="bg-muted p-4 rounded-md space-y-2">
                <p><strong>Viveiro:</strong> {recordToDelete.pond_name}</p>
                <p><strong>Lote:</strong> {recordToDelete.batch_name}</p>
                <p><strong>Data:</strong> {formatDateForDisplay(recordToDelete.measurement_date)}</p>
                <p><strong>Peso Médio:</strong> {recordToDelete.average_weight}g</p>
              </div>
            )}
            <p className="text-sm text-muted-foreground">Esta ação não pode ser desfeita.</p>
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
              variant="destructive"
              onClick={handleDeleteRecord}
              disabled={submitting}
              className="flex-1"
            >
              {submitting ? 'Excluindo...' : 'Excluir'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}