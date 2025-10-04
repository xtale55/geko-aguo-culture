import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Droplets, Plus, TrendingUp, AlertTriangle, History, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getCurrentDateForInput, formatDateForDisplay } from '@/lib/utils';

interface Pond {
  id: string;
  name: string;
  area: number;
  status: string;
}

interface WaterQualityRecord {
  id: string;
  pond_id: string;
  pond_name: string;
  measurement_date: string;
  measurement_time?: string;
  oxygen_level: number | null;
  temperature: number | null;
  ph_level: number | null;
  alkalinity: number | null;
  hardness: number | null;
  ammonia: number | null;
  turbidity: number | null;
  notes: string | null;
  created_at: string;
}

export function WaterQualityTab() {
  const [ponds, setPonds] = useState<Pond[]>([]);
  const [records, setRecords] = useState<WaterQualityRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedPond, setSelectedPond] = useState<string>('');
  const [recordToDelete, setRecordToDelete] = useState<WaterQualityRecord | null>(null);
  const [measurementHour, setMeasurementHour] = useState('06');
  const [measurementMinute, setMeasurementMinute] = useState('00');
  const { user } = useAuth();
  const { toast } = useToast();

  // Ideal parameter ranges
  const parameterRanges = {
    oxygen_level: { min: 5, max: 8, unit: 'mg/L', name: 'Oxigênio' },
    temperature: { min: 26, max: 30, unit: '°C', name: 'Temperatura' },
    ph_level: { min: 7.5, max: 8.5, unit: 'pH', name: 'pH' },
    alkalinity: { min: 80, max: 150, unit: 'mg/L', name: 'Alcalinidade' },
    hardness: { min: 100, max: 300, unit: 'mg/L', name: 'Dureza' },
    ammonia: { min: 0, max: 0.5, unit: 'mg/L', name: 'Amônia' },
    nitrite: { min: 0, max: 0.1, unit: 'mg/L', name: 'Nitrito' },
    turbidity: { min: 0, max: 30, unit: 'NTU', name: 'Turbidez' }
  };

  useEffect(() => {
    if (user) {
      loadData();
      loadWaterQualityHistory();
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
        // Load all ponds
        const { data: pondsData, error: pondsError } = await supabase
          .from('ponds')
          .select('id, name, area, status')
          .eq('farm_id', farmsData[0].id)
          .order('name');

        if (pondsError) throw pondsError;
        setPonds(pondsData || []);

        // Load recent water quality records
        if ((pondsData || []).length > 0) {
          const { data: recordsData, error: recordsError } = await supabase
            .from('water_quality')
            .select('*')
            .in('pond_id', (pondsData || []).map(p => p.id))
            .order('measurement_date', { ascending: false })
            .limit(50);

          if (recordsError) throw recordsError;

          // Add pond names to records
          const processedRecords = recordsData?.map(record => {
            const pond = pondsData?.find(p => p.id === record.pond_id);
            return {
              ...record,
              pond_name: pond?.name || 'Unknown'
            };
          }) || [];

          setRecords(processedRecords);
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

  const handleSubmitRecord = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setSubmitting(true);

    try {
      const measurementTime = `${measurementHour}:${measurementMinute}:00`;
      
      const record = {
        pond_id: selectedPond,
        measurement_date: formData.get('measurement_date') as string,
        measurement_time: measurementTime,
        oxygen_level: formData.get('oxygen_level') ? parseFloat(formData.get('oxygen_level') as string) : null,
        temperature: formData.get('temperature') ? parseFloat(formData.get('temperature') as string) : null,
        ph_level: formData.get('ph_level') ? parseFloat(formData.get('ph_level') as string) : null,
        alkalinity: formData.get('alkalinity') ? parseFloat(formData.get('alkalinity') as string) : null,
        hardness: formData.get('hardness') ? parseFloat(formData.get('hardness') as string) : null,
        ammonia: formData.get('ammonia') ? parseFloat(formData.get('ammonia') as string) : null,
        turbidity: formData.get('turbidity') ? parseFloat(formData.get('turbidity') as string) : null,
        notes: formData.get('notes') as string || null
      };

      const { error } = await supabase
        .from('water_quality')
        .insert([record]);

      if (error) throw error;

      toast({
        title: "Registro salvo!",
        description: "Parâmetros de qualidade da água registrados com sucesso."
      });

      setShowDialog(false);
      setSelectedPond('');
      loadData();
      loadWaterQualityHistory();
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

  const getParameterStatus = (value: number | null, parameter: keyof typeof parameterRanges) => {
    if (value === null) return 'unknown';
    const range = parameterRanges[parameter];
    if (parameter === 'ammonia' || parameter === 'nitrite') {
      // For ammonia and nitrite, lower is better
      return value <= range.max ? 'good' : 'bad';
    }
    return value >= range.min && value <= range.max ? 'good' : 'bad';
  };

  const getLatestRecordByPond = (pondId: string) => {
    return records.find(record => record.pond_id === pondId);
  };

  const getAverageParameters = () => {
    if (records.length === 0) return {};
    
    const recent = records.slice(0, 10); // Last 10 records
    const averages: Record<string, number> = {};
    
    Object.keys(parameterRanges).forEach(param => {
      const values = recent
        .map(r => r[param as keyof WaterQualityRecord] as number)
        .filter(v => v !== null && !isNaN(v));
      
      if (values.length > 0) {
        averages[param] = values.reduce((sum, val) => sum + val, 0) / values.length;
      }
    });
    
    return averages;
  };

  const loadWaterQualityHistory = async () => {
    setHistoryLoading(true);
    try {
      const { data: farmsData, error: farmsError } = await supabase
        .from('farms')
        .select('id')
        .eq('user_id', user?.id);

      if (farmsError) throw farmsError;

      if (farmsData && farmsData.length > 0) {
        const { data: recordsData, error: recordsError } = await supabase
          .from('water_quality')
          .select('*')
          .order('created_at', { ascending: false });

        if (recordsError) throw recordsError;

        // Load ponds to map names
        const { data: pondsData, error: pondsDataError } = await supabase
          .from('ponds')
          .select('id, name')
          .eq('farm_id', farmsData[0].id);

        if (pondsDataError) throw pondsDataError;

        const processedRecords = recordsData?.map(record => {
          const pond = pondsData?.find(p => p.id === record.pond_id);
          return {
            ...record,
            pond_name: pond?.name || 'Unknown'
          };
        }).filter(record => record.pond_name !== 'Unknown') || [];

        setRecords(processedRecords);
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

  const openDeleteDialog = (record: WaterQualityRecord) => {
    setRecordToDelete(record);
    setShowDeleteDialog(true);
  };

  const handleDeleteRecord = async () => {
    if (!recordToDelete) return;

    setSubmitting(true);

    try {
      const { error } = await supabase
        .from('water_quality')
        .delete()
        .eq('id', recordToDelete.id);

      if (error) throw error;

      toast({
        title: "Registro excluído!",
        description: `Registro de qualidade da água foi excluído com sucesso.`
      });

      setShowDeleteDialog(false);
      setRecordToDelete(null);
      loadData();
      loadWaterQualityHistory();
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
        <Droplets className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Nenhum viveiro cadastrado</h2>
        <p className="text-muted-foreground mb-6">
          Cadastre viveiros para registrar qualidade da água.
        </p>
      </div>
    );
  }

  const averages = getAverageParameters();

  return (
    <div className="space-y-6">
      <Tabs defaultValue="ponds" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="ponds" className="flex items-center gap-2">
            <Droplets className="w-4 h-4" />
            Viveiros
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="w-4 h-4" />
            Histórico
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="ponds" className="mt-6">
          <div className="space-y-6">
      {/* Header with new record button */}
      <div className="flex justify-end">
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-primary to-accent">
              <Plus className="w-4 h-4 mr-2" />
              Novo Registro
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Registrar Qualidade da Água</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmitRecord} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pond_id">Viveiro</Label>
                  <Select onValueChange={setSelectedPond} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um viveiro" />
                    </SelectTrigger>
                    <SelectContent>
                      {ponds.map(pond => (
                        <SelectItem key={pond.id} value={pond.id}>
                          {pond.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
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
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label htmlFor="measurement-hour" className="text-xs text-muted-foreground">Hora</Label>
                    <Select value={measurementHour} onValueChange={setMeasurementHour}>
                      <SelectTrigger id="measurement-hour">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="max-h-[200px]">
                        {Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0')).map((hour) => (
                          <SelectItem key={hour} value={hour}>
                            {hour}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="measurement-minute" className="text-xs text-muted-foreground">Minuto</Label>
                    <Select value={measurementMinute} onValueChange={setMeasurementMinute}>
                      <SelectTrigger id="measurement-minute">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="00">00</SelectItem>
                        <SelectItem value="15">15</SelectItem>
                        <SelectItem value="30">30</SelectItem>
                        <SelectItem value="45">45</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Parameter inputs */}
              <div className="grid grid-cols-2 gap-4">
                {Object.entries(parameterRanges).map(([key, range]) => (
                  <div key={key} className="space-y-2">
                    <Label htmlFor={key}>
                      {range.name} ({range.unit})
                    </Label>
                    <Input
                      id={key}
                      name={key}
                      type="number"
                      step="0.1"
                      placeholder={`${range.min}-${range.max}`}
                    />
                    <div className="text-xs text-muted-foreground">
                      Ideal: {range.min}-{range.max} {range.unit}
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Observações (opcional)</Label>
                <Textarea
                  id="notes"
                  name="notes"
                  placeholder="Ex: Água mais turva após chuva..."
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
      </div>

      {/* Average Parameters Cards */}
      {Object.keys(averages).length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Parâmetros Médios (últimas 10 medições)</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            {Object.entries(parameterRanges).map(([key, range]) => {
              const value = averages[key];
              if (!value) return null;
              
              const status = getParameterStatus(value, key as keyof typeof parameterRanges);
              
              return (
                <Card key={key} className={`border-2 ${
                  status === 'good' ? 'border-green-200 bg-green-50' : 
                  status === 'bad' ? 'border-red-200 bg-red-50' : 
                  'border-gray-200'
                }`}>
                  <CardContent className="p-4 text-center">
                    <div className="text-sm font-medium text-muted-foreground">
                      {range.name}
                    </div>
                    <div className="text-lg font-bold">
                      {value.toFixed(1)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {range.unit}
                    </div>
                    {status === 'good' ? (
                      <TrendingUp className="w-4 h-4 text-green-600 mx-auto mt-1" />
                    ) : status === 'bad' ? (
                      <AlertTriangle className="w-4 h-4 text-red-600 mx-auto mt-1" />
                    ) : null}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Ponds Status */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Status por Viveiro</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {ponds.map((pond) => {
            const latestRecord = getLatestRecordByPond(pond.id);
            
            return (
              <Card key={pond.id} className="shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-ocean)] transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{pond.name}</CardTitle>
                    <Badge variant={pond.status === 'in_use' ? 'default' : 'secondary'}>
                      {pond.status === 'in_use' ? 'Em Uso' : 'Livre'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {latestRecord ? (
                    <>
                      <div className="text-sm text-muted-foreground">
                        Última medição: {formatDateForDisplay(latestRecord.measurement_date)}
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        {Object.entries(parameterRanges).map(([key, range]) => {
                          const value = latestRecord[key as keyof WaterQualityRecord] as number | null;
                          if (value === null) return null;
                          
                          const status = getParameterStatus(value, key as keyof typeof parameterRanges);
                          
                          return (
                            <div key={key} className="flex justify-between">
                              <span className="text-muted-foreground">{range.name}:</span>
                              <span className={`font-medium ${
                                status === 'good' ? 'text-green-600' : 
                                status === 'bad' ? 'text-red-600' : ''
                              }`}>
                                {value.toFixed(1)} {range.unit}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                      {latestRecord.notes && (
                        <div className="text-xs text-muted-foreground p-2 bg-muted/50 rounded">
                          {latestRecord.notes}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-4 text-muted-foreground">
                      Nenhuma medição registrada
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Recent Records */}
      {records.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Registros Recentes</h2>
          <Card>
            <CardContent className="p-0">
              <div className="divide-y divide-border max-h-96 overflow-y-auto">
                {records.slice(0, 20).map((record) => (
                  <div key={record.id} className="p-4 flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <Droplets className="w-5 h-5 text-blue-500" />
                      <div>
                        <div className="font-medium">{record.pond_name}</div>
                        <div className="text-sm text-muted-foreground">
                          {formatDateForDisplay(record.measurement_date)}
                        </div>
                      </div>
                    </div>
                    <div className="text-right text-sm">
                      {record.temperature && (
                        <div>Temp: {record.temperature}°C</div>
                      )}
                      {record.ph_level && (
                        <div>pH: {record.ph_level}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
          </div>
        </TabsContent>
        
        <TabsContent value="history" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Qualidade da Água</CardTitle>
            </CardHeader>
            <CardContent>
              {historyLoading ? (
                <div className="animate-pulse space-y-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-12 bg-muted rounded"></div>
                  ))}
                </div>
              ) : records.length === 0 ? (
                <div className="text-center py-8">
                  <History className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Nenhum registro de qualidade da água ainda.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Viveiro</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Temp (°C)</TableHead>
                      <TableHead>pH</TableHead>
                      <TableHead>OD (mg/L)</TableHead>
                      <TableHead>Amônia</TableHead>
                      <TableHead>Alcalinidade</TableHead>
                      <TableHead>Dureza</TableHead>
                      <TableHead>Turbidez</TableHead>
                      <TableHead>Registrado em</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {records.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">{record.pond_name}</TableCell>
                        <TableCell>
                          {formatDateForDisplay(record.measurement_date)}
                        </TableCell>
                        <TableCell>
                          {record.temperature ? `${record.temperature}°C` : '-'}
                        </TableCell>
                        <TableCell>
                          {record.ph_level ? record.ph_level.toFixed(1) : '-'}
                        </TableCell>
                        <TableCell>
                          {record.oxygen_level ? `${record.oxygen_level} mg/L` : '-'}
                        </TableCell>
                        <TableCell>
                          {record.ammonia ? `${record.ammonia} mg/L` : '-'}
                        </TableCell>
                        <TableCell>
                          {record.alkalinity ? `${record.alkalinity} mg/L` : '-'}
                        </TableCell>
                        <TableCell>
                          {record.hardness ? `${record.hardness} mg/L` : '-'}
                        </TableCell>
                        <TableCell>
                          {record.turbidity ? `${record.turbidity} NTU` : '-'}
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

      {/* Delete Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>Tem certeza que deseja excluir este registro de qualidade da água?</p>
            {recordToDelete && (
              <div className="p-3 bg-muted rounded-lg">
                <p><strong>Viveiro:</strong> {recordToDelete.pond_name}</p>
                <p><strong>Data:</strong> {formatDateForDisplay(recordToDelete.measurement_date)}</p>
              </div>
            )}
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