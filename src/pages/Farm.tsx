import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Plus, Fish, Waves, Edit, Trash2, MapPin, Activity, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { StockingContent } from '@/components/StockingContent';

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
}

export default function Farm() {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [ponds, setPonds] = useState<Pond[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFarmDialog, setShowFarmDialog] = useState(false);
  const [showPondDialog, setShowPondDialog] = useState(false);
  const [selectedPondForStocking, setSelectedPondForStocking] = useState<string | undefined>();
  const [activeTab, setActiveTab] = useState("viveiros");
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      loadFarmData();
    }
  }, [user]);

  const loadFarmData = async () => {
    try {
      // Load farms
      const { data: farmsData, error: farmsError } = await supabase
        .from('farms')
        .select('*')
        .eq('user_id', user?.id);

      if (farmsError) throw farmsError;
      setFarms(farmsData || []);

      if (farmsData && farmsData.length > 0) {
        // Load all ponds
        const { data: pondsData, error: pondsError } = await supabase
          .from('ponds')
          .select('*')
          .eq('farm_id', farmsData[0].id)
          .order('created_at');

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

  const handleCreateFarm = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    try {
      const { data, error } = await supabase
        .from('farms')
        .insert([{
          user_id: user?.id,
          name: formData.get('name') as string,
          location: formData.get('location') as string,
          total_area: parseFloat(formData.get('total_area') as string)
        }])
        .select();

      if (error) throw error;

      toast({
        title: "Fazenda criada!",
        description: "Sua fazenda foi criada com sucesso."
      });

      setShowFarmDialog(false);
      loadFarmData();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message
      });
    }
  };

  const handleCreatePond = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    try {
      const { data, error } = await supabase
        .from('ponds')
        .insert([{
          farm_id: farms[0].id,
          name: formData.get('name') as string,
          area: parseFloat(formData.get('area') as string),
          depth: parseFloat(formData.get('depth') as string)
        }])
        .select();

      if (error) throw error;

      toast({
        title: "Viveiro criado!",
        description: "Seu viveiro foi criado com sucesso."
      });

      setShowPondDialog(false);
      loadFarmData();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message
      });
    }
  };

  const handleDeletePond = async (pondId: string) => {
    if (!confirm('Tem certeza que deseja excluir este viveiro?')) return;

    try {
      const { error } = await supabase
        .from('ponds')
        .delete()
        .eq('id', pondId);

      if (error) throw error;

      toast({
        title: "Viveiro excluído",
        description: "O viveiro foi removido com sucesso."
      });

      loadFarmData();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message
      });
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-48 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  if (farms.length === 0) {
    return (
      <Layout>
        <div className="text-center py-12">
          <Fish className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-2xl font-semibold mb-2">Criar Primeira Fazenda</h2>
          <p className="text-muted-foreground mb-6">
            Configure sua fazenda para começar a gerenciar os viveiros.
          </p>
          
          <Dialog open={showFarmDialog} onOpenChange={setShowFarmDialog}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-primary to-accent">
                <Plus className="w-4 h-4 mr-2" />
                Criar Fazenda
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nova Fazenda</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateFarm} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome da Fazenda</Label>
                  <Input
                    id="name"
                    name="name"
                    placeholder="Ex: Fazenda São Pedro"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">Localização</Label>
                  <Input
                    id="location"
                    name="location"
                    placeholder="Ex: Fortaleza - CE"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="total_area">Área Total (hectares)</Label>
                  <Input
                    id="total_area"
                    name="total_area"
                    type="number"
                    step="0.1"
                    placeholder="Ex: 10.5"
                    required
                  />
                </div>
                <Button type="submit" className="w-full">
                  Criar Fazenda
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </Layout>
    );
  }

  const currentFarm = farms[0];
  const activePonds = ponds.filter(p => p.status === 'in_use');
  const freePonds = ponds.filter(p => p.status === 'free');

  return (
    <Layout>
      <div className="space-y-6">
        {/* Farm Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-foreground">{currentFarm.name}</h1>
            <div className="flex items-center text-muted-foreground mt-1">
              <MapPin className="w-4 h-4 mr-1" />
              <span>{currentFarm.location}</span>
              <span className="mx-2">•</span>
              <span>{currentFarm.total_area} hectares</span>
            </div>
          </div>
          
          <Dialog open={showPondDialog} onOpenChange={setShowPondDialog}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-accent to-accent-hover">
                <Plus className="w-4 h-4 mr-2" />
                Novo Viveiro
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Novo Viveiro</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreatePond} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="pond-name">Nome/ID do Viveiro</Label>
                  <Input
                    id="pond-name"
                    name="name"
                    placeholder="Ex: Viveiro 01 ou V1"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="area">Área (m²)</Label>
                  <Input
                    id="area"
                    name="area"
                    type="number"
                    step="0.1"
                    placeholder="Ex: 2500"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="depth">Profundidade (m)</Label>
                  <Input
                    id="depth"
                    name="depth"
                    type="number"
                    step="0.1"
                    placeholder="Ex: 1.5"
                    required
                  />
                </div>
                <Button type="submit" className="w-full">
                  Criar Viveiro
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total de Viveiros</p>
                  <p className="text-2xl font-bold text-primary">{ponds.length}</p>
                </div>
                <Waves className="w-8 h-8 text-primary/70" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-success/10 to-success/5 border-success/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Viveiros Ativos</p>
                  <p className="text-2xl font-bold text-success">{activePonds.length}</p>
                </div>
                <Activity className="w-8 h-8 text-success/70" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-secondary/30 to-secondary/10 border-secondary/40">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Viveiros Livres</p>
                  <p className="text-2xl font-bold text-secondary-foreground">{freePonds.length}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-secondary-foreground/70" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 h-12 p-1 bg-muted/50 border border-border/50">
            <TabsTrigger 
              value="viveiros" 
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm font-medium text-foreground/80 data-[state=active]:font-semibold transition-all"
            >
              Viveiros
            </TabsTrigger>
            <TabsTrigger 
              value="povoamento" 
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm font-medium text-foreground/80 data-[state=active]:font-semibold transition-all"
            >
              Povoamento
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="viveiros" className="space-y-4 mt-6">
            {renderFarmContent()}
          </TabsContent>
          
          <TabsContent value="povoamento" className="space-y-4 mt-6">
            <StockingContent 
              selectedPondId={selectedPondForStocking}
              onBack={() => {
                setSelectedPondForStocking(undefined);
                setActiveTab("viveiros");
              }}
            />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );

  function renderFarmContent() {
    return (
      <>
      {/* Ponds Grid */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-semibold">Viveiros</h2>
        </div>

        {ponds.length === 0 ? (
          <Card className="p-12 text-center">
            <Waves className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Nenhum viveiro cadastrado</h3>
            <p className="text-muted-foreground mb-6">
              Crie seus primeiros viveiros para começar a operação.
            </p>
            <Button onClick={() => setShowPondDialog(true)} className="bg-gradient-to-r from-accent to-accent-hover">
              <Plus className="w-4 h-4 mr-2" />
              Criar Primeiro Viveiro
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {ponds.map((pond) => (
              <Card key={pond.id} className="shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-ocean)] transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{pond.name}</CardTitle>
                    <Badge 
                      variant={pond.status === 'in_use' ? 'default' : 'secondary'}
                      className={pond.status === 'in_use' ? 'bg-success' : ''}
                    >
                      {pond.status === 'in_use' ? 'Em Uso' : 'Livre'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Área:</span>
                      <span className="font-medium">{pond.area.toLocaleString()} m²</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Profundidade:</span>
                      <span className="font-medium">{pond.depth}m</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Volume:</span>
                      <span className="font-medium">
                        {(pond.area * pond.depth).toLocaleString()} m³
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2 border-t border-border">
                    {pond.status === 'free' && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1"
                        onClick={() => {
                          setSelectedPondForStocking(pond.id);
                          setActiveTab("povoamento");
                        }}
                      >
                        <Fish className="w-4 h-4 mr-1" />
                        Povoar
                      </Button>
                    )}
                    <Button 
                      variant="outline" 
                      size="sm"
                      disabled={pond.status === 'in_use'}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      disabled={pond.status === 'in_use'}
                      onClick={() => handleDeletePond(pond.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
    );
  }
}