import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDateForDisplay } from '@/lib/utils';
import { Calendar, Clock, TrendingUp, Users } from 'lucide-react';

interface FeedingEvaluationHistoryProps {
  farmId: string;
}

interface EvaluationRecord {
  id: string;
  pond_batch_id: string;
  evaluation_date: string;
  evaluation_time: string;
  amount_offered: number;
  consumption_evaluation: string;
  leftover_percentage: number | null;
  adjustment_amount: number;
  adjustment_percentage: number;
  notes: string | null;
  pond_name: string;
  batch_name: string;
  stocking_date: string;
  evaluator_name: string | null;
}

const consumptionLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  consumed_all: { label: 'Consumiu Tudo', variant: 'default' },
  left_little: { label: 'Sobrou Pouco', variant: 'secondary' },
  partial_consumption: { label: 'Consumo Parcial', variant: 'outline' },
  no_consumption: { label: 'Não Consumiu', variant: 'destructive' },
  excess_leftover: { label: 'Muita Sobra', variant: 'destructive' },
};

export function FeedingEvaluationHistory({ farmId }: FeedingEvaluationHistoryProps) {
  const { data: evaluations, isLoading } = useQuery({
    queryKey: ['feeding-evaluation-history', farmId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('feeding_evaluations')
        .select(`
          *,
          pond_batches!inner(
            pond_id,
            batch_id,
            stocking_date,
            cycle_status,
            ponds!inner(
              name,
              farm_id
            ),
            batches!inner(
              name
            )
          ),
          profiles(
            full_name
          )
        `)
        .eq('pond_batches.ponds.farm_id', farmId)
        .eq('pond_batches.cycle_status', 'active')
        .order('evaluation_date', { ascending: false })
        .order('evaluation_time', { ascending: false });

      if (error) throw error;

      // Transform data
      return data?.map((item: any) => ({
        id: item.id,
        pond_batch_id: item.pond_batch_id,
        evaluation_date: item.evaluation_date,
        evaluation_time: item.evaluation_time,
        amount_offered: item.amount_offered,
        consumption_evaluation: item.consumption_evaluation,
        leftover_percentage: item.leftover_percentage,
        adjustment_amount: item.adjustment_amount,
        adjustment_percentage: item.adjustment_percentage,
        notes: item.notes,
        pond_name: item.pond_batches?.ponds?.name,
        batch_name: item.pond_batches?.batches?.name,
        stocking_date: item.pond_batches?.stocking_date,
        evaluator_name: item.profiles?.full_name || 'Sistema',
      })) as EvaluationRecord[];
    },
    enabled: !!farmId,
  });

  // Group evaluations by pond_batch_id
  const groupedEvaluations = evaluations?.reduce((acc, evaluation) => {
    if (!acc[evaluation.pond_batch_id]) {
      acc[evaluation.pond_batch_id] = {
        pond_name: evaluation.pond_name,
        batch_name: evaluation.batch_name,
        stocking_date: evaluation.stocking_date,
        evaluations: [],
      };
    }
    acc[evaluation.pond_batch_id].evaluations.push(evaluation);
    return acc;
  }, {} as Record<string, { pond_name: string; batch_name: string; stocking_date: string; evaluations: EvaluationRecord[] }>);

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

  if (!evaluations || evaluations.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Nenhuma avaliação registrada</h3>
          <p className="text-muted-foreground">
            Comece avaliando as alimentações na aba "Avaliar"
          </p>
        </CardContent>
      </Card>
    );
  }

  const calculateDOC = (stockingDate: string) => {
    const stocking = new Date(stockingDate);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - stocking.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Histórico de Avaliações por Lote
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Visualize todas as avaliações registradas para cada lote ativo
        </p>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible className="w-full">
          {Object.entries(groupedEvaluations || {}).map(([pondBatchId, data]) => {
            const doc = calculateDOC(data.stocking_date);
            
            return (
              <AccordionItem key={pondBatchId} value={pondBatchId}>
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center justify-between w-full pr-4">
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="font-semibold text-left">{data.pond_name}</p>
                        <p className="text-sm text-muted-foreground text-left">{data.batch_name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">DOC: {doc}</span>
                      </div>
                      <Badge variant="secondary">
                        {data.evaluations.length} avaliações
                      </Badge>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="pt-4">
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Data/Hora</TableHead>
                            <TableHead>Oferecido</TableHead>
                            <TableHead>Consumo</TableHead>
                            <TableHead>Sobra %</TableHead>
                            <TableHead>Ajuste</TableHead>
                            <TableHead>Observações</TableHead>
                            <TableHead>Avaliador</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {data.evaluations.map((evaluation) => {
                            const consumptionInfo = consumptionLabels[evaluation.consumption_evaluation] || {
                              label: evaluation.consumption_evaluation,
                              variant: 'outline' as const,
                            };
                            
                            return (
                              <TableRow key={evaluation.id}>
                                <TableCell className="whitespace-nowrap">
                                  <div className="flex flex-col">
                                    <span className="font-medium">
                                      {formatDateForDisplay(evaluation.evaluation_date)}
                                    </span>
                                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      {evaluation.evaluation_time}
                                    </span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <span className="font-medium">
                                    {(evaluation.amount_offered / 1000).toFixed(2)} kg
                                  </span>
                                </TableCell>
                                <TableCell>
                                  <Badge variant={consumptionInfo.variant}>
                                    {consumptionInfo.label}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  {evaluation.leftover_percentage !== null ? (
                                    <span className="text-muted-foreground">
                                      {evaluation.leftover_percentage.toFixed(0)}%
                                    </span>
                                  ) : (
                                    <span className="text-muted-foreground">-</span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1">
                                    {evaluation.adjustment_amount !== 0 && (
                                      <>
                                        <TrendingUp className={`h-4 w-4 ${evaluation.adjustment_amount > 0 ? 'text-green-600' : 'text-red-600'}`} />
                                        <span className={evaluation.adjustment_amount > 0 ? 'text-green-600' : 'text-red-600'}>
                                          {evaluation.adjustment_amount > 0 ? '+' : ''}
                                          {(evaluation.adjustment_amount / 1000).toFixed(2)} kg
                                        </span>
                                        <span className="text-xs text-muted-foreground ml-1">
                                          ({evaluation.adjustment_percentage > 0 ? '+' : ''}
                                          {evaluation.adjustment_percentage.toFixed(1)}%)
                                        </span>
                                      </>
                                    )}
                                    {evaluation.adjustment_amount === 0 && (
                                      <span className="text-muted-foreground">Sem ajuste</span>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {evaluation.notes ? (
                                    <span className="text-sm text-muted-foreground truncate max-w-xs block">
                                      {evaluation.notes}
                                    </span>
                                  ) : (
                                    <span className="text-muted-foreground">-</span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <span className="text-sm text-muted-foreground">
                                    {evaluation.evaluator_name}
                                  </span>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </CardContent>
    </Card>
  );
}
