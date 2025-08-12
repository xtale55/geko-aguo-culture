import { useEffect, useState } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Fish, Calendar, DollarSign, Users, ArrowLeft, Check, Package } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Farm {
  id: string;
  name: string;
}

interface Pond {
  id: string;
  name: string;
  area: number;
  depth: number;
  status: string;
}

interface BatchData {
  name: string;
  arrival_date: string;
  total_pl_quantity: number;
  pl_size: number;
  pl_cost: number;
  survival_rate: number;
}

interface PondAllocation {
  pond_id: string;
  pl_quantity: number;
  preparation_cost: number;
}

export default function Stocking() {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [ponds, setPonds] = useState<Pond[]>([]);
  const [step, setStep] = useState(1);
  const [batchData, setBatchData] = useState<BatchData>({
    name: '',
    arrival_date: '',
    total_pl_quantity: 0,
    pl_size: 0,
    pl_cost: 0,
    survival_rate: 85
  });
  const [allocations, setAllocations] = useState<PondAllocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
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
      // Load farms
      const { data: farmsData, error: farmsError } = await supabase
        .from('farms')
        .select('id, name')
        .eq('user_id', user?.id);

      if (farmsError) throw farmsError;
      setFarms(farmsData || []);

      if (farmsData && farmsData.length > 0) {
        // Load free ponds only
        const { data: pondsData, error: pondsError } = await supabase
          .from('ponds')
          .select('id, name, area, depth, status')
          .eq('farm_id', farmsData[0].id)
          .eq('status', 'free')
          .order('name');

        if (pondsError) throw pondsError;
        setPonds(pondsData || []);
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

  const handleBatchSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    setBatchData({
      name: formData.get('name') as string,
      arrival_date: formData.get('arrival_date') as string,
      total_pl_quantity: parseInt(formData.get('total_pl_quantity') as string),
      pl_size: parseFloat(formData.get('pl_size') as string),
      pl_cost: parseFloat(formData.get('pl_cost') as string),
      survival_rate: parseFloat(formData.get('survival_rate') as string)
    });
    
    // Initialize allocations for available ponds
    setAllocations(ponds.map(pond => ({
      pond_id: pond.id,
      pl_quantity: 0,
      preparation_cost: 0
    })));
    
    setStep(2);
  };

  const updateAllocation = (pondId: string, field: 'pl_quantity' | 'preparation_cost', value: number) => {
    setAllocations(prev => prev.map(alloc => 
      alloc.pond_id === pondId 
        ? { ...alloc, [field]: value }
        : alloc
    ));
  };

  const getTotalAllocated = () => {
    return allocations.reduce((sum, alloc) => sum + alloc.pl_quantity, 0);
  };

  const getRemainingPL = () => {
    return batchData.total_pl_quantity - getTotalAllocated();
  };

  const canProceed = () => {
    return getRemainingPL() === 0 && allocations.some(alloc => alloc.pl_quantity > 0);
  };

  const handleStocking = async () => {
    if (!canProceed()) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "A distribuição deve usar todas as PL disponíveis."
      });
      return;
    }

    setSubmitting(true);
    
    try {
      // Create batch
      const { data: batchResult, error: batchError } = await supabase
        .from('batches')
        .insert([{
          farm_id: farms[0].id,
          name: batchData.name,
          arrival_date: batchData.arrival_date,
          total_pl_quantity: batchData.total_pl_quantity,
          pl_size: batchData.pl_size,
          pl_cost: batchData.pl_cost,
          survival_rate: batchData.survival_rate
        }])
        .select()
        .single();

      if (batchError) throw batchError;

      // Create pond batches and update pond status
      const activePondBatches = allocations.filter(alloc => alloc.pl_quantity > 0);
      
      for (const allocation of activePondBatches) {
        // Calculate expected population with survival rate
        const expectedPopulation = Math.floor(allocation.pl_quantity * (batchData.survival_rate / 100));
        
        // Create pond batch
        const { error: pondBatchError } = await supabase
          .from('pond_batches')
          .insert([{
            pond_id: allocation.pond_id,
            batch_id: batchResult.id,
            pl_quantity: allocation.pl_quantity,
            current_population: expectedPopulation,
            stocking_date: batchData.arrival_date,
            preparation_cost: allocation.preparation_cost
          }]);

        if (pondBatchError) throw pondBatchError;

        // Update pond status to in_use
        const { error: pondUpdateError } = await supabase
          .from('ponds')
          .update({ status: 'in_use' })
          .eq('id', allocation.pond_id);

        if (pondUpdateError) throw pondUpdateError;
      }

      toast({
        title: "Povoamento realizado!",
        description: `Lote ${batchData.name} foi distribuído com sucesso em ${activePondBatches.length} viveiro(s).`
      });

      navigate('/dashboard');
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro no povoamento",
        description: error.message
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </Layout>
    );
  }

  if (farms.length === 0) {
    return (
      <Layout>
        <div className="text-center py-12">
          <Fish className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-2xl font-semibold mb-2">Fazenda não encontrada</h2>
          <p className="text-muted-foreground mb-6">
            Você precisa criar uma fazenda antes de fazer povoamentos.
          </p>
          <Button onClick={() => navigate('/farm')}>
            Ir para Fazenda
          </Button>
        </div>
      </Layout>
    );
  }

  if (ponds.length === 0) {
    return (
      <Layout>
        <div className="text-center py-12">
          <Fish className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-2xl font-semibold mb-2">Nenhum viveiro livre</h2>
          <p className="text-muted-foreground mb-6">
            Todos os viveiros estão em uso ou você não possui viveiros cadastrados.
          </p>
          <Button onClick={() => navigate('/farm')}>
            Gerenciar Viveiros
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
              onClick={() => step === 1 ? navigate('/dashboard') : setStep(1)}
              className="mb-2"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {step === 1 ? 'Voltar' : 'Etapa Anterior'}
            </Button>
            <h1 className="text-3xl font-bold text-foreground">Novo Povoamento</h1>
            <p className="text-muted-foreground">
              {step === 1 ? 'Registre os dados do lote de pós-larvas' : 'Distribua as PL pelos viveiros'}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
              step >= 1 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            }`}>
              {step > 1 ? <Check className="w-4 h-4" /> : '1'}
            </div>
            <div className={`w-16 h-1 ${step >= 2 ? 'bg-primary' : 'bg-muted'}`}></div>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
              step >= 2 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            }`}>
              2
            </div>
          </div>
        </div>

        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Package className="w-5 h-5 mr-2" />
                Dados do Lote
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleBatchSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome/ID do Lote</Label>
                    <Input
                      id="name"
                      name="name"
                      placeholder="Ex: Lote 001-2024"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="arrival_date">Data de Chegada</Label>
                    <Input
                      id="arrival_date"
                      name="arrival_date"
                      type="date"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="total_pl_quantity">Quantidade Total de PL</Label>
                    <Input
                      id="total_pl_quantity"
                      name="total_pl_quantity"
                      type="number"
                      placeholder="Ex: 500000"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pl_size">Tamanho (PL/g)</Label>
                    <Input
                      id="pl_size"
                      name="pl_size"
                      type="number"
                      step="0.01"
                      placeholder="Ex: 0.001"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pl_cost">Custo das PL (R$)</Label>
                    <Input
                      id="pl_cost"
                      name="pl_cost"
                      type="number"
                      step="0.01"
                      placeholder="Ex: 25000.00"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="survival_rate">Taxa de Sobrevivência (%)</Label>
                    <Input
                      id="survival_rate"
                      name="survival_rate"
                      type="number"
                      step="0.1"
                      defaultValue="85"
                      placeholder="Ex: 85.0"
                      required
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full">
                  Continuar para Distribuição
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <div className="space-y-6">
            {/* Summary */}
            <Card className="bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">{batchData.name}</h3>
                    <p className="text-muted-foreground">
                      {batchData.total_pl_quantity.toLocaleString()} PL • {batchData.pl_size} PL/g
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-primary">
                      {getRemainingPL().toLocaleString()}
                    </div>
                    <div className="text-sm text-muted-foreground">PL restantes</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Pond Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Distribuição por Viveiro</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {ponds.map((pond) => {
                  const allocation = allocations.find(a => a.pond_id === pond.id);
                  return (
                    <div key={pond.id} className="border border-border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h4 className="font-medium">{pond.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {pond.area.toLocaleString()} m² • {pond.depth}m
                          </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor={`pl-${pond.id}`}>Quantidade de PL</Label>
                          <Input
                            id={`pl-${pond.id}`}
                            type="number"
                            placeholder="0"
                            value={allocation?.pl_quantity || ''}
                            onChange={(e) => updateAllocation(pond.id, 'pl_quantity', parseInt(e.target.value) || 0)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`cost-${pond.id}`}>Custo de Preparação (R$)</Label>
                          <Input
                            id={`cost-${pond.id}`}
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={allocation?.preparation_cost || ''}
                            onChange={(e) => updateAllocation(pond.id, 'preparation_cost', parseFloat(e.target.value) || 0)}
                          />
                        </div>
                      </div>
                      {allocation && allocation.pl_quantity > 0 && (
                        <div className="mt-3 p-3 bg-muted/50 rounded text-sm">
                          <div className="flex justify-between">
                            <span>População esperada (após sobrevivência):</span>
                            <span className="font-medium">
                              {Math.floor(allocation.pl_quantity * (batchData.survival_rate / 100)).toLocaleString()} PL
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <Button 
                variant="outline" 
                onClick={() => setStep(1)}
                className="flex-1"
              >
                Voltar
              </Button>
              <Button 
                onClick={handleStocking}
                disabled={!canProceed() || submitting}
                className="flex-1"
              >
                {submitting ? 'Processando...' : 'Finalizar Povoamento'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}