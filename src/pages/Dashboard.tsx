import { memo } from 'react';
import { Layout } from '@/components/Layout';
import { StatsCard } from '@/components/StatsCard';
import { DashboardSkeleton } from '@/components/DashboardSkeleton';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, Fish, TrendingUp, Calendar, Scale, Utensils, 
  Activity, Droplets, Package, AlertTriangle, Users, ClipboardList
} from 'lucide-react';
import { useFarmsQuery, useActivePondsQuery, useInventoryQuery, useWaterQualityQuery } from '@/hooks/useSupabaseQuery';
import { useDashboardStats } from '@/hooks/useDashboardStats';

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

const Dashboard = memo(function Dashboard() {
  const navigate = useNavigate();
  
  // Use optimized queries
  const { data: farms, isLoading: farmsLoading } = useFarmsQuery();
  const farmId = farms?.[0]?.id;
  
  const { data: pondsData, isLoading: pondsLoading } = useActivePondsQuery(farmId);
  const { data: inventoryData, isLoading: inventoryLoading } = useInventoryQuery(farmId);
  const pondIds = pondsData?.map(p => p.id) || [];
  const { data: waterQualityData } = useWaterQualityQuery(pondIds);
  
  // Calculate stats using optimized hook
  const stats = useDashboardStats(pondsData, inventoryData, waterQualityData);
  
  const loading = farmsLoading || pondsLoading || inventoryLoading;

  // Create recent activities from cached data
  const recentActivities = [
    ...(inventoryData?.slice(0, 4).map(item => ({
      id: `inv-${item.entry_date}`,
      type: 'inventory' as const,
      description: `${item.name} adicionado ao estoque`,
      date: item.entry_date,
      value: item.total_value
    })) || []),
    ...(waterQualityData?.slice(0, 4).map(wq => {
      const pond = pondsData?.find(p => p.id === wq.pond_id);
      return {
        id: `wq-${wq.id}`,
        type: 'water_quality' as const,
        description: 'Qualidade da água monitorada',
        date: wq.measurement_date,
        pond: pond?.name
      };
    }) || [])
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 8);

  if (loading) {
    return (
      <Layout>
        <DashboardSkeleton />
      </Layout>
    );
  }

  if (!farms?.length) {
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

        {/* Main Stats Grid - Using optimized StatsCard */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          <StatsCard
            title="Viveiros Ativos"
            value={`${stats.activePonds}/${stats.totalPonds}`}
            icon={<Fish className="w-full h-full" />}
            progress={(stats.activePonds / Math.max(stats.totalPonds, 1)) * 100}
            variant="primary"
          />
          <StatsCard
            title="População Total"
            value={stats.totalPopulation.toLocaleString()}
            subtitle="camarões"
            icon={<Users className="w-full h-full" />}
            variant="success"
          />
          <StatsCard
            title="Biomassa Total"
            value={`${stats.totalBiomass.toFixed(1)} kg`}
            subtitle="estimada"
            icon={<Scale className="w-full h-full" />}
            variant="accent"
          />
          <StatsCard
            title="Valor do Estoque"
            value={`R$ ${stats.inventoryValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
            icon={<Package className="w-full h-full" />}
            variant="secondary"
          />
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
});

export default Dashboard;