import { useMemo } from 'react';

interface PondData {
  id: string;
  name: string;
  status: string;
  pond_batches?: Array<{
    current_population: number;
    biometrics: Array<{
      average_weight: number;
      measurement_date: string;
      created_at?: string;
    }>;
    mortality_records: Array<{
      dead_count: number;
      record_date: string;
    }>;
  }>;
}

interface InventoryData {
  total_value: number;
}

interface WaterQualityData {
  ph_level: number;
  oxygen_level: number;
}

export function useDashboardStats(
  pondsData: PondData[] | undefined,
  inventoryData: InventoryData[] | undefined,
  waterQualityData: WaterQualityData[] | undefined
) {
  return useMemo(() => {
    if (!pondsData) {
      return {
        totalPonds: 0,
        activePonds: 0,
        totalPopulation: 0,
        totalBiomass: 0,
        averageWeight: 0,
        todayMortality: 0,
        inventoryValue: 0,
        criticalAlerts: 0,
        pendingTasks: []
      };
    }

    const totalPonds = pondsData.length;
    const activePonds = pondsData.filter(p => p.status === 'in_use').length;
    
    let totalPopulation = 0;
    let totalBiomass = 0;
    let totalWeight = 0;
    let biometryCount = 0;
    
    const today = new Date().toISOString().split('T')[0];
    let todayMortality = 0;

    pondsData.forEach(pond => {
      pond.pond_batches?.forEach(batch => {
        if (batch.current_population > 0) {
          totalPopulation += batch.current_population;
          
          // Get latest biometry by measurement_date
          const latestBiometry = batch.biometrics
            ?.sort((a, b) => new Date(b.measurement_date).getTime() - new Date(a.measurement_date).getTime())[0];
          
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
    if (!waterQualityData?.length) pendingTasks.push("Monitorar qualidade da água");
    if (!inventoryData?.length) pendingTasks.push("Gerenciar estoque");

    return {
      totalPonds,
      activePonds,
      totalPopulation,
      totalBiomass,
      averageWeight,
      todayMortality,
      inventoryValue,
      criticalAlerts,
      pendingTasks
    };
  }, [pondsData, inventoryData, waterQualityData]);
}