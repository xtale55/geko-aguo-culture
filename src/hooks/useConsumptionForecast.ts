import { useMemo } from 'react';
import { QuantityUtils } from '@/lib/quantityUtils';

interface InventoryItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  farm_id: string;
}

interface FeedingRecord {
  actual_amount: number;
  feeding_date: string;
  feed_type_id?: string;
}

interface InputApplication {
  quantity_applied: number;
  application_date: string;
  input_item_id: string;
}

interface ConsumptionForecast {
  itemId: string;
  itemName: string;
  category: string;
  currentStock: number; // in kg
  averageDailyConsumption: number; // in kg
  estimatedDaysRemaining: number;
  forecastAccuracy: 'high' | 'medium' | 'low';
  lastUsageDate?: string;
  usageFrequency: number; // days
}

export function useConsumptionForecast(
  inventoryData: InventoryItem[] | undefined,
  feedingRecords: FeedingRecord[] | undefined,
  inputApplications: InputApplication[] | undefined,
  daysToAnalyze: number = 30
): ConsumptionForecast[] {
  return useMemo(() => {
    if (!inventoryData) return [];

    const forecasts: ConsumptionForecast[] = [];
    const currentDate = new Date();
    const analysisStartDate = new Date();
    analysisStartDate.setDate(currentDate.getDate() - daysToAnalyze);

    inventoryData.forEach(item => {
      let totalUsage = 0;
      let usageDays: string[] = [];
      let lastUsageDate: string | undefined;

      // Analyze feeding records for feed items (including mixtures with feed)
      if ((item.category === 'Ração' || item.category === 'Mistura') && feedingRecords) {
        const relevantFeedings = feedingRecords.filter(record =>
          record.feed_type_id === item.id &&
          new Date(record.feeding_date) >= analysisStartDate
        );

        relevantFeedings.forEach(record => {
          totalUsage += QuantityUtils.gramsToKg(record.actual_amount);
          if (!usageDays.includes(record.feeding_date)) {
            usageDays.push(record.feeding_date);
          }
          if (!lastUsageDate || record.feeding_date > lastUsageDate) {
            lastUsageDate = record.feeding_date;
          }
        });
      }

      // Analyze input applications for fertilizers and probiotics
      if (['Fertilizantes', 'Probióticos'].includes(item.category) && inputApplications) {
        const relevantApplications = inputApplications.filter(app => 
          app.input_item_id === item.id &&
          new Date(app.application_date) >= analysisStartDate
        );

        relevantApplications.forEach(app => {
          totalUsage += QuantityUtils.gramsToKg(app.quantity_applied);
          if (!usageDays.includes(app.application_date)) {
            usageDays.push(app.application_date);
          }
          if (!lastUsageDate || app.application_date > lastUsageDate) {
            lastUsageDate = app.application_date;
          }
        });
      }

      // Calculate metrics
      const averageDailyConsumption = totalUsage / daysToAnalyze;
      const currentStockKg = QuantityUtils.gramsToKg(item.quantity);
      
      let estimatedDaysRemaining = 0;
      if (averageDailyConsumption > 0) {
        estimatedDaysRemaining = Math.floor(currentStockKg / averageDailyConsumption);
      } else {
        estimatedDaysRemaining = 999; // Infinite if no usage
      }

      // Determine forecast accuracy
      let forecastAccuracy: 'high' | 'medium' | 'low' = 'low';
      const usageFrequency = usageDays.length;
      
      if (usageFrequency >= daysToAnalyze * 0.8) {
        forecastAccuracy = 'high'; // Used on 80%+ of days
      } else if (usageFrequency >= daysToAnalyze * 0.4) {
        forecastAccuracy = 'medium'; // Used on 40%+ of days
      } else {
        forecastAccuracy = 'low'; // Used on less than 40% of days
      }

      // Only include items with some usage or very low stock
      if (totalUsage > 0 || currentStockKg < 10) {
        forecasts.push({
          itemId: item.id,
          itemName: item.name,
          category: item.category,
          currentStock: currentStockKg,
          averageDailyConsumption,
          estimatedDaysRemaining,
          forecastAccuracy,
          lastUsageDate,
          usageFrequency
        });
      }
    });

    // Sort by estimated days remaining (most urgent first)
    forecasts.sort((a, b) => {
      // Items with 0 days remaining first
      if (a.estimatedDaysRemaining === 0 && b.estimatedDaysRemaining > 0) return -1;
      if (b.estimatedDaysRemaining === 0 && a.estimatedDaysRemaining > 0) return 1;
      
      // Then by days remaining
      if (a.estimatedDaysRemaining !== b.estimatedDaysRemaining) {
        return a.estimatedDaysRemaining - b.estimatedDaysRemaining;
      }
      
      // Then by current stock level
      return a.currentStock - b.currentStock;
    });

    return forecasts;
  }, [inventoryData, feedingRecords, inputApplications, daysToAnalyze]);
}