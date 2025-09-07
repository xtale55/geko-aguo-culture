import { useMemo } from 'react';

interface PondData {
  id: string;
  name: string;
  pond_batches?: Array<{
    id: string;
    current_population: number;
    stocking_date: string;
    cycle_status: string;
    batches: {
      name: string;
    };
    biometrics: Array<{
      average_weight: number;
      measurement_date: string;
      uniformity: number;
      created_at: string;
    }>;
    mortality_records?: Array<{
      dead_count: number;
      record_date: string;
    }>;
  }>;
}

interface WaterQualityData {
  id: string;
  pond_id: string;
  ph_level: number | null;
  oxygen_level: number | null;
  measurement_date: string;
}

interface InventoryData {
  id: string;
  name: string;
  quantity: number;
  category: string;
}

interface Alert {
  id: string;
  type: 'water' | 'mortality' | 'task';
  title: string;
  description: string;
  severity: 'high' | 'medium' | 'low';
}

export function useAlertsData(
  pondsData: PondData[] | undefined,
  waterQualityData: WaterQualityData[] | undefined,
  inventoryData: InventoryData[] | undefined
): Alert[] {
  return useMemo(() => {
    const alerts: Alert[] = [];
    const today = new Date().toISOString().split('T')[0];

    // Water quality alerts - only use the latest measurement per pond
    if (waterQualityData?.length) {
      // Group by pond_id and get the latest measurement
      const latestWaterQuality = waterQualityData.reduce((acc, wq) => {
        const existing = acc[wq.pond_id];
        if (!existing || new Date(wq.measurement_date) > new Date(existing.measurement_date)) {
          acc[wq.pond_id] = wq;
        }
        return acc;
      }, {} as Record<string, WaterQualityData>);

      Object.values(latestWaterQuality).forEach((wq) => {
        const pond = pondsData?.find(p => p.id === wq.pond_id);
        const pondName = pond?.name || 'Viveiro desconhecido';

        if (wq.ph_level !== null) {
          if (wq.ph_level < 6.5) {
            alerts.push({
              id: `ph-low-${wq.id}`,
              type: 'water',
              title: `pH muito baixo - ${pondName}`,
              description: `pH de ${wq.ph_level.toFixed(1)} está abaixo do recomendado (6.5-8.5)`,
              severity: 'high'
            });
          } else if (wq.ph_level > 8.5) {
            alerts.push({
              id: `ph-high-${wq.id}`,
              type: 'water',
              title: `pH muito alto - ${pondName}`,
              description: `pH de ${wq.ph_level.toFixed(1)} está acima do recomendado (6.5-8.5)`,
              severity: 'high'
            });
          }
        }

        if (wq.oxygen_level !== null && wq.oxygen_level < 5) {
          alerts.push({
            id: `oxygen-low-${wq.id}`,
            type: 'water',
            title: `Oxigênio baixo - ${pondName}`,
            description: `Nível de oxigênio de ${wq.oxygen_level.toFixed(1)} mg/L está abaixo do recomendado (>5 mg/L)`,
            severity: 'high'
          });
        }
      });
    }

    // Mortality alerts
    if (pondsData?.length) {
      let totalTodayMortality = 0;
      pondsData.forEach((pond) => {
        pond.pond_batches?.forEach((batch) => {
          const todayMortality = batch.mortality_records
            ?.filter(mr => mr.record_date === today)
            ?.reduce((sum, mr) => sum + mr.dead_count, 0) || 0;
          
          totalTodayMortality += todayMortality;

          if (todayMortality > 50) {
            alerts.push({
              id: `mortality-high-${pond.id}`,
              type: 'mortality',
              title: `Mortalidade alta - ${pond.name}`,
              description: `${todayMortality} animais mortos hoje`,
              severity: 'high'
            });
          }
        });
      });

      if (totalTodayMortality > 100) {
        alerts.push({
          id: 'mortality-total-high',
          type: 'mortality',
          title: 'Mortalidade total alta',
          description: `Total de ${totalTodayMortality} animais mortos hoje em toda a fazenda`,
          severity: 'high'
        });
      }
    }

    // Task alerts (inventory, biometry, etc.)
    if (!pondsData?.length || pondsData.every(p => !p.pond_batches?.length)) {
      alerts.push({
        id: 'no-active-ponds',
        type: 'task',
        title: 'Nenhum viveiro ativo',
        description: 'Considere povoar os viveiros para iniciar a produção',
        severity: 'medium'
      });
    }

    if (!waterQualityData?.length) {
      alerts.push({
        id: 'no-water-quality',
        type: 'task',
        title: 'Qualidade da água não monitorada',
        description: 'Registre medições de qualidade da água regularmente',
        severity: 'medium'
      });
    }

    // Low stock alerts
    if (inventoryData?.length) {
      const lowStockItems = inventoryData.filter(item => 
        item.category === 'Ração' && item.quantity < 100
      );
      
      lowStockItems.forEach(item => {
        alerts.push({
          id: `low-stock-${item.id}`,
          type: 'task',
          title: 'Estoque baixo',
          description: `${item.name}: apenas ${item.quantity}kg restantes`,
          severity: 'medium'
        });
      });
    }

    return alerts.sort((a, b) => {
      const severityOrder = { high: 3, medium: 2, low: 1 };
      return severityOrder[b.severity] - severityOrder[a.severity];
    });
  }, [pondsData, waterQualityData, inventoryData]);
}