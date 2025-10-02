import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ClipboardCheck, Users, Weight, TrendingUp, Clock, CheckCircle, AlertTriangle } from 'lucide-react';
import { FeedingEvaluationModal } from '@/components/FeedingEvaluationModal';

interface PondEvaluationCardProps {
  pondBatchId: string;
  pondName: string;
  batchName: string;
  currentPopulation: number;
  latestWeight?: number;
  currentBiomass?: number;
  pendingEvaluations?: number;
  todayFeedings?: number;
  lastEvaluationTime?: string;
  unevaluatedFeedings?: Array<{
    id: string;
    feeding_time: string;
    actual_amount: number;
    feeding_date: string;
  }>;
}

export function PondEvaluationCard({
  pondBatchId,
  pondName,
  batchName,
  currentPopulation,
  latestWeight,
  currentBiomass,
  pendingEvaluations = 0,
  todayFeedings = 0,
  lastEvaluationTime,
  unevaluatedFeedings = [],
}: PondEvaluationCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const hasPendingEvaluations = unevaluatedFeedings.length > 0;

  return (
    <>
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-lg">{pondName}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">{batchName}</p>
            </div>
            {hasPendingEvaluations && (
              <Badge variant="destructive" className="ml-2">
                {unevaluatedFeedings.length} pendente{unevaluatedFeedings.length > 1 ? 's' : ''}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2 text-sm">
              <Users className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">População</p>
                <p className="font-medium">{currentPopulation.toLocaleString()}</p>
              </div>
            </div>
            {latestWeight && (
              <div className="flex items-center gap-2 text-sm">
                <Weight className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Peso Médio</p>
                  <p className="font-medium">{latestWeight.toFixed(1)}g</p>
                </div>
              </div>
            )}
            {currentBiomass && (
              <div className="flex items-center gap-2 text-sm">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Biomassa</p>
                  <p className="font-medium">{currentBiomass.toFixed(1)}kg</p>
                </div>
              </div>
            )}
            {todayFeedings > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Alimentações Hoje</p>
                  <p className="font-medium">{todayFeedings}</p>
                </div>
              </div>
            )}
          </div>

          {/* Status Indicators */}
          {(hasPendingEvaluations || lastEvaluationTime) && (
            <div className="space-y-2 pt-2 border-t">
              {hasPendingEvaluations && (
                <div className="flex items-center gap-2 text-sm text-orange-600">
                  <AlertTriangle className="h-4 w-4" />
                  <span>Alimentações aguardando avaliação</span>
                </div>
              )}
              {lastEvaluationTime && (
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  <span>Última avaliação: {lastEvaluationTime}</span>
                </div>
              )}
            </div>
          )}

          {/* Action Button */}
          <Button 
            onClick={() => setIsModalOpen(true)} 
            className="w-full"
            variant={hasPendingEvaluations ? "default" : "outline"}
          >
            <ClipboardCheck className="mr-2 h-4 w-4" />
            Avaliar Alimentação
          </Button>
        </CardContent>
      </Card>

      {/* Evaluation Modal */}
      <FeedingEvaluationModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        pondBatchId={pondBatchId}
        pondName={pondName}
        batchName={batchName}
        unevaluatedFeedings={unevaluatedFeedings}
        onEvaluationComplete={() => {
          setIsModalOpen(false);
        }}
      />
    </>
  );
}
