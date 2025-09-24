import { TrendUp, TrendDown, Minus } from "@phosphor-icons/react";
import { useGrowthRate } from "@/hooks/useGrowthRate";
import { StandardCard } from "@/components/StandardCard";

interface GrowthRateCardProps {
  farmId?: string;
}

export function GrowthRateCard({ farmId }: GrowthRateCardProps) {
  const { weeklyGrowthRate, activePonds, averageWeight, trend } = useGrowthRate(farmId);
  
  if (!farmId) {
    return (
      <StandardCard
        title="Crescimento Semanal"
        value="-"
        icon={<Minus />}
        subtitle="Sem dados disponíveis"
        colorClass="text-muted-foreground"
      />
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
      case 'up': return "text-green-600";
      case 'down': return "text-red-600";
      default: return "text-muted-foreground";
    }
  };

  const getTrendText = () => {
    switch (trend) {
      case 'up': return "Crescimento acelerado";
      case 'down': return "Crescimento desacelerado";
      default: return "Crescimento estável";
    }
  };

  const TrendIcon = getTrendIcon();

  return (
    <StandardCard
      title="Crescimento Semanal"
      value={`${weeklyGrowthRate >= 0 ? '+' : ''}${weeklyGrowthRate}%`}
      icon={<TrendIcon />}
      colorClass={getTrendColor()}
    >
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
        {getTrendText()}
      </div>
    </StandardCard>
  );
}