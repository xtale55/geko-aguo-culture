import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { getCurrentDateForInput } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, MapPin, Calendar, Package, Calculator, Percent, User } from "lucide-react";
import { Shrimp } from '@phosphor-icons/react';

interface Farm {
  id: string;
  name: string;
  location: string;
  total_area: number;
}

interface Pond {
  id: string;
  name: string;
  area: number;
  depth: number;
  status: 'free' | 'in_use' | 'maintenance';
  farm_id: string;
}

interface BatchData {
  name: string;
  arrival_date: string;
  initial_quantity: number;
  size_cm: number;
  cost_per_thousand: number;
  survival_rate: number;
}

interface PondAllocation {
  pond_id: string;
  quantity: number;
  preparation_cost: number;
}


export function StockingContent() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [farms, setFarms] = useState<Farm[]>([]);
  const [ponds, setPonds] = useState<Pond[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [step, setStep] = useState<'batch' | 'allocation'>('batch');
  
  const [batchData, setBatchData] = useState<BatchData>({
    name: '',
    arrival_date: getCurrentDateForInput(),
    initial_quantity: 0,
    size_cm: 0,
    cost_per_thousand: 0,
    survival_rate: 85
  });

  const [allocations, setAllocations] = useState<PondAllocation[]>([]);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  useEffect(() => {
    if (ponds.length > 0) {
      // Initialize allocations for all free ponds
      const initialAllocations = ponds.map(pond => ({
        pond_id: pond.id,
        quantity: 0,
        preparation_cost: 0
      }));
      setAllocations(initialAllocations);
    }
  }, [ponds]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      
      const { data: farmsData, error: farmsError } = await supabase
        .from('farms')
        .select('*')
        .eq('user_id', user?.id);

      if (farmsError) throw farmsError;

      if (farmsData && farmsData.length > 0) {
        setFarms(farmsData);
        
        const { data: pondsData, error: pondsError } = await supabase
          .from('ponds')
          .select('*')
          .in('farm_id', farmsData.map(f => f.id))
          .eq('status', 'free');

        if (pondsError) throw pondsError;
        
        setPonds((pondsData || []).map(pond => ({
          ...pond,
          status: pond.status as 'free' | 'in_use' | 'maintenance'
        })));
        
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBatchSubmit = () => {
    // Validação de campos obrigatórios
    if (!batchData.name) {
      toast.error('Nome do lote é obrigatório');
      return;
    }
    
    if (!batchData.arrival_date) {
      toast.error('Data de chegada é obrigatória');
      return;
    }
    
    if (batchData.initial_quantity <= 0) {
      toast.error('Quantidade inicial deve ser maior que zero');
      return;
    }
    
    if (batchData.size_cm <= 0) {
      toast.error('PLs por grama deve ser maior que zero');
      return;
    }
    
    if (batchData.size_cm > 999) {
      toast.error('PLs por grama deve ser no máximo 999');
      return;
    }
    
    if (batchData.cost_per_thousand <= 0) {
      toast.error('Custo por milheiro deve ser maior que zero');
      return;
    }
    
    if (batchData.survival_rate <= 0 || batchData.survival_rate > 100) {
      toast.error('Taxa de sobrevivência deve estar entre 0,1% e 100%');
      return;
    }
    
    // Validar formato da data
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(batchData.arrival_date)) {
      toast.error('Formato de data inválido');
      return;
    }
    
    setStep('allocation');
  };

  const updateAllocation = (pondId: string, field: 'quantity' | 'preparation_cost', value: number) => {
    setAllocations(prev => prev.map(alloc => 
      alloc.pond_id === pondId 
        ? { ...alloc, [field]: value }
        : alloc
    ));
  };

  const getTotalAllocated = () => {
    return allocations.reduce((sum, alloc) => sum + alloc.quantity, 0);
  };

  const getRemainingPL = () => {
    return batchData.initial_quantity - getTotalAllocated();
  };

  const canProceed = () => {
    return getTotalAllocated() > 0 && getRemainingPL() >= 0;
  };

  const handleStocking = async () => {
    if (!canProceed()) {
      toast.error('Verifique a alocação de PLs nos viveiros');
      return;
    }

    const allocatedPonds = allocations.filter(a => a.quantity > 0);
    
    // Validações detalhadas
    if (!farms || farms.length === 0) {
      toast.error('Nenhuma fazenda encontrada para o povoamento');
      return;
    }

    if (allocatedPonds.length === 0) {
      toast.error('Você precisa alocar PLs em pelo menos um viveiro');
      return;
    }

    // Verificar se alguma alocação excede o disponível
    const totalAllocated = getTotalAllocated();
    if (totalAllocated > batchData.initial_quantity) {
      toast.error(`Total alocado (${totalAllocated.toLocaleString()}) excede quantidade disponível (${batchData.initial_quantity.toLocaleString()})`);
      return;
    }

    try {
      // Usar transação do Supabase para operações múltiplas
      const { data: batchResult, error: batchError } = await supabase
        .from('batches')
        .insert({
          farm_id: farms[0].id,
          name: batchData.name,
          arrival_date: batchData.arrival_date,
          total_pl_quantity: batchData.initial_quantity,
          pl_size: batchData.size_cm,
          pl_cost: batchData.cost_per_thousand,
          survival_rate: batchData.survival_rate
        })
        .select()
        .single();

      if (batchError) {
        console.error('Erro ao criar lote:', batchError);
        if (batchError.code === '23505') {
          throw new Error('Já existe um lote com este nome na fazenda');
        }
        if (batchError.code === '23502') {
          throw new Error('Dados obrigatórios do lote não foram preenchidos');
        }
        throw new Error(`Erro ao criar lote: ${batchError.message}`);
      }

      // Processar cada viveiro em sequência para evitar conflitos
      for (const allocation of allocatedPonds) {
        // Verificar se o viveiro ainda está livre
        const { data: pondCheck, error: pondCheckError } = await supabase
          .from('ponds')
          .select('status')
          .eq('id', allocation.pond_id)
          .single();

        if (pondCheckError) {
          throw new Error(`Erro ao verificar viveiro: ${pondCheckError.message}`);
        }

        if (pondCheck.status !== 'free') {
          throw new Error(`O viveiro não está mais disponível para povoamento`);
        }
        
        // Criar pond_batch record
        const pondBatchData = {
          pond_id: allocation.pond_id,
          batch_id: batchResult.id,
          pl_quantity: allocation.quantity,
          current_population: Math.floor(allocation.quantity * (batchData.survival_rate / 100)),
          stocking_date: batchData.arrival_date,
          preparation_cost: allocation.preparation_cost || 0
        };
        
        const { error: pondBatchError } = await supabase
          .from('pond_batches')
          .insert(pondBatchData);

        if (pondBatchError) {
          console.error('Erro ao criar pond_batch:', pondBatchError);
          if (pondBatchError.code === '23505') {
            throw new Error('Este viveiro já possui um lote ativo');
          }
          throw new Error(`Erro ao registrar lote no viveiro: ${pondBatchError.message}`);
        }

        // Atualizar status do viveiro
        const { error: pondUpdateError } = await supabase
          .from('ponds')
          .update({ status: 'in_use' })
          .eq('id', allocation.pond_id);

        if (pondUpdateError) {
          console.error('Erro ao atualizar viveiro:', pondUpdateError);
          throw new Error(`Erro ao atualizar status do viveiro: ${pondUpdateError.message}`);
        }
      }

      toast.success(`Povoamento realizado com sucesso! ${allocatedPonds.length} viveiro(s) povoado(s).`);
      navigate('/farm');
      
    } catch (error: any) {
      console.error('Erro durante povoamento:', error);
      
      // Mensagens de erro mais claras em português
      let errorMessage = 'Erro inesperado ao realizar o povoamento';
      
      if (error.message) {
        errorMessage = error.message;
      } else if (error?.code) {
        switch (error.code) {
          case '23505':
            errorMessage = 'Dados duplicados encontrados. Verifique se o viveiro já possui um lote.';
            break;
          case '23502':
            errorMessage = 'Campos obrigatórios não foram preenchidos corretamente.';
            break;
          case '23503':
            errorMessage = 'Erro de relacionamento nos dados. Verifique se a fazenda e viveiros existem.';
            break;
          case 'PGRST116':
            errorMessage = 'Dados não encontrados. Verifique se a fazenda e viveiros ainda existem.';
            break;
          default:
            errorMessage = `Erro do sistema (${error.code}). Tente novamente.`;
        }
      }
      
      toast.error(errorMessage);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (farms.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <Shrimp className="h-16 w-16 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">Nenhuma fazenda encontrada</h3>
        <p className="text-muted-foreground mb-4">
          Você precisa criar uma fazenda antes de realizar o povoamento.
        </p>
        <Button onClick={() => navigate('/farm')}>
          <MapPin className="mr-2 h-4 w-4" />
          Ir para Fazendas
        </Button>
      </div>
    );
  }

  if (ponds.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <Package className="h-16 w-16 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">Nenhum viveiro livre</h3>
        <p className="text-muted-foreground mb-4">
          Todos os viveiros estão ocupados ou em manutenção.
        </p>
        <Button onClick={() => navigate('/farm')}>
          <MapPin className="mr-2 h-4 w-4" />
          Gerenciar Viveiros
        </Button>
      </div>
    );
  }

  if (step === 'batch') {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shrimp className="h-5 w-5" />
              Dados do Lote de PLs
            </CardTitle>
            <CardDescription>
              Informe os detalhes do lote de pós-larvas que chegou
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome do Lote *</Label>
                <Input
                  id="name"
                  placeholder="Ex: Lote Janeiro 2024"
                  value={batchData.name}
                  onChange={(e) => setBatchData(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="arrival_date">Data de Chegada *</Label>
                <Input
                  id="arrival_date"
                  type="date"
                  value={batchData.arrival_date}
                  onChange={(e) => setBatchData(prev => ({ ...prev, arrival_date: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="initial_quantity">Quantidade Inicial *</Label>
                <Input
                  id="initial_quantity"
                  type="number"
                  placeholder="Ex: 50000"
                  value={batchData.initial_quantity || ''}
                  onChange={(e) => setBatchData(prev => ({ ...prev, initial_quantity: parseInt(e.target.value) || 0 }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="size_cm" className="flex items-center gap-2">
                  PLs por Grama *
                  <span className="text-xs font-normal text-muted-foreground" title="Típico: 8-15 PLs/g para cultivo padrão">
                    (1-999 PLs/g)
                  </span>
                </Label>
                <Input
                  id="size_cm"
                  type="number"
                  step="1"
                  min="1"
                  max="999"
                  placeholder="Ex: 10"
                  value={batchData.size_cm || ''}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value) || 0;
                    if (value <= 999) {
                      setBatchData(prev => ({ ...prev, size_cm: value }));
                    }
                  }}
                  className={batchData.size_cm > 999 ? "border-destructive" : ""}
                />
                <div className="flex flex-col gap-1">
                  <p className="text-xs text-muted-foreground">
                    Número de pós-larvas por grama (peso)
                  </p>
                  {batchData.size_cm > 999 && (
                    <p className="text-xs text-destructive">
                      Valor máximo é 999 PLs/g
                    </p>
                  )}
                  {batchData.size_cm >= 1 && batchData.size_cm <= 15 && (
                    <p className="text-xs text-green-600">
                      ✓ Valor dentro do range recomendado
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cost_per_thousand">Custo por Milheiro (R$) *</Label>
                <Input
                  id="cost_per_thousand"
                  type="number"
                  step="0.01"
                  placeholder="Ex: 80.00"
                  value={batchData.cost_per_thousand || ''}
                  onChange={(e) => setBatchData(prev => ({ ...prev, cost_per_thousand: parseFloat(e.target.value) || 0 }))}
                />
              </div>

                <div className="space-y-2">
                  <Label htmlFor="survival_rate">Taxa de Sobrevivência (%) *</Label>
                  <Input
                    id="survival_rate"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    placeholder="Ex: 85.5"
                    value={batchData.survival_rate || ''}
                    onChange={(e) => setBatchData(prev => ({ ...prev, survival_rate: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button onClick={handleBatchSubmit}>
                Próximo: Alocar PLs
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => setStep('batch')}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Voltar aos Dados do Lote
      </Button>

      {/* Batch Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Resumo do Lote</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Nome</p>
              <p className="font-medium">{batchData.name}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Quantidade</p>
              <p className="font-medium">{batchData.initial_quantity.toLocaleString()} PLs</p>
            </div>
            <div>
              <p className="text-muted-foreground">PLs/g</p>
              <p className="font-medium">{batchData.size_cm} PLs/g</p>
            </div>
            <div>
              <p className="text-muted-foreground">Sobrevivência</p>
              <p className="font-medium">{batchData.survival_rate}%</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Allocation */}
      <Card>
        <CardHeader>
          <CardTitle>Distribuição dos PLs</CardTitle>
          <CardDescription>
            Distribua os {batchData.initial_quantity.toLocaleString()} PLs entre os viveiros disponíveis
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {allocations.map(allocation => {
              const pond = ponds.find(p => p.id === allocation.pond_id);
              if (!pond) return null;

              const farm = farms.find(f => f.id === pond.farm_id);
              const expectedSurvival = Math.floor(allocation.quantity * (batchData.survival_rate / 100));

              return (
                <div key={pond.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium">{pond.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {farm?.name} • {pond.area}m² • {pond.depth}m profundidade
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor={`quantity-${pond.id}`}>Quantidade de PLs</Label>
                      <Input
                        id={`quantity-${pond.id}`}
                        type="number"
                        value={allocation.quantity || ''}
                        onChange={(e) => updateAllocation(pond.id, 'quantity', parseInt(e.target.value) || 0)}
                        placeholder="0"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`cost-${pond.id}`}>Custo de Preparação (R$)</Label>
                      <Input
                        id={`cost-${pond.id}`}
                        type="number"
                        step="0.01"
                        value={allocation.preparation_cost || ''}
                        onChange={(e) => updateAllocation(pond.id, 'preparation_cost', parseFloat(e.target.value) || 0)}
                        placeholder="Ex: 5000"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>População Esperada</Label>
                      <div className="h-10 px-3 py-2 bg-muted rounded-md flex items-center">
                        <span className="text-sm font-medium">
                          {expectedSurvival.toLocaleString()} camarões
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 p-4 bg-muted rounded-lg">
            <div className="flex justify-between items-center text-sm">
              <span>PLs Alocados:</span>
              <span className="font-medium">{getTotalAllocated().toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span>PLs Restantes:</span>
              <span className={`font-medium ${getRemainingPL() < 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                {getRemainingPL().toLocaleString()}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="sticky bottom-0 bg-background border-t p-4">
        <div className="flex justify-end">
          <div className="space-y-2">
            {!canProceed() && (
              <p className="text-sm text-muted-foreground text-right">
                {getTotalAllocated() === 0 
                  ? "Distribua as PLs entre os viveiros para continuar" 
                  : getRemainingPL() < 0 
                    ? "Quantidade alocada excede o disponível" 
                    : "Verifique a distribuição"}
              </p>
            )}
            <Button 
              onClick={handleStocking}
              disabled={!canProceed()}
              size="lg"
              className="w-full md:w-auto"
            >
              <Shrimp className="mr-2 h-4 w-4" />
              Confirmar Povoamento
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}