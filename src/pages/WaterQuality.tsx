import { useEffect, useState } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Droplets, Plus, ArrowLeft, TrendingUp, TrendingDown, AlertTriangle, ThermometerSun } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getCurrentDateForInput, formatDateForDisplay } from '@/lib/utils';
import { LoadingScreen } from '@/components/LoadingScreen';

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
  oxygen_level: number | null;
  temperature: number | null;
  ph_level: number | null;
  alkalinity: number | null;
  hardness: number | null;
  ammonia: number | null;
  nitrite: number | null;
  turbidity: number | null;
  notes: string | null;
}

export default function WaterQuality() {
  const [ponds, setPonds] = useState<Pond[]>([]);
  const [records, setRecords] = useState<WaterQualityRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [selectedPond, setSelectedPond] = useState<string>('');
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Ideal parameter ranges
  const parameterRanges = {
    oxygen_level: { min: 5, max: 8, unit: 'mg/L', name: 'Oxigênio' },
    temperature: { min: 26, max: 30, unit: '°C', name: 'Temperatura' },
    ph_level: { min: 7.5, max: 8.5, unit: 'pH', name: 'pH' },
    alkalinity: { min: 80, max: 150, unit: 'mg/L', name: 'Alcalinidade' },
    hardness: { min: 100, max: 300, unit: 'mg/L', name: 'Dureza' },
    ammonia: { min: 0, max: 0.5, unit: 'mg/L', name: 'Amônia' },
    nitrite: { min: 0, max: 0.3, unit: 'mg/L', name: 'Nitrito' },
    turbidity: { min: 0, max: 30, unit: 'NTU', name: 'Turbidez' }
  };

  useEffect(() => {
    if (user) {
      loadData();
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
      const record = {
        pond_id: selectedPond,
        measurement_date: formData.get('measurement_date') as string,
        oxygen_level: formData.get('oxygen_level') ? parseFloat(formData.get('oxygen_level') as string) : null,
        temperature: formData.get('temperature') ? parseFloat(formData.get('temperature') as string) : null,
        ph_level: formData.get('ph_level') ? parseFloat(formData.get('ph_level') as string) : null,
        alkalinity: formData.get('alkalinity') ? parseFloat(formData.get('alkalinity') as string) : null,
        hardness: formData.get('hardness') ? parseFloat(formData.get('hardness') as string) : null,
        ammonia: formData.get('ammonia') ? parseFloat(formData.get('ammonia') as string) : null,
        nitrite: formData.get('nitrite') ? parseFloat(formData.get('nitrite') as string) : null,
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

  if (loading) {
    return <LoadingScreen message="Carregando qualidade da água..." />;
  }

  if (ponds.length === 0) {
    return (
      <Layout>
        <div className="text-center py-12">
          <Droplets className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-2xl font-semibold mb-2">Nenhum viveiro cadastrado</h2>
          <p className="text-muted-foreground mb-6">
            Cadastre viveiros para registrar qualidade da água.
          </p>
          <Button onClick={() => navigate('/farm')}>
            Gerenciar Viveiros
          </Button>
        </div>
      </Layout>
    );
  }

  const averages = getAverageParameters();

  return (
    <Layout>
      <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #e9dac8 0%, #f5f0e8 50%, #ede3d3 100%)' }}>
        <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate('/dashboard')}
              className="mb-2"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-900 via-blue-800 to-slate-700 bg-clip-text text-transparent">Qualidade da Água</h1>
            <p className="text-muted-foreground">
              Monitore parâmetros essenciais para o cultivo
            </p>
          </div>
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
                      <div className="text-right space-y-1">
                        {record.temperature && (
                          <div className="text-xs">
                            <ThermometerSun className="w-3 h-3 inline mr-1" />
                            {record.temperature}°C
                          </div>
                        )}
                        {record.oxygen_level && (
                          <div className="text-xs">
                            O₂: {record.oxygen_level} mg/L
                          </div>
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
      </div>
    </Layout>
  );
}