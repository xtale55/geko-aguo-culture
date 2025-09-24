import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Utensils, Users, Calendar, TrendingUp } from 'lucide-react';
import { formatDateForDisplay } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface PondWithBatch {
  id: string;
  name: string;
  area: number;
  status: string;
  current_batch?: {
    id: string;
    batch_name: string;
    stocking_date: string;
    current_population: number;
    latest_feeding?: {
      feeding_date: string;
      total_daily: number;
      meals_completed: number;
      meals_per_day: number;
      planned_total_daily: number;
      planned_per_meal: number;
      feeding_percentage: number;
    };
  };
}

interface FeedingPondCardProps {
  pond: PondWithBatch;
  onFeedPond: (pond: PondWithBatch) => void;
  loading?: boolean;
}

export function FeedingPondCard({ pond, onFeedPond, loading = false }: FeedingPondCardProps) {
  if (loading) {
    return <FeedingPondCardSkeleton />;
  }

  const batch = pond.current_batch;
  const feeding = batch?.latest_feeding;
  
  const progressPercentage = feeding && feeding.planned_total_daily > 0 
    ? Math.min((feeding.total_daily / feeding.planned_total_daily) * 100, 100)
    : 0;

  const mealsProgress = feeding 
    ? Math.min((feeding.meals_completed / feeding.meals_per_day) * 100, 100)
    : 0;

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{pond.name}</CardTitle>
          <Badge variant={pond.status === 'in_use' ? 'default' : 'secondary'}>
            {pond.status === 'in_use' ? 'Em uso' : 'Livre'}
          </Badge>
        </div>
        {batch && (
          <div className="text-sm text-muted-foreground">
            Lote: {batch.batch_name}
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {batch ? (
          <>
            {/* Informações do lote */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-500" />
                <span>{batch.current_population.toLocaleString()} camarões</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-green-500" />
                <span>{formatDateForDisplay(batch.stocking_date)}</span>
              </div>
            </div>

            {/* Resumo de alimentação */}
            {feeding && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Alimentação hoje</span>
                  <Badge variant="outline">
                    {feeding.meals_completed}/{feeding.meals_per_day} refeições
                  </Badge>
                </div>

                {/* Progresso por quantidade */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span>Quantidade diária</span>
                    <span>
                      {(feeding.total_daily / 1000).toFixed(1)}kg / {(feeding.planned_total_daily / 1000).toFixed(1)}kg
                    </span>
                  </div>
                  <Progress value={progressPercentage} className="h-2" />
                </div>

                {/* Progresso por refeições */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span>Refeições</span>
                    <span>{feeding.meals_completed} de {feeding.meals_per_day}</span>
                  </div>
                  <Progress value={mealsProgress} className="h-2" />
                </div>

                {/* Próxima refeição planejada */}
                {feeding.meals_completed < feeding.meals_per_day && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <TrendingUp className="h-4 w-4" />
                    <span>
                      Próxima: {(feeding.planned_per_meal / 1000).toFixed(1)}kg
                      {feeding.feeding_percentage > 0 && (
                        <span className="ml-1">({feeding.feeding_percentage}%)</span>
                      )}
                    </span>
                  </div>
                )}
              </div>
            )}

            <Button 
              onClick={() => onFeedPond(pond)} 
              className="w-full"
              variant={feeding && feeding.meals_completed >= feeding.meals_per_day ? "outline" : "default"}
            >
              <Utensils className="mr-2 h-4 w-4" />
              {feeding && feeding.meals_completed >= feeding.meals_per_day 
                ? 'Alimentação extra' 
                : 'Registrar alimentação'
              }
            </Button>
          </>
        ) : (
          <div className="text-center py-4 text-muted-foreground">
            Viveiro sem lote ativo
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function FeedingPondCardSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-5 w-16" />
        </div>
        <Skeleton className="h-4 w-20" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-20" />
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-5 w-16" />
          </div>
          <Skeleton className="h-2 w-full" />
          <Skeleton className="h-2 w-full" />
        </div>
        <Skeleton className="h-10 w-full" />
      </CardContent>
    </Card>
  );
}