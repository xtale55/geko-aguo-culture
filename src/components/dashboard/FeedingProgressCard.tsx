import { Card, CardContent } from "@/components/ui/card";
import { Utensils } from "lucide-react";
import { useFeedingProgressStats } from "@/hooks/useFeedingProgress";
import { Progress } from "@/components/ui/progress";

interface FeedingProgressCardProps {
  farmId?: string;
}

export function FeedingProgressCard({ farmId }: FeedingProgressCardProps) {
  const progress = useFeedingProgressStats(farmId);
  
  if (!farmId) {
    return (
      <Card className="h-full bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900/20 dark:to-gray-800/20 border-gray-200 dark:border-gray-800">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Ração Diária</h3>
            <Utensils className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          </div>
          <div className="space-y-3">
            <span className="text-2xl font-bold text-gray-600 dark:text-gray-400">-</span>
            <p className="text-xs text-gray-500 dark:text-gray-400">Sem dados disponíveis</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return "text-green-600 dark:text-green-400";
    if (percentage >= 70) return "text-yellow-600 dark:text-yellow-400";
    return "text-orange-600 dark:text-orange-400";
  };

  const getProgressBg = (percentage: number) => {
    if (percentage >= 90) return "from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20";
    if (percentage >= 70) return "from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20";
    return "from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20";
  };

  const getBorderColor = (percentage: number) => {
    if (percentage >= 90) return "border-green-200 dark:border-green-800";
    if (percentage >= 70) return "border-yellow-200 dark:border-yellow-800";
    return "border-orange-200 dark:border-orange-800";
  };

  return (
    <Card className={`h-full bg-gradient-to-br ${getProgressBg(progress.percentage)} ${getBorderColor(progress.percentage)}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className={`text-sm font-medium ${getProgressColor(progress.percentage)}`}>
            Ração Diária
          </h3>
          <Utensils className={`h-5 w-5 ${getProgressColor(progress.percentage)}`} />
        </div>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className={`text-2xl font-bold ${getProgressColor(progress.percentage)}`}>
              {progress.percentage}%
            </span>
            {progress.isComplete && (
              <span className="text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 px-2 py-1 rounded-full">
                Completo
              </span>
            )}
          </div>
          
          <Progress 
            value={progress.percentage} 
            className="h-2"
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
        </div>
      </CardContent>
    </Card>
  );
}