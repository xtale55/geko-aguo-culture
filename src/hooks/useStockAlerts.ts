import { useMemo } from 'react';
import { QuantityUtils } from '@/lib/quantityUtils';

interface InventoryItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  farm_id: string;
  minimum_stock_threshold?: number;
}

interface StockAlert {
  id: string;
  type: 'stock';
  title: string;
  description: string;
  severity: 'high' | 'medium' | 'low';
  category: string;
  itemName: string;
  currentStock: number;
  threshold: number;
}

// Dynamic thresholds by category (in grams)
const CATEGORY_THRESHOLDS = {
  'Ração': QuantityUtils.kgToGrams(100),
  'Probióticos': QuantityUtils.kgToGrams(10),
  'Fertilizantes': QuantityUtils.kgToGrams(50),
  'Outros': QuantityUtils.kgToGrams(20)
};

export function useStockAlerts(inventoryData: InventoryItem[] | undefined): StockAlert[] {
  return useMemo(() => {
    if (!inventoryData) return [];

    const alerts: StockAlert[] = [];

    inventoryData.forEach(item => {
      // Usar limite personalizado se definido, senão usar o padrão da categoria
      const threshold = item.minimum_stock_threshold || 
        CATEGORY_THRESHOLDS[item.category as keyof typeof CATEGORY_THRESHOLDS] || 
        CATEGORY_THRESHOLDS['Outros'];
      
      if (item.quantity <= threshold) {
        const currentStockKg = QuantityUtils.gramsToKg(item.quantity);
        const thresholdKg = QuantityUtils.gramsToKg(threshold);
        
        let severity: 'high' | 'medium' | 'low' = 'medium';
        
        // Critical: less than 50% of threshold
        if (item.quantity <= threshold * 0.5) {
          severity = 'high';
        }
        // Warning: less than 75% of threshold
        else if (item.quantity <= threshold * 0.75) {
          severity = 'medium';
        }
        // Info: at or below threshold
        else {
          severity = 'low';
        }

        alerts.push({
          id: `stock-alert-${item.id}`,
          type: 'stock',
          title: `Estoque baixo: ${item.name}`,
          description: `${item.category} com ${QuantityUtils.formatKg(item.quantity)}kg disponível (limite: ${QuantityUtils.formatKg(threshold)}kg)`,
          severity,
          category: item.category,
          itemName: item.name,
          currentStock: currentStockKg,
          threshold: thresholdKg
        });
      }
    });

    // Sort by severity and then by current stock level
    alerts.sort((a, b) => {
      const severityOrder = { 'high': 3, 'medium': 2, 'low': 1 };
      if (severityOrder[a.severity] !== severityOrder[b.severity]) {
        return severityOrder[b.severity] - severityOrder[a.severity];
      }
      return a.currentStock - b.currentStock;
    });

    return alerts;
  }, [inventoryData]);
}