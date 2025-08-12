import { useEffect, useState } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Plus, Fish, Waves, TrendingUp, Calendar, Scale } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Farm {
  id: string;
  name: string;
  location: string;
  total_area: number;
}

interface PondData {
  id: string;
  name: string;
  area: number;
  depth: number;
  status: string;
  current_batch?: {
    name: string;
    stocking_date: string;
    current_population: number;
    latest_biometry?: {
      average_weight: number;
      measurement_date: string;
    };
  };
}

export default function Dashboard() {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [ponds, setPonds] = useState<PondData[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);

  const loadDashboardData = async () => {
    try {
      // Load farms
      const { data: farmsData, error: farmsError } = await supabase
        .from('farms')
        .select('*')
        .eq('user_id', user?.id);

      if (farmsError) throw farmsError;
      setFarms(farmsData || []);

      if (farmsData && farmsData.length > 0) {
        // Load ponds with batch data
        const { data: pondsData, error: pondsError } = await supabase
          .from('ponds')
          .select(`
            *,
            pond_batches!inner(
              current_population,
              stocking_date,
              batches!inner(name),
              biometrics(
                average_weight,
                measurement_date
              )
            )
          `)
          .eq('farm_id', farmsData[0].id)
          .order('created_at');

        if (pondsError) throw pondsError;

        // Process pond data
        const processedPonds = pondsData?.map(pond => ({
          ...pond,
          current_batch: pond.pond_batches[0] ? {
            name: pond.pond_batches[0].batches.name,
            stocking_date: pond.pond_batches[0].stocking_date,
            current_population: pond.pond_batches[0].current_population,
            latest_biometry: pond.pond_batches[0].biometrics[0] || null
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

  if (loading) {
    return (
      <Layout>
        <div className="space-y-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-32 bg-muted rounded"></div>
              ))}
            </div>
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
          <h2 className="text-2xl font-semibold mb-2">Bem-vindo ao AquaHub!</h2>
          <p className="text-muted-foreground mb-6">
            Comece criando sua primeira fazenda para gerenciar seus viveiros e lotes.
          </p>
          <Button onClick={() => navigate('/farm')} className="bg-gradient-to-r from-primary to-accent">
            <Plus className="w-4 h-4 mr-2" />
            Criar Primeira Fazenda
          </Button>
        </div>
      </Layout>
    );
  }

  const activePonds = ponds.filter(p => p.status === 'in_use');
  const freePonds = ponds.filter(p => p.status === 'free');
  const totalBiomass = activePonds.reduce((sum, pond) => {
    if (pond.current_batch?.latest_biometry) {
      return sum + parseFloat(calculateBiomass(
        pond.current_batch.current_population,
        pond.current_batch.latest_biometry.average_weight
      ));
    }
    return sum;
  }, 0);

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground">
              Visão geral da fazenda {farms[0]?.name}
            </p>
          </div>
          <Button onClick={() => navigate('/farm')} variant="outline">
            <Waves className="w-4 h-4 mr-2" />
            Gerenciar Fazenda
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Biomassa Total</p>
                  <p className="text-2xl font-bold text-primary">{totalBiomass.toFixed(1)} kg</p>
                </div>
                <Scale className="w-8 h-8 text-primary/70" />
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
                <Fish className="w-8 h-8 text-success/70" />
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
                <Waves className="w-8 h-8 text-secondary-foreground/70" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-accent/10 to-accent/5 border-accent/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Viveiros</p>
                  <p className="text-2xl font-bold text-accent-hover">{ponds.length}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-accent/70" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Active Ponds */}
        {activePonds.length > 0 && (
          <div>
            <h2 className="text-2xl font-semibold mb-4">Viveiros em Produção</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activePonds.map((pond) => (
                <Card key={pond.id} className="shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-ocean)] transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{pond.name}</CardTitle>
                      <Badge variant="default" className="bg-success">Em Uso</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Lote:</span>
                        <span className="font-medium">{pond.current_batch?.name}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">DOC:</span>
                        <span className="font-medium">
                          {pond.current_batch ? calculateDOC(pond.current_batch.stocking_date) : 0} dias
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">População:</span>
                        <span className="font-medium">
                          {pond.current_batch?.current_population.toLocaleString()} PL
                        </span>
                      </div>
                      {pond.current_batch?.latest_biometry && (
                        <>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Peso Médio:</span>
                            <span className="font-medium">
                              {pond.current_batch.latest_biometry.average_weight}g
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Biomassa:</span>
                            <span className="font-medium text-primary">
                              {calculateBiomass(
                                pond.current_batch.current_population,
                                pond.current_batch.latest_biometry.average_weight
                              )} kg
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                    <div className="pt-2 border-t border-border">
                      <p className="text-xs text-muted-foreground flex items-center">
                        <Calendar className="w-3 h-3 mr-1" />
                        Área: {pond.area}m² | Prof: {pond.depth}m (estimado)
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Ações Rápidas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button 
                variant="outline" 
                className="h-auto p-4 justify-start"
                onClick={() => navigate('/stocking')}
              >
                <Plus className="w-5 h-5 mr-3" />
                <div className="text-left">
                  <div className="font-medium">Novo Povoamento</div>
                  <div className="text-sm text-muted-foreground">Iniciar novo lote</div>
                </div>
              </Button>
              <Button 
                variant="outline" 
                className="h-auto p-4 justify-start"
                onClick={() => navigate('/biometry')}
              >
                <Scale className="w-5 h-5 mr-3" />
                <div className="text-left">
                  <div className="font-medium">Registrar Biometria</div>
                  <div className="text-sm text-muted-foreground">Atualizar peso médio</div>
                </div>
              </Button>
              <Button 
                variant="outline" 
                className="h-auto p-4 justify-start"
                onClick={() => navigate('/mortality')}
              >
                <Fish className="w-5 h-5 mr-3" />
                <div className="text-left">
                  <div className="font-medium">Registrar Mortalidade</div>
                  <div className="text-sm text-muted-foreground">Controlar população</div>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}