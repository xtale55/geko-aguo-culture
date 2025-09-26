import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Clock, Eye } from 'lucide-react';
import { usePendingFeedingEvaluations } from '@/hooks/useFeedingEvaluation';
import { FeedingEvaluationModal } from './FeedingEvaluationModal';

interface FeedingEvaluationNotificationsProps {
  farmId?: string;
}

export function FeedingEvaluationNotifications({ farmId }: FeedingEvaluationNotificationsProps) {
  const { data: pendingEvaluations, isLoading, refetch } = usePendingFeedingEvaluations(farmId);
  const [selectedFeedingRecord, setSelectedFeedingRecord] = useState<any>(null);
  const [evaluationModalOpen, setEvaluationModalOpen] = useState(false);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!pendingEvaluations || pendingEvaluations.length === 0) {
    return null; // Don't show anything if no pending evaluations
  }

  const handleEvaluateFeeding = (feedingRecord: any) => {
    setSelectedFeedingRecord(feedingRecord);
    setEvaluationModalOpen(true);
  };

  const handleEvaluationComplete = () => {
    refetch();
    setSelectedFeedingRecord(null);
  };

  return (
    <>
      <Card className="border-orange-200 bg-orange-50">
        <CardHeader className="pb-3">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            <CardTitle className="text-orange-800">Avaliações de Alimentação Pendentes</CardTitle>
          </div>
          <CardDescription className="text-orange-700">
            Há {pendingEvaluations.length} alimentação(ões) aguardando avaliação de consumo (2h após alimentação).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {pendingEvaluations.map((evaluation) => {
            const feedingTime = new Date(`${evaluation.feeding_date}T${evaluation.feeding_time}`);
            const dueTime = new Date(evaluation.evaluation_due_time);
            const overdueMinutes = Math.floor((Date.now() - dueTime.getTime()) / (1000 * 60));
            
            return (
              <div
                key={evaluation.id}
                className="flex items-center justify-between p-3 bg-white border border-orange-200 rounded-lg"
              >
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="font-medium text-sm">
                      {evaluation.pond_name} - {evaluation.batch_name}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {(evaluation.actual_amount / 1000).toFixed(1)} kg
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                    <div className="flex items-center space-x-1">
                      <Clock className="h-3 w-3" />
                      <span>{feedingTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    {overdueMinutes > 0 && (
                      <Badge variant="destructive" className="text-xs">
                        {overdueMinutes}min atrasado
                      </Badge>
                    )}
                  </div>
                </div>
                
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleEvaluateFeeding(evaluation)}
                  className="ml-3"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Avaliar
                </Button>
              </div>
            );
          })}
          
          <div className="pt-2 text-xs text-orange-600">
            <div className="flex items-center space-x-1">
              <AlertTriangle className="h-3 w-3" />
              <span>
                Avalie o consumo para ajustar automaticamente as próximas alimentações
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedFeedingRecord && (
        <FeedingEvaluationModal
          open={evaluationModalOpen}
          onOpenChange={setEvaluationModalOpen}
          feedingRecord={selectedFeedingRecord}
          onEvaluationComplete={handleEvaluationComplete}
        />
      )}
    </>
  );
}