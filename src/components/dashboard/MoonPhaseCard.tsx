import { Card, CardContent } from "@/components/ui/card";
import { Moon, CircleHalf, Circle } from "@phosphor-icons/react";
import { useMoonPhaseData } from "@/hooks/useMoonPhaseData";
import { Skeleton } from "@/components/ui/skeleton";

export function MoonPhaseCard() {
  const { data: moonPhase, isLoading } = useMoonPhaseData();

  const getMoonIcon = (icon: string) => {
    switch (icon) {
      case 'new':
        return Circle;
      case 'waxing':
        return CircleHalf;
      case 'full':
        return Moon;
      case 'waning':
        return CircleHalf;
      default:
        return Moon;
    }
  };

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardContent className="p-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-3 w-24" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!moonPhase) {
    return (
      <Card className="h-full">
        <CardContent className="p-4">
          <div className="text-center text-muted-foreground">
            <Moon className="h-8 w-8 mx-auto mb-2" />
            <p className="text-sm">Fase lunar indisponível</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const MoonIcon = getMoonIcon(moonPhase.currentPhaseIcon);

  return (
    <Card className="h-full bg-gradient-to-br from-indigo-50 to-purple-100 dark:from-indigo-950/30 dark:to-purple-900/30 border-indigo-200 dark:border-indigo-800">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-indigo-700 dark:text-indigo-300">Fase Lunar</h3>
          <MoonIcon 
            className="h-5 w-5 text-indigo-600 dark:text-indigo-400" 
            weight={moonPhase.currentPhaseIcon === 'full' ? 'fill' : moonPhase.currentPhaseIcon === 'new' ? 'fill' : 'regular'}
          />
        </div>
        
        <div className="space-y-1">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-indigo-900 dark:text-indigo-100">
              {moonPhase.currentPhase}
            </span>
          </div>
          
          <p className="text-xs text-indigo-600 dark:text-indigo-300">
            Iluminação: {moonPhase.illumination}%
          </p>
          
          <div className="flex flex-col gap-1 text-xs text-indigo-600 dark:text-indigo-300 mt-2">
            <span>Próxima: {moonPhase.nextPhase}</span>
            <span>Em {moonPhase.daysUntilNext} {moonPhase.daysUntilNext === 1 ? 'dia' : 'dias'}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
