import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { LoadingScreen } from '@/components/LoadingScreen';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Warning, Plus } from '@phosphor-icons/react';
import { useFarmsQuery, useActivePondsQuery, useInventoryQuery, useWaterQualityQuery } from '@/hooks/useSupabaseQuery';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { useRecentManagementData } from '@/hooks/useRecentManagementData';
import { useAlertsData } from '@/hooks/useAlertsData';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// New dashboard components
import { MoonPhaseCard } from '@/components/dashboard/MoonPhaseCard';
import { FeedingProgressCard } from '@/components/dashboard/FeedingProgressCard';
import { GrowthRateCard } from '@/components/dashboard/GrowthRateCard';
import { BiomassTable } from '@/components/dashboard/BiomassTable';
import { TaskManager } from '@/components/dashboard/TaskManager';
import { AlertsModal } from '@/components/dashboard/AlertsModal';

export default function Dashboard() {
  const navigate = useNavigate();
  const [alertsModalOpen, setAlertsModalOpen] = useState(false);
  
  const { data: farms, isLoading: farmsLoading } = useFarmsQuery();
  const firstFarm = farms?.[0];
  
  const { data: pondsData, isLoading: pondsLoading } = useActivePondsQuery(firstFarm?.id);
  const { data: inventoryData, isLoading: inventoryLoading } = useInventoryQuery(firstFarm?.id);
  const { data: waterQualityData, isLoading: waterQualityLoading } = useWaterQualityQuery(
    pondsData?.map(p => p.id) || []
  );
  
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
    return (
      <Layout>
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
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Visão geral da sua fazenda {firstFarm?.name}
          </p>
        </div>

        {/* Critical Alerts Row - First Row Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 gap-4">
          {/* Critical Alerts Card - Clickable */}
          <Card 
            className={`h-full cursor-pointer transition-all hover:shadow-lg ${alerts.length > 0 ? 'bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border-red-200 dark:border-red-800 hover:border-red-300 dark:hover:border-red-700' : 'bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-800 hover:border-green-300 dark:hover:border-green-700'}`}
            onClick={() => setAlertsModalOpen(true)}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className={`text-sm font-medium ${alerts.length > 0 ? 'text-red-700 dark:text-red-300' : 'text-green-700 dark:text-green-300'}`}>
                  Alertas Críticos
                </h3>
                <Warning className={`h-5 w-5 ${alerts.length > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`} />
              </div>
              <div className="space-y-2">
                <span className={`text-2xl font-bold ${alerts.length > 0 ? 'text-red-900 dark:text-red-100' : 'text-green-900 dark:text-green-100'}`}>
                  {alerts.length}
                </span>
                <p className={`text-xs ${alerts.length > 0 ? 'text-red-600 dark:text-red-300' : 'text-green-600 dark:text-green-300'}`}>
                  {alerts.length === 0 ? 'Tudo funcionando bem' : `${alerts.length === 1 ? 'Clique para ver' : 'Clique para detalhes'}`}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Daily Feeding Progress */}
          <FeedingProgressCard farmId={firstFarm?.id} />

          {/* Weekly Growth Rate */}
          <GrowthRateCard farmId={firstFarm?.id} />
        </div>

        {/* Biomass Table */}
        <BiomassTable farmId={firstFarm?.id} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Activities */}
          <Card>
            <CardHeader>
              <CardTitle>Atividades Recentes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentActivities.length === 0 ? (
                  <p className="text-muted-foreground text-sm">Nenhuma atividade recente</p>
                ) : (
                  recentActivities.slice(0, 5).map((activity, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-primary rounded-full mt-2" />
                      <div className="flex-1">
                        <p className="text-sm">{activity.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(activity.date), "dd MMM, HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Task Manager */}
          <TaskManager farmId={firstFarm?.id} />
        </div>
      </div>

      {/* Alerts Modal */}
      <AlertsModal 
        isOpen={alertsModalOpen}
        onClose={() => setAlertsModalOpen(false)}
        alerts={alerts}
      />
    </Layout>
  );
}