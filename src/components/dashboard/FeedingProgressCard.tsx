import { ForkKnife } from "@phosphor-icons/react";
import { useFeedingDashboardStats } from "@/hooks/useFeedingDashboardData";
import { Progress } from "@/components/ui/progress";
import { StandardCard } from "@/components/StandardCard";

interface FeedingProgressCardProps {
  farmId?: string;
}

export function FeedingProgressCard({ farmId }: FeedingProgressCardProps) {
  const progress = useFeedingDashboardStats(farmId);
  
  if (!farmId) {
    return (
      <StandardCard
        title="Ração Diária"
        value="-"
        icon={<ForkKnife />}
        subtitle="Sem dados disponíveis"
        colorClass="text-muted-foreground"
      />
    );
  }

  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return "text-green-600";
    if (percentage >= 70) return "text-yellow-600";
    return "text-orange-600";
  };

  return (
    <StandardCard
      title="Ração Diária"
      value={`${progress.percentage}%`}
      icon={<ForkKnife />}
      colorClass={getProgressColor(progress.percentage)}
    >
      <div className="flex items-center justify-between mb-2">
        {progress.isComplete && (
          <span className="text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 px-2 py-1 rounded-full">
            Completo
          </span>
        )}
      </div>
      
      <Progress 
        value={progress.percentage} 
        className="h-2 mb-2"
      />
      
      <div className={`text-xs ${getProgressColor(progress.percentage)} space-y-1`}>
        <div className="flex justify-between">
          <span>Planejado:</span>
          <span>{progress.totalPlanned.toFixed(1)} kg</span>
        </div>
        <div className="flex justify-between">
          <span>Executado:</span>
          <span>{progress.totalActual.toFixed(1)} kg</span>
        </div>
      </div>
    </StandardCard>
  );
}