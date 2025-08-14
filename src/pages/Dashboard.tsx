import { useEffect, useState } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, Fish, Waves, TrendingUp, Calendar, Scale, Utensils, 
  Activity, Droplets, Package, AlertTriangle, Users, ClipboardList
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Farm {
  id: string;
  name: string;
  location: string;
  total_area: number;
}

interface DashboardStats {
  totalPonds: number;
  activePonds: number;
  totalPopulation: number;
  totalBiomass: number;
  averageWeight: number;
  todayMortality: number;
  inventoryValue: number;
  criticalAlerts: number;
  pendingTasks: string[];
}

interface RecentActivity {
  id: string;
  type: 'stocking' | 'biometry' | 'mortality' | 'feeding' | 'water_quality' | 'inventory';
  description: string;
  date: string;
  pond?: string;
  value?: number;
}

export default function Dashboard() {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalPonds: 0,
    activePonds: 0,
    totalPopulation: 0,
    totalBiomass: 0,
    averageWeight: 0,
    todayMortality: 0,
    inventoryValue: 0,
    criticalAlerts: 0,
    pendingTasks: []
  });
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
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
        const farmId = farmsData[0].id;

        // Load comprehensive pond data
        const { data: pondsData } = await supabase
          .from('ponds')
          .select(`
            *,
            pond_batches(
              *,
              batches(name),
              biometrics(average_weight, measurement_date, created_at),
              mortality_records(dead_count, record_date)
            )
          `)
          .eq('farm_id', farmId);

        // Load inventory data
        const { data: inventoryData } = await supabase
          .from('inventory')
          .select('total_value, name, entry_date')
          .eq('farm_id', farmId)
          .order('entry_date', { ascending: false })
          .limit(5);

        // Load water quality data
        const { data: waterQualityData } = await supabase
          .from('water_quality')
          .select('*')
          .in('pond_id', pondsData?.map(p => p.id) || [])
          .order('measurement_date', { ascending: false })
          .limit(5);

        // Calculate comprehensive stats
        const totalPonds = pondsData?.length || 0;
        const activePonds = pondsData?.filter(p => p.status === 'in_use').length || 0;
        
        let totalPopulation = 0;
        let totalBiomass = 0;
        let totalWeight = 0;
        let biometryCount = 0;
        
        const today = new Date().toISOString().split('T')[0];
        let todayMortality = 0;

        pondsData?.forEach(pond => {
          pond.pond_batches?.forEach(batch => {
            if (batch.current_population > 0) {
              totalPopulation += batch.current_population;
              
              // Get latest biometry
              const latestBiometry = batch.biometrics
                ?.sort((a, b) => new Date(b.created_at || b.measurement_date).getTime() - new Date(a.created_at || a.measurement_date).getTime())[0];
              
              if (latestBiometry) {
                totalWeight += latestBiometry.average_weight;
                biometryCount++;
                totalBiomass += (batch.current_population * latestBiometry.average_weight) / 1000;
              }
            }

            // Calculate today's mortality
            batch.mortality_records?.forEach(mr => {
              if (mr.record_date === today) {
                todayMortality += mr.dead_count;
              }
            });
          });
        });

        const averageWeight = biometryCount > 0 ? totalWeight / biometryCount : 0;
        const inventoryValue = inventoryData?.reduce((sum, item) => sum + item.total_value, 0) || 0;

        // Count critical alerts
        let criticalAlerts = 0;
        if (todayMortality > 100) criticalAlerts++;
        waterQualityData?.forEach(wq => {
          if (wq.ph_level < 6.5 || wq.ph_level > 8.5) criticalAlerts++;
          if (wq.oxygen_level < 5) criticalAlerts++;
        });

        // Generate pending tasks
        const pendingTasks = [];
        if (activePonds === 0) pendingTasks.push("Nenhum viveiro ativo");
        if (biometryCount === 0) pendingTasks.push("Registrar biometrias");
        if (waterQualityData?.length === 0) pendingTasks.push("Monitorar qualidade da água");
        if (inventoryData?.length === 0) pendingTasks.push("Gerenciar estoque");

        setStats({
          totalPonds,
          activePonds,
          totalPopulation,
          totalBiomass,
          averageWeight,
          todayMortality,
          inventoryValue,
          criticalAlerts,
          pendingTasks
        });

        // Create recent activities
        const activities: RecentActivity[] = [];
        
        inventoryData?.forEach(item => {
          activities.push({
            id: `inv-${item.entry_date}`,
            type: 'inventory',
            description: `${item.name} adicionado ao estoque`,
            date: item.entry_date,
            value: item.total_value
          });
        });

        waterQualityData?.forEach(wq => {
          const pond = pondsData?.find(p => p.id === wq.pond_id);
          activities.push({
            id: `wq-${wq.id}`,
            type: 'water_quality',
            description: 'Qualidade da água monitorada',
            date: wq.measurement_date,
            pond: pond?.name
          });
        });

        activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setRecentActivities(activities.slice(0, 8));
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

  if (loading) {
    return (
      <Layout>
        <div className="space-y-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map(i => (
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
        </div>

        {/* Critical Alerts */}
        {stats.criticalAlerts > 0 && (
          <Card className="border-destructive/50 bg-destructive/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-destructive" />
                <div>
                  <p className="font-medium text-destructive">
                    {stats.criticalAlerts} alerta{stats.criticalAlerts > 1 ? 's' : ''} crítico{stats.criticalAlerts > 1 ? 's' : ''}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Verifique os parâmetros de qualidade da água e mortalidade
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Viveiros Ativos</p>
                  <p className="text-3xl font-bold text-primary">{stats.activePonds}/{stats.totalPonds}</p>
                  <Progress 
                    value={(stats.activePonds / Math.max(stats.totalPonds, 1)) * 100} 
                    className="mt-2"
                  />
                </div>
                <Fish className="w-8 h-8 text-primary/70" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-success/10 to-success/5 border-success/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">População Total</p>
                  <p className="text-3xl font-bold text-success">{stats.totalPopulation.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground mt-1">camarões</p>
                </div>
                <Users className="w-8 h-8 text-success/70" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-accent/10 to-accent/5 border-accent/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Biomassa Total</p>
                  <p className="text-3xl font-bold text-accent">{stats.totalBiomass.toFixed(1)} kg</p>
                  <p className="text-xs text-muted-foreground mt-1">estimada</p>
                </div>
                <Scale className="w-8 h-8 text-accent/70" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-secondary/10 to-secondary/5 border-secondary/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Valor do Estoque</p>
                  <p className="text-2xl font-bold text-secondary-foreground">
                    R$ {stats.inventoryValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <Package className="w-8 h-8 text-secondary-foreground/70" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Secondary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Scale className="w-6 h-6 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Peso Médio</p>
                  <p className="text-lg font-bold">{stats.averageWeight.toFixed(1)}g</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Activity className="w-6 h-6 text-destructive" />
                <div>
                  <p className="text-sm text-muted-foreground">Mortalidade Hoje</p>
                  <p className="text-lg font-bold">{stats.todayMortality}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <ClipboardList className="w-6 h-6 text-warning" />
                <div>
                  <p className="text-sm text-muted-foreground">Tarefas Pendentes</p>
                  <p className="text-lg font-bold">{stats.pendingTasks.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-6 h-6 text-destructive" />
                <div>
                  <p className="text-sm text-muted-foreground">Alertas Críticos</p>
                  <p className="text-lg font-bold">{stats.criticalAlerts}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Management Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Ações Rápidas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                onClick={() => navigate('/stocking')} 
                className="w-full justify-start"
                variant="outline"
              >
                <Fish className="w-4 h-4 mr-2" />
                Novo Povoamento
              </Button>
              <Button 
                onClick={() => navigate('/manejos', { state: { activeTab: 'biometry' } })} 
                className="w-full justify-start"
                variant="outline"
              >
                <TrendingUp className="w-4 h-4 mr-2" />
                Registrar Biometria
              </Button>
              <Button 
                onClick={() => navigate('/manejos', { state: { activeTab: 'water-quality' } })} 
                className="w-full justify-start"
                variant="outline"
              >
                <Droplets className="w-4 h-4 mr-2" />
                Qualidade da Água
              </Button>
              <Button 
                onClick={() => navigate('/feeding')} 
                className="w-full justify-start"
                variant="outline"
              >
                <Utensils className="w-4 h-4 mr-2" />
                Plano de Arraçoamento
              </Button>
              <Button 
                onClick={() => navigate('/manejos', { state: { activeTab: 'mortality' } })} 
                className="w-full justify-start"
                variant="outline"
              >
                <Activity className="w-4 h-4 mr-2" />
                Registrar Mortalidade
              </Button>
              <Button 
                onClick={() => navigate('/inventory')} 
                className="w-full justify-start"
                variant="outline"
              >
                <Package className="w-4 h-4 mr-2" />
                Gerenciar Estoque
              </Button>
            </CardContent>
          </Card>

          {/* Recent Activities */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Atividades Recentes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentActivities.length > 0 ? (
                recentActivities.map((activity) => (
                  <div key={activity.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                    <div className="w-2 h-2 rounded-full bg-primary"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{activity.description}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{new Date(activity.date).toLocaleDateString('pt-BR')}</span>
                        {activity.pond && <span>• {activity.pond}</span>}
                        {activity.value && (
                          <span>• R$ {activity.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhuma atividade recente
                </p>
              )}
            </CardContent>
          </Card>

          {/* Pending Tasks */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="w-5 h-5" />
                Tarefas Pendentes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {stats.pendingTasks.length > 0 ? (
                stats.pendingTasks.map((task, index) => (
                  <div key={index} className="flex items-center gap-3 p-2 rounded-lg bg-warning/10 border border-warning/20">
                    <AlertTriangle className="w-4 h-4 text-warning" />
                    <span className="text-sm font-medium">{task}</span>
                  </div>
                ))
              ) : (
                <div className="text-center py-4">
                  <div className="text-success mb-2">✓</div>
                  <p className="text-sm text-muted-foreground">
                    Todas as tarefas em dia!
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Performance Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Resumo de Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary mb-1">
                  {((stats.totalBiomass / Math.max(stats.activePonds, 1)) * 1000).toFixed(0)}
                </div>
                <div className="text-sm text-muted-foreground">kg/ha estimado</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-success mb-1">
                  {((stats.totalPopulation / Math.max(stats.activePonds, 1)) / 1000).toFixed(0)}k
                </div>
                <div className="text-sm text-muted-foreground">PL/viveiro médio</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-accent mb-1">
                  {stats.todayMortality > 0 ? ((stats.todayMortality / stats.totalPopulation) * 100).toFixed(2) : '0.00'}%
                </div>
                <div className="text-sm text-muted-foreground">Mortalidade hoje</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-secondary-foreground mb-1">
                  R$ {(stats.inventoryValue / Math.max(stats.activePonds, 1)).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                </div>
                <div className="text-sm text-muted-foreground">Estoque/viveiro</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}