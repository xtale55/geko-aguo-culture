import { useState } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ClipboardCheck, Clock, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useFarmsQuery } from '@/hooks/useSupabaseQuery';
import { usePendingFeedingEvaluations } from '@/hooks/useFeedingEvaluation';
import { FeedingEvaluationModal } from '@/components/FeedingEvaluationModal';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function AvaliacaoAlimentacaoPage() {
  const navigate = useNavigate();
  const { data: farms } = useFarmsQuery();
  const farm = farms?.[0];
  const { data: pendingEvaluations, isLoading, refetch } = usePendingFeedingEvaluations(farm?.id);
  const [selectedFeedingRecord, setSelectedFeedingRecord] = useState<any>(null);
  const [evaluationModalOpen, setEvaluationModalOpen] = useState(false);

  const handleEvaluateFeeding = (evaluation: any) => {
    setSelectedFeedingRecord({
      id: evaluation.id,
      pond_batch_id: evaluation.pond_batch_id,
      feeding_date: evaluation.feeding_date,
      feeding_time: evaluation.feeding_time,
      actual_amount: evaluation.actual_amount,
      planned_amount: evaluation.planned_amount,
      pond_name: evaluation.pond_name,
      batch_name: evaluation.batch_name,
    });
    setEvaluationModalOpen(true);
  };

  const handleEvaluationComplete = () => {
    refetch();
    setSelectedFeedingRecord(null);
    setEvaluationModalOpen(false);
  };

  const isOverdue = (evaluationDueTime: string) => {
    const now = new Date();
    const dueTime = new Date(evaluationDueTime);
    const hoursSince = (now.getTime() - dueTime.getTime()) / (1000 * 60 * 60);
    return hoursSince > 2;
  };

  return (
    <Layout>
      <div className="container mx-auto p-4 sm:p-6 max-w-7xl">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/manejos')}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para Manejos
          </Button>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-amber-600/10 rounded-lg">
              <ClipboardCheck className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Avaliação de Alimentação</h1>
              <p className="text-muted-foreground">
                Avalie o consumo de ração e ajuste automaticamente as próximas alimentações
              </p>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Pending Evaluations */}
        {!isLoading && pendingEvaluations && pendingEvaluations.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-amber-600" />
                    Alimentações Pendentes de Avaliação
                  </CardTitle>
                  <CardDescription>
                    {pendingEvaluations.length} alimentação{pendingEvaluations.length !== 1 ? 'ões' : ''} aguardando avaliação
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {pendingEvaluations.map((evaluation) => {
                  const overdue = isOverdue(evaluation.evaluation_due_time);
                  const dueTime = parseISO(evaluation.evaluation_due_time);
                  
                  return (
                    <Card key={evaluation.id} className="border-l-4 border-l-amber-600">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-semibold text-lg">
                                {evaluation.pond_name}
                              </h3>
                              <Badge variant="outline" className="text-xs">
                                {evaluation.batch_name}
                              </Badge>
                              {overdue && (
                                <Badge variant="destructive" className="text-xs">
                                  Atrasada
                                </Badge>
                              )}
                            </div>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm text-muted-foreground">
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4" />
                                <span>
                                  {format(parseISO(`${evaluation.feeding_date}T${evaluation.feeding_time}`), "dd/MM 'às' HH:mm", { locale: ptBR })}
                                </span>
                              </div>
                              <div>
                                <span className="font-medium">Quantidade:</span> {(evaluation.actual_amount / 1000).toFixed(1)} kg
                              </div>
                              <div>
                                <span className="font-medium">Liberada há:</span>{' '}
                                {format(dueTime, "HH:mm", { locale: ptBR })}
                              </div>
                            </div>
                          </div>
                          
                          <Button
                            onClick={() => handleEvaluateFeeding(evaluation)}
                            className="shrink-0"
                          >
                            <ClipboardCheck className="mr-2 h-4 w-4" />
                            Avaliar
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* No Pending Evaluations */}
        {!isLoading && (!pendingEvaluations || pendingEvaluations.length === 0) && (
          <Card>
            <CardContent className="p-8">
              <div className="text-center space-y-4">
                <div className="flex justify-center">
                  <div className="p-4 bg-green-600/10 rounded-full">
                    <ClipboardCheck className="h-12 w-12 text-green-600" />
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">
                    Tudo em dia!
                  </h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    Não há alimentações pendentes de avaliação no momento. As avaliações ficam disponíveis 2 horas após cada alimentação.
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => navigate('/manejos/alimentacao')}
                >
                  Ir para Alimentação
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Info Card */}
        <Card className="mt-6 border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
          <CardHeader>
            <CardTitle className="text-lg">Como funciona a avaliação?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>• As avaliações ficam disponíveis <strong>2 horas após</strong> cada alimentação</p>
            <p>• Avalie o <strong>consumo real</strong> de ração observado no viveiro</p>
            <p>• O sistema ajusta <strong>automaticamente</strong> a próxima alimentação baseado na sua avaliação</p>
            <p>• Quanto mais avaliações você fizer, mais <strong>preciso</strong> fica o sistema</p>
          </CardContent>
        </Card>
      </div>

      {/* Evaluation Modal */}
      {selectedFeedingRecord && (
        <FeedingEvaluationModal
          open={evaluationModalOpen}
          onOpenChange={setEvaluationModalOpen}
          feedingRecord={selectedFeedingRecord}
          onEvaluationComplete={handleEvaluationComplete}
        />
      )}
    </Layout>
  );
}
