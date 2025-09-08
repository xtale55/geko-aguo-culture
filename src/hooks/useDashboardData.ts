import { useMemo } from 'react';
import { useFarmsQuery, useActivePondsQuery, useInventoryQuery, useWaterQualityQuery } from './useSupabaseQuery';
import { useFeedingDashboardStats } from './useFeedingDashboardData';
import { useAlertsData } from './useAlertsData';
import { useWeatherData } from './useWeatherData';
import { useUserTasks } from './useUserTasks';

interface DashboardData {
  farms: any[] | undefined;
  activePonds: any[] | undefined;
  inventory: any[] | undefined;
  waterQuality: any[] | undefined;
  feedingStats: any;
  alerts: any;
  weather: any;
  tasks: any[] | undefined;
  isLoading: boolean;
  error: any;
}

export function useDashboardData(): DashboardData {
  // Fetch all data in parallel
  const { data: farms, isLoading: farmsLoading, error: farmsError } = useFarmsQuery();
  const farmId = farms?.[0]?.id;
  
  const { data: activePonds, isLoading: pondsLoading, error: pondsError } = useActivePondsQuery(farmId);
  const { data: inventory, isLoading: inventoryLoading, error: inventoryError } = useInventoryQuery(farmId);
  
  const pondIds = useMemo(() => activePonds?.map(pond => pond.id) || [], [activePonds]);
  const { data: waterQuality, isLoading: waterLoading, error: waterError } = useWaterQualityQuery(pondIds);
  
  const feedingStats = useFeedingDashboardStats(farmId);
  const alerts = useAlertsData(activePonds, waterQuality, inventory);
  const weather = useWeatherData();
  const { data: tasks, isLoading: tasksLoading, error: tasksError } = useUserTasks();

  const isLoading = farmsLoading || pondsLoading || inventoryLoading || waterLoading || tasksLoading;
  const error = farmsError || pondsError || inventoryError || waterError || tasksError;

  return useMemo(() => ({
    farms,
    activePonds,
    inventory,
    waterQuality,
    feedingStats,
    alerts,
    weather,
    tasks,
    isLoading,
    error,
  }), [
    farms,
    activePonds,
    inventory,
    waterQuality,
    feedingStats,
    alerts,
    weather,
    tasks,
    isLoading,
    error,
  ]);
}