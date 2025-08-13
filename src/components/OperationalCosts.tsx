import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, DollarSign, Trash2, Users, Zap, Fuel, Package } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface OperationalCost {
  id: string;
  category: 'labor' | 'energy' | 'fuel' | 'other';
  amount: number;
  cost_date: string;
  description: string;
  farm_id: string;
  pond_batch_id?: string;
  created_at: string;
  updated_at: string;
}

interface PondBatch {
  id: string;
  pond_name: string;
  batch_name: string;
}

interface CostSummary {
  labor: number;
  energy: number;
  fuel: number;
  other: number;
  total: number;
}

export function OperationalCosts() {
  const [costs, setCosts] = useState<OperationalCost[]>([]);
  const [pondBatches, setPondBatches] = useState<PondBatch[]>([]);
  const [costSummary, setCostSummary] = useState<CostSummary>({
    labor: 0,
    energy: 0,
    fuel: 0,
    other: 0,
    total: 0
  });
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newCost, setNewCost] = useState({
    category: '',
    amount: '',
    cost_date: new Date().toISOString().split('T')[0],
    description: '',
    pond_batch_id: ''
  });
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      loadOperationalCosts();
    }
  }, [user]);

  const loadOperationalCosts = async () => {
    try {
      setLoading(true);

      // Get farms
      const { data: farms } = await supabase
        .from('farms')
        .select('id')
        .eq('user_id', user?.id);

      if (!farms || farms.length === 0) {
        setLoading(false);
        return;
      }

      const farmIds = farms.map(f => f.id);

      // Get pond batches for dropdown
      const { data: pondBatchesData } = await supabase
        .from('pond_batches')
        .select(`
          id,
          ponds(name),
          batches(name)
        `)
        .in('pond_id', 
          await supabase
            .from('ponds')
            .select('id')
            .in('farm_id', farmIds)
            .then(({ data }) => data?.map(p => p.id) || [])
        )
        .gte('current_population', 1);

      if (pondBatchesData) {
        const formattedPondBatches = pondBatchesData.map(pb => ({
          id: pb.id,
          pond_name: pb.ponds?.name || 'N/A',
          batch_name: pb.batches?.name || 'N/A'
        }));
        setPondBatches(formattedPondBatches);
      }

      // Get costs from last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: operationalCosts } = await supabase
        .from('operational_costs')
        .select('*')
        .in('farm_id', farmIds)
        .gte('cost_date', thirtyDaysAgo.toISOString().split('T')[0])
        .order('cost_date', { ascending: false });

      if (operationalCosts) {
        // Type assertion to ensure correct category types
        const typedCosts = operationalCosts.map(cost => ({
          ...cost,
          category: cost.category as 'labor' | 'energy' | 'fuel' | 'other'
        }));
        
        setCosts(typedCosts);

        // Calculate summary
        const summary: CostSummary = {
          labor: 0,
          energy: 0,
          fuel: 0,
          other: 0,
          total: 0
        };

        typedCosts.forEach(cost => {
          summary[cost.category] += cost.amount;
          summary.total += cost.amount;
        });

        setCostSummary(summary);
      }

    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao carregar custos operacionais",
        description: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddCost = async () => {
    try {
      if (!newCost.category || !newCost.amount || !newCost.description) {
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Preencha todos os campos obrigatórios"
        });
        return;
      }

      // Get farm ID
      const { data: farms } = await supabase
        .from('farms')
        .select('id')
        .eq('user_id', user?.id);

      if (!farms || farms.length === 0) {
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Fazenda não encontrada"
        });
        return;
      }

      const farmId = farms[0].id;
      const totalAmount = parseFloat(newCost.amount);

      // Se for custo geral, distribuir entre viveiros ativos
      if (newCost.pond_batch_id === "general") {
        // Buscar todos os pond_batches ativos
        const { data: activePondBatches } = await supabase
          .from('pond_batches')
          .select(`
            id, 
            current_population,
            ponds!inner(farm_id),
            biometrics(average_weight)
          `)
          .eq('ponds.farm_id', farmId)
          .gt('current_population', 0)
          .order('biometrics.created_at', { ascending: false });

        if (!activePondBatches || activePondBatches.length === 0) {
          toast({
            variant: "destructive",
            title: "Erro",
            description: "Nenhum viveiro ativo encontrado para distribuir o custo"
          });
          return;
        }

        // Calcular biomassa total para distribuição proporcional
        let totalBiomass = 0;
        const pondBiomassData: { pond_batch_id: string; biomass: number }[] = [];

        activePondBatches.forEach(pb => {
          const latestBiometry = pb.biometrics?.[0];
          const biomass = latestBiometry ? 
            (pb.current_population * latestBiometry.average_weight) / 1000 : 
            pb.current_population * 0.005; // Peso padrão se não houver biometria
          
          totalBiomass += biomass;
          pondBiomassData.push({
            pond_batch_id: pb.id,
            biomass
          });
        });

        // Criar registros proporcionais para cada viveiro
        const costsToInsert = pondBiomassData.map(({ pond_batch_id, biomass }) => ({
          farm_id: farmId,
          pond_batch_id,
          category: newCost.category as 'labor' | 'energy' | 'fuel' | 'other',
          amount: (totalAmount * biomass) / totalBiomass,
          cost_date: newCost.cost_date,
          description: `${newCost.description} (distribuído por biomassa)`
        }));

        const { error } = await supabase
          .from('operational_costs')
          .insert(costsToInsert);

        if (error) throw error;

        toast({
          title: "Custo distribuído",
          description: `Custo de R$ ${totalAmount.toFixed(2)} distribuído entre ${costsToInsert.length} viveiros ativos`
        });

      } else {
        // Custo específico do viveiro
        const costData: any = {
          farm_id: farmId,
          category: newCost.category as 'labor' | 'energy' | 'fuel' | 'other',
          amount: totalAmount,
          cost_date: newCost.cost_date,
          description: newCost.description
        };

        if (newCost.pond_batch_id) {
          costData.pond_batch_id = newCost.pond_batch_id;
        }

        const { error } = await supabase
          .from('operational_costs')
          .insert(costData);

        if (error) throw error;

        toast({
          title: "Custo adicionado",
          description: "Custo operacional registrado com sucesso"
        });
      }

      setIsDialogOpen(false);
      setNewCost({
        category: '',
        amount: '',
        cost_date: new Date().toISOString().split('T')[0],
        description: '',
        pond_batch_id: ''
      });
      loadOperationalCosts();

    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao adicionar custo",
        description: error.message
      });
    }
  };

  const handleDeleteCost = async (costId: string) => {
    try {
      const { error } = await supabase
        .from('operational_costs')
        .delete()
        .eq('id', costId);

      if (error) throw error;

      toast({
        title: "Custo removido",
        description: "Custo operacional removido com sucesso"
      });

      loadOperationalCosts();

    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao remover custo",
        description: error.message
      });
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'labor':
        return <Users className="w-4 h-4" />;
      case 'energy':
        return <Zap className="w-4 h-4" />;
      case 'fuel':
        return <Fuel className="w-4 h-4" />;
      default:
        return <Package className="w-4 h-4" />;
    }
  };

  const getCategoryName = (category: string) => {
    switch (category) {
      case 'labor':
        return 'Mão de Obra';
      case 'energy':
        return 'Energia';
      case 'fuel':
        return 'Combustível';
      default:
        return 'Outros';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'labor':
        return 'bg-primary/10 text-primary border-primary/20';
      case 'energy':
        return 'bg-warning/10 text-warning border-warning/20';
      case 'fuel':
        return 'bg-destructive/10 text-destructive border-destructive/20';
      default:
        return 'bg-accent/10 text-accent border-accent/20';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Custos Operacionais
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-muted rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="w-5 h-5" />
          Custos Operacionais (30 dias)
        </CardTitle>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Custo
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Registrar Custo Operacional</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="category">Categoria</Label>
                <Select value={newCost.category} onValueChange={(value) => setNewCost({...newCost, category: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="labor">Mão de Obra</SelectItem>
                    <SelectItem value="energy">Energia</SelectItem>
                    <SelectItem value="fuel">Combustível</SelectItem>
                    <SelectItem value="other">Outros</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="amount">Valor (R$)</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={newCost.amount}
                  onChange={(e) => setNewCost({...newCost, amount: e.target.value})}
                  placeholder="0.00"
                />
              </div>
              
              <div>
                <Label htmlFor="cost_date">Data</Label>
                <Input
                  id="cost_date"
                  type="date"
                  value={newCost.cost_date}
                  onChange={(e) => setNewCost({...newCost, cost_date: e.target.value})}
                />
              </div>
              
              <div>
                <Label htmlFor="description">Descrição</Label>
                <Input
                  id="description"
                  value={newCost.description}
                  onChange={(e) => setNewCost({...newCost, description: e.target.value})}
                  placeholder="Descreva o custo..."
                />
              </div>
              
              <div>
                <Label htmlFor="pond_batch">Viveiro (Opcional)</Label>
                <Select value={newCost.pond_batch_id} onValueChange={(value) => setNewCost({...newCost, pond_batch_id: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o viveiro (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">Geral (todos os viveiros)</SelectItem>
                    {pondBatches.map(pb => (
                      <SelectItem key={pb.id} value={pb.id}>
                        {pb.pond_name} - {pb.batch_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <Button onClick={handleAddCost} className="w-full">
                Registrar Custo
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-primary/10 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-4 h-4 text-primary" />
              <p className="text-xs text-muted-foreground">Mão de Obra</p>
            </div>
            <p className="text-lg font-bold text-primary">R$ {costSummary.labor.toFixed(0)}</p>
          </div>
          <div className="bg-warning/10 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="w-4 h-4 text-warning" />
              <p className="text-xs text-muted-foreground">Energia</p>
            </div>
            <p className="text-lg font-bold text-warning">R$ {costSummary.energy.toFixed(0)}</p>
          </div>
          <div className="bg-destructive/10 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Fuel className="w-4 h-4 text-destructive" />
              <p className="text-xs text-muted-foreground">Combustível</p>
            </div>
            <p className="text-lg font-bold text-destructive">R$ {costSummary.fuel.toFixed(0)}</p>
          </div>
          <div className="bg-accent/10 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Package className="w-4 h-4 text-accent" />
              <p className="text-xs text-muted-foreground">Outros</p>
            </div>
            <p className="text-lg font-bold text-accent">R$ {costSummary.other.toFixed(0)}</p>
          </div>
          <div className="bg-success/10 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-4 h-4 text-success" />
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
            <p className="text-lg font-bold text-success">R$ {costSummary.total.toFixed(0)}</p>
          </div>
        </div>

        {/* Recent Costs */}
        <div className="space-y-3">
          <h3 className="font-medium text-sm">Registros Recentes</h3>
          {costs.length === 0 ? (
            <p className="text-muted-foreground text-sm">Nenhum custo operacional registrado nos últimos 30 dias.</p>
          ) : (
            costs.slice(0, 10).map((cost) => (
              <div key={cost.id} className="border rounded-lg p-3">
                <div className="flex justify-between items-start">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${getCategoryColor(cost.category)}`}>
                      {getCategoryIcon(cost.category)}
                    </div>
                    <div>
                      <h4 className="font-medium text-sm">{cost.description}</h4>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline" className="text-xs">
                          {getCategoryName(cost.category)}
                        </Badge>
                        <span>•</span>
                        <span>{new Date(cost.cost_date).toLocaleDateString('pt-BR')}</span>
                        {cost.pond_batch_id && (
                          <>
                            <span>•</span>
                            <Badge variant="secondary" className="text-xs">
                              {pondBatches.find(pb => pb.id === cost.pond_batch_id)?.pond_name || 'Viveiro'}
                            </Badge>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-lg">R$ {cost.amount.toFixed(2)}</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteCost(cost.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}