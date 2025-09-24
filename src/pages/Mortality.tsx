import { useEffect, useState } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Skull, AlertTriangle, TrendingDown, Calendar, ArrowLeft, Plus } from 'lucide-react';
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
    initial_population: number;
  };
}

interface MortalityRecord {
  id: string;
  record_date: string;
  dead_count: number;
  notes: string;
  pond_name: string;
}

export default function Mortality() {
  const [ponds, setPonds] = useState<PondWithBatch[]>([]);
  const [mortalityRecords, setMortalityRecords] = useState<MortalityRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [selectedPond, setSelectedPond] = useState<PondWithBatch | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

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
        // Load active ponds with batch data
        const { data: pondsData, error: pondsError } = await supabase
          .from('ponds')
          .select(`
            *,
            pond_batches!inner(
              id,
              current_population,
              pl_quantity,
              stocking_date,
              batches!inner(name)
            )
          `)
          .eq('farm_id', farmsData[0].id)
          .eq('status', 'in_use')
          .order('name');

        if (pondsError) throw pondsError;

        // Process data
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

          const { data: mortalityData, error: mortalityError } = await supabase
            .from('mortality_records')
            .select(`
              *,
              pond_batches!inner(
                ponds!inner(name)
              )
            `)
            .in('pond_batch_id', pondBatchIds)
            .order('record_date', { ascending: false })
            .limit(50);

          if (mortalityError) throw mortalityError;

          const processedMortality = mortalityData?.map(record => ({
            ...record,
            pond_name: record.pond_batches.ponds.name
          })) || [];

          setMortalityRecords(processedMortality);
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

  const calculateSurvivalRate = (current: number, initial: number) => {
    return ((current / initial) * 100).toFixed(1);
  };

  const handleMortalitySubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedPond?.current_batch) return;

    const formData = new FormData(e.currentTarget);
    const deadCount = parseInt(formData.get('dead_count') as string);
    
    if (deadCount > selectedPond.current_batch.current_population) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Número de mortos não pode ser maior que a população atual."
      });
      return;
    }

    setSubmitting(true);

    try {
      // Insert mortality record
      const { error: mortalityError } = await supabase
        .from('mortality_records')
        .insert([{
          pond_batch_id: selectedPond.current_batch.id,
          record_date: formData.get('record_date') as string,
          dead_count: deadCount,
          notes: formData.get('notes') as string || null
        }]);

      if (mortalityError) throw mortalityError;

      // Update current population
      const newPopulation = selectedPond.current_batch.current_population - deadCount;
      
      const { error: updateError } = await supabase
        .from('pond_batches')
        .update({ current_population: newPopulation })
        .eq('id', selectedPond.current_batch.id);

      if (updateError) throw updateError;

      toast({
        title: "Mortalidade registrada!",
        description: `${deadCount} mortos registrados. População atual: ${newPopulation.toLocaleString()}.`
      });

      setShowDialog(false);
      setSelectedPond(null);
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

  const openMortalityDialog = (pond: PondWithBatch) => {
    setSelectedPond(pond);
    setShowDialog(true);
  };

  if (loading) {
    return <LoadingScreen message="Carregando mortalidade..." />;
  }

  if (ponds.length === 0) {
    return (
      <Layout>
        <div className="text-center py-12">
          <Skull className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-2xl font-semibold mb-2">Nenhum viveiro ativo</h2>
          <p className="text-muted-foreground mb-6">
            Não há viveiros povoados para registrar mortalidade.
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
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-900 via-blue-800 to-slate-700 bg-clip-text text-transparent">Registro de Mortalidade</h1>
            <p className="text-muted-foreground">
              Monitore e registre mortalidade para manter dados precisos
            </p>
          </div>
        </div>

        {/* Ponds Grid */}
        <div>
          <h2 className="text-2xl font-semibold mb-4">Viveiros Ativos</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {ponds.map((pond) => {
              const batch = pond.current_batch!;
              const doc = calculateDOC(batch.stocking_date);
              const survivalRate = calculateSurvivalRate(batch.current_population, batch.initial_population);
              const mortalityCount = batch.initial_population - batch.current_population;

              return (
                <Card key={pond.id} className="shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-ocean)] transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{pond.name}</CardTitle>
                      <Badge 
                        variant={parseFloat(survivalRate) >= 80 ? "default" : "destructive"}
                        className={parseFloat(survivalRate) >= 80 ? "bg-success" : ""}
                      >
                        {survivalRate}% sobrev.
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
                        <span className="text-muted-foreground">DOC:</span>
                        <span className="font-medium">{doc} dias</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">População Inicial:</span>
                        <span className="font-medium">
                          {batch.initial_population.toLocaleString()} PL
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">População Atual:</span>
                        <span className="font-medium text-primary">
                          {batch.current_population.toLocaleString()} PL
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Total de Mortos:</span>
                        <span className="font-medium text-destructive">
                          {mortalityCount.toLocaleString()} PL
                        </span>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-border">
                      <Button 
                        onClick={() => openMortalityDialog(pond)}
                        variant="outline"
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

        {/* Recent Mortality Records */}
        {mortalityRecords.length > 0 && (
          <div>
            <h2 className="text-2xl font-semibold mb-4">Registros Recentes</h2>
            <Card>
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  {mortalityRecords.slice(0, 10).map((record) => (
                    <div key={record.id} className="p-4 flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-2 h-2 bg-destructive rounded-full"></div>
                        <div>
                          <div className="font-medium">{record.pond_name}</div>
                          <div className="text-sm text-muted-foreground">
                            {formatDateForDisplay(record.record_date)}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-destructive">
                          {record.dead_count.toLocaleString()} mortos
                        </div>
                        {record.notes && (
                          <div className="text-xs text-muted-foreground truncate max-w-32">
                            {record.notes}
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

        {/* Mortality Dialog */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                Registrar Mortalidade - {selectedPond?.name}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleMortalitySubmit} className="space-y-4">
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span>População atual:</span>
                    <span className="font-medium">
                      {selectedPond?.current_batch?.current_population.toLocaleString()} PL
                    </span>
                  </div>
                </div>
              </div>
              
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
                  max={selectedPond?.current_batch?.current_population || 0}
                  placeholder="Ex: 50"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="notes">Observações (opcional)</Label>
                <Textarea
                  id="notes"
                  name="notes"
                  placeholder="Ex: Mortalidade por estresse após chuva..."
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
                  variant="destructive"
                >
                  {submitting ? 'Registrando...' : 'Registrar Mortalidade'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}