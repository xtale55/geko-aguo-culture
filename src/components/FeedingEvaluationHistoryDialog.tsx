import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Clock, User } from 'lucide-react';

interface FeedingEvaluationHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pondBatchId: string;
  pondName: string;
  batchName: string;
  stockingDate: string;
}

interface EvaluationRecord {
  id: string;
  evaluation_date: string;
  evaluation_time: string;
  amount_offered: number;
  consumption_evaluation: string;
  leftover_percentage: number | null;
  adjustment_amount: number;
  adjustment_percentage: number;
  notes: string | null;
  evaluator_name: string | null;
}

const consumptionLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  consumed_all: { label: 'Consumiu Tudo', variant: 'default' },
  left_little: { label: 'Sobrou Pouco', variant: 'secondary' },
  partial_consumption: { label: 'Consumo Parcial', variant: 'outline' },
  no_consumption: { label: 'Não Consumiu', variant: 'destructive' },
  excess_leftover: { label: 'Muita Sobra', variant: 'destructive' },
};

export function FeedingEvaluationHistoryDialog({
  open,
  onOpenChange,
  pondBatchId,
  pondName,
  batchName,
  stockingDate,
}: FeedingEvaluationHistoryDialogProps) {
  const { data: evaluations, isLoading } = useQuery({
    queryKey: ['feeding-evaluation-history', pondBatchId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('feeding_evaluations')
        .select('*')
        .eq('pond_batch_id', pondBatchId)
        .order('evaluation_date', { ascending: false })
        .order('evaluation_time', { ascending: false });

      if (error) throw error;

      // Get evaluator names separately
      const userIds = [...new Set(data?.map(e => e.evaluated_by).filter(Boolean))];
      
      let profilesMap: Record<string, string> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', userIds);
        
        profilesMap = (profiles || []).reduce((acc, p) => {
          acc[p.user_id] = p.full_name;
          return acc;
        }, {} as Record<string, string>);
      }

      return (data || []).map(item => ({
        ...item,
        evaluator_name: item.evaluated_by ? profilesMap[item.evaluated_by] || null : null,
      })) as EvaluationRecord[];
    },
    enabled: open && !!pondBatchId,
  });

  // Calculate DOC
  const doc = stockingDate 
    ? Math.ceil((new Date().getTime() - new Date(stockingDate).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Histórico de Avaliações - {pondName}
          </DialogTitle>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>{batchName}</span>
            <span>•</span>
            <span>DOC: {doc} dias</span>
            <span>•</span>
            <span>{evaluations?.length || 0} avaliações</span>
          </div>
        </DialogHeader>

        <ScrollArea className="h-[60vh]">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : evaluations && evaluations.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead className="text-right">Oferecido</TableHead>
                  <TableHead>Consumo</TableHead>
                  <TableHead className="text-right">Sobra %</TableHead>
                  <TableHead className="text-right">Ajuste</TableHead>
                  <TableHead>Observações</TableHead>
                  <TableHead>Avaliador</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {evaluations.map((evaluation) => {
                  const consumptionInfo = consumptionLabels[evaluation.consumption_evaluation] || {
                    label: evaluation.consumption_evaluation,
                    variant: 'outline' as const,
                  };

                  return (
                    <TableRow key={evaluation.id}>
                      <TableCell className="font-medium">
                        <div className="flex flex-col">
                          <span>
                            {format(new Date(evaluation.evaluation_date), 'dd/MM/yyyy', { locale: ptBR })}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {evaluation.evaluation_time.substring(0, 5)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {(evaluation.amount_offered / 1000).toFixed(2)} kg
                      </TableCell>
                      <TableCell>
                        <Badge variant={consumptionInfo.variant}>
                          {consumptionInfo.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {evaluation.leftover_percentage !== null 
                          ? `${evaluation.leftover_percentage.toFixed(0)}%`
                          : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-col items-end">
                          <span className={evaluation.adjustment_amount > 0 ? 'text-green-600' : evaluation.adjustment_amount < 0 ? 'text-red-600' : ''}>
                            {evaluation.adjustment_amount > 0 ? '+' : ''}
                            {(evaluation.adjustment_amount / 1000).toFixed(2)} kg
                          </span>
                          <span className="text-xs text-muted-foreground">
                            ({evaluation.adjustment_percentage > 0 ? '+' : ''}
                            {evaluation.adjustment_percentage.toFixed(1)}%)
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate" title={evaluation.notes || ''}>
                        {evaluation.notes || '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <User className="h-3 w-3 text-muted-foreground" />
                          <span className="truncate max-w-[100px]" title={evaluation.evaluator_name || 'Sistema'}>
                            {evaluation.evaluator_name || 'Sistema'}
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Clock className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">Nenhuma avaliação registrada</p>
              <p className="text-sm text-muted-foreground mt-1">
                As avaliações de alimentação aparecerão aqui
              </p>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
