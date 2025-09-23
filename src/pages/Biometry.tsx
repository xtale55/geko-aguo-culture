import { useEffect, useState } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Scale, TrendingUp, Calendar, ArrowLeft, Plus } from 'lucide-react';
import { Shrimp } from '@phosphor-icons/react';
import { useToast } from '@/hooks/use-toast';
import { getCurrentDateForInput, formatDateForDisplay } from '@/lib/utils';
import { LoadingScreen } from '@/components/LoadingScreen';

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

export default function Biometry() {
  const [ponds, setPonds] = useState<PondWithBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [selectedPond, setSelectedPond] = useState<PondWithBatch | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      loadActivePonds();
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
        // Load active ponds with batch data
        const { data: pondsData, error: pondsError } = await supabase
          .from('ponds')
          .select(`
            *,
            pond_batches!inner(
              id,
              current_population,
              stocking_date,
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

  const calculateGrowthRate = (currentWeight: number, previousWeight: number, days: number) => {
    if (!previousWeight || days <= 0) return 0;
    return (((currentWeight - previousWeight) / days) * 7).toFixed(2); // Weekly growth rate
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

  const openBiometryDialog = (pond: PondWithBatch) => {
    setSelectedPond(pond);
    setShowDialog(true);
  };

  if (loading) {
    return <LoadingScreen message="Carregando biometrias..." />;
  }

  if (ponds.length === 0) {
    return (
      <Layout>
        <div className="text-center py-12">
          <Scale className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-2xl font-semibold mb-2">Nenhum viveiro ativo</h2>
          <p className="text-muted-foreground mb-6">
            Não há viveiros povoados para realizar biometrias.
          </p>
          <Button onClick={() => navigate('/dashboard')}>
            Voltar ao Dashboard
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-50/50 to-slate-200/30">
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
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-900 via-blue-800 to-slate-700 bg-clip-text text-transparent">Biometria</h1>
            <p className="text-muted-foreground">
              Registre o peso médio dos camarões para monitorar o crescimento
            </p>
          </div>
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
                      <Scale className="w-4 h-4 mr-2" />
                      {batch.latest_biometry ? 'Nova Biometria' : 'Primeira Biometria'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Biometry Dialog */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                Nova Biometria - {selectedPond?.name}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleBiometrySubmit} className="space-y-4">
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
                  {submitting ? 'Salvando...' : 'Salvar Biometria'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      </div>
    </Layout>
  );
}