import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { LoadingScreen } from '@/components/LoadingScreen';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StandardCard } from '@/components/StandardCard';
import { AlertTriangle, Plus, Fish, BarChart3, Utensils, Package, Settings, DollarSign } from 'lucide-react';
import { useFarmsQuery, useActivePondsQuery, useInventoryQuery, useWaterQualityQuery } from '@/hooks/useSupabaseQuery';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { useRecentManagementData } from '@/hooks/useRecentManagementData';
import { useAlertsData } from '@/hooks/useAlertsData';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// New dashboard components
import { WeatherCard } from '@/components/dashboard/WeatherCard';
import { FeedingProgressCard } from '@/components/dashboard/FeedingProgressCard';
import { GrowthRateCard } from '@/components/dashboard/GrowthRateCard';
import { BiomassTable } from '@/components/dashboard/BiomassTable';
import { TaskManager } from '@/components/dashboard/TaskManager';
import { AlertsModal } from '@/components/dashboard/AlertsModal';
export default function Dashboard() {
  const navigate = useNavigate();
  const [alertsModalOpen, setAlertsModalOpen] = useState(false);
  const {
    data: farms,
    isLoading: farmsLoading
  } = useFarmsQuery();
  const firstFarm = farms?.[0];
  const {
    data: pondsData,
    isLoading: pondsLoading
  } = useActivePondsQuery(firstFarm?.id);
  const {
    data: inventoryData,
    isLoading: inventoryLoading
  } = useInventoryQuery(firstFarm?.id);
  const {
    data: waterQualityData,
    isLoading: waterQualityLoading
  } = useWaterQualityQuery(pondsData?.map(p => p.id) || []);
  const stats = useDashboardStats(pondsData, inventoryData, waterQualityData);
  const alerts = useAlertsData(pondsData, waterQualityData, inventoryData);
  const recentData = useRecentManagementData(firstFarm?.id);
  const recentActivities = recentData.recentBiometrics.map(bio => ({
    description: `Biometria registrada - ${bio.average_weight}g`,
    date: bio.created_at
  })).slice(0, 5);
  const isLoading = farmsLoading || pondsLoading || inventoryLoading || waterQualityLoading;
  if (isLoading) {
    return <LoadingScreen />;
  }
  if (!farms || farms.length === 0) {
    return <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-4">
            <h2 className="text-2xl font-bold">Bem-vindo ao AquaHub!</h2>
            <p className="text-muted-foreground">
              Para começar, você precisa criar uma fazenda.
            </p>
            <Button onClick={() => navigate('/farm')} className="mt-4">
              <Plus className="h-4 w-4 mr-2" />
              Criar Primeira Fazenda
            </Button>
          </div>
        </div>
      </Layout>;
  }
  return <Layout>
      <div className="space-y-6">
        <div className="py-0">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Visão geral da sua fazenda {firstFarm?.name}
          </p>
        </div>

        {/* Critical Alerts Row - First Row Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Critical Alerts Card - Clickable */}
          <StandardCard
            title="Alertas Críticos"
            value={alerts.length}
            icon={<AlertTriangle className="h-5 w-5" />}
            subtitle={alerts.length === 0 ? 'Tudo funcionando bem' : `${alerts.length === 1 ? 'Clique para ver' : 'Clique para detalhes'}`}
            colorClass={alerts.length > 0 ? 'text-destructive' : 'text-primary'}
            onClick={() => setAlertsModalOpen(true)}
          />

          {/* Daily Feeding Progress */}
          <FeedingProgressCard farmId={firstFarm?.id} />

          {/* Weekly Growth Rate */}
          <GrowthRateCard farmId={firstFarm?.id} />

          {/* Weather */}
          <WeatherCard farmLocation={firstFarm?.location} />
        </div>

        {/* Biomass Table */}
        <BiomassTable farmId={firstFarm?.id} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Quick Actions */}
          <StandardCard
            title="Ações Rápidas"
            value=""
            icon={<Settings className="h-5 w-5" />}
            colorClass="text-primary"
          >
            <div className="grid grid-cols-2 gap-3 mt-3">
              {[{
              label: 'Manejos',
              path: '/manejos',
              icon: Fish
            }, {
              label: 'Registrar Ração',
              path: '/feeding',
              icon: Utensils
            }, {
              label: 'Estoque',
              path: '/inventory',
              icon: Package
            }, {
              label: 'Relatórios',
              path: '/reports',
              icon: BarChart3
            }, {
              label: 'Fazenda',
              path: '/farm',
              icon: Settings
            }, {
              label: 'Financeiro',
              path: '/financial',
              icon: DollarSign
            }].map(({
              label,
              path,
              icon: Icon
            }) => <Button key={path} variant="outline" className="h-20 flex flex-col gap-2 bg-card hover:bg-muted/50 border-border text-foreground" onClick={() => navigate(path)}>
                  <Icon className="h-6 w-6 text-muted-foreground" />
                  <span className="text-xs text-center">{label}</span>
                </Button>)}
            </div>
          </StandardCard>

          {/* Recent Activities */}
          <StandardCard
            title="Atividades Recentes"
            value=""
            icon={<BarChart3 className="h-5 w-5" />}
            colorClass="text-primary"
          >
            <div className="space-y-3 mt-3">
              {recentActivities.length === 0 ? <p className="text-muted-foreground text-sm">Nenhuma atividade recente</p> : recentActivities.slice(0, 5).map((activity, index) => <div key={index} className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2" />
                    <div className="flex-1">
                      <p className="text-sm">{activity.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(activity.date), "dd MMM, HH:mm", {
                    locale: ptBR
                  })}
                      </p>
                    </div>
                  </div>)}
            </div>
          </StandardCard>

          {/* Task Manager */}
          <TaskManager farmId={firstFarm?.id} />
        </div>
      </div>

      {/* Alerts Modal */}
      <AlertsModal isOpen={alertsModalOpen} onClose={() => setAlertsModalOpen(false)} alerts={alerts} />
    </Layout>;
}