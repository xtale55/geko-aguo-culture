import { Card, CardContent } from "@/components/ui/card";
import { TrendUp, TrendDown, Minus } from "@phosphor-icons/react";
import { useGrowthRate } from "@/hooks/useGrowthRate";

interface GrowthRateCardProps {
  farmId?: string;
}

export function GrowthRateCard({ farmId }: GrowthRateCardProps) {
  const { weeklyGrowthRate, activePonds, averageWeight, trend } = useGrowthRate(farmId);
  
  if (!farmId) {
    return (
      <Card className="h-full bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900/20 dark:to-gray-800/20 border-gray-200 dark:border-gray-800">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Crescimento Semanal</h3>
            <Minus className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          </div>
          <div className="space-y-2">
            <span className="text-2xl font-bold text-gray-600 dark:text-gray-400">-</span>
            <p className="text-xs text-gray-500 dark:text-gray-400">Sem dados disponíveis</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getTrendIcon = () => {
    switch (trend) {
      case 'up': return TrendUp;
      case 'down': return TrendDown;
      default: return Minus;
    }
  };

  const getTrendColor = () => {
    switch (trend) {
      case 'up': return "text-green-600 dark:text-green-400";
      case 'down': return "text-red-600 dark:text-red-400";
      default: return "text-gray-600 dark:text-gray-400";
    }
  };

  const getCardBg = () => {
    switch (trend) {
      case 'up': return "from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20";
      case 'down': return "from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20";
      default: return "from-gray-50 to-gray-100 dark:from-gray-900/20 dark:to-gray-800/20";
    }
  };

  const getBorderColor = () => {
    switch (trend) {
      case 'up': return "border-green-200 dark:border-green-800";
      case 'down': return "border-red-200 dark:border-red-800";
      default: return "border-gray-200 dark:border-gray-800";
    }
  };

  const TrendIcon = getTrendIcon();

  return (
    <Card className={`h-full bg-gradient-to-br ${getCardBg()} ${getBorderColor()}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className={`text-sm font-medium ${getTrendColor()}`}>
            Crescimento Semanal
          </h3>
          <TrendIcon className={`h-5 w-5 ${getTrendColor()}`} />
        </div>
        
        <div className="space-y-2">
          <div className="flex items-baseline gap-1">
            <span className={`text-2xl font-bold ${getTrendColor()}`}>
              {weeklyGrowthRate >= 0 ? '+' : ''}{weeklyGrowthRate}%
            </span>
          </div>
          
          <div className={`text-xs ${getTrendColor()} space-y-1`}>
            <div className="flex justify-between">
              <span>Peso médio:</span>
              <span>{averageWeight}g</span>
            </div>
            <div className="flex justify-between">
              <span>Viveiros ativos:</span>
              <span>{activePonds}</span>
            </div>
          </div>
          
          <div className={`text-xs ${getTrendColor()} mt-2`}>
            {trend === 'up' && "Crescimento acelerado"}
            {trend === 'down' && "Crescimento desacelerado"}
            {trend === 'stable' && "Crescimento estável"}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}