import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Fish, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { QuantityUtils } from '@/lib/quantityUtils';

interface FeedingHistoryRecord {
  id: string;
  feeding_date: string;
  feeding_time: string;
  actual_amount: number;
  feed_type_name: string;
  unit_cost: number;
  notes?: string;
}

interface FeedingHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pondBatchId: string;
  pondName: string;
  batchName: string;
}

export function FeedingHistoryDialog({ 
  open, 
  onOpenChange, 
  pondBatchId, 
  pondName, 
  batchName 
}: FeedingHistoryDialogProps) {
  const [historyRecords, setHistoryRecords] = useState<FeedingHistoryRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [totalQuantity, setTotalQuantity] = useState(0);
  const [totalCost, setTotalCost] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    if (open && pondBatchId) {
      loadFeedingHistory();
    }
  }, [open, pondBatchId]);

  const loadFeedingHistory = async () => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('feeding_records')
        .select('*')
        .eq('pond_batch_id', pondBatchId)
        .order('feeding_date', { ascending: false })
        .order('feeding_time', { ascending: false });

      if (error) throw error;

      setHistoryRecords(data || []);
      
      // Calculate totals (Anti-Drift: converter gramas para kg)
      const totalQty = (data || []).reduce((sum, record) => sum + QuantityUtils.gramsToKg(record.actual_amount), 0);
      const totalCostCalc = (data || []).reduce((sum, record) => {
        const actualAmountKg = QuantityUtils.gramsToKg(record.actual_amount);
        return sum + (actualAmountKg * (record.unit_cost || 0));
      }, 0);
      
      setTotalQuantity(totalQty);
      setTotalCost(totalCostCalc);

    } catch (error: any) {
      console.error('Error loading feeding history:', error);
      toast({
        title: "Erro ao carregar histórico",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR');
  };

  const formatTime = (time: string) => {
    return time.slice(0, 5); // HH:MM
  };

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Carregando histórico...</DialogTitle>
          </DialogHeader>
          <div className="flex justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Fish className="h-5 w-5" />
            Histórico de Alimentação - {pondName} ({batchName})
          </DialogTitle>
        </DialogHeader>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Fish className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Total Consumido</p>
                  <p className="text-2xl font-bold">{totalQuantity.toFixed(1)} kg</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-success" />
                <div>
                  <p className="text-sm text-muted-foreground">Custo Total</p>
                  <p className="text-2xl font-bold">R$ {totalCost.toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-ocean" />
                <div>
                  <p className="text-sm text-muted-foreground">Registros</p>
                  <p className="text-2xl font-bold">{historyRecords.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* History Records */}
        <div className="space-y-3">
          {historyRecords.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Fish className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhum registro encontrado</h3>
                <p className="text-muted-foreground">
                  Ainda não há registros de alimentação para este viveiro.
                </p>
              </CardContent>
            </Card>
          ) : (
            historyRecords.map((record) => (
              <Card key={record.id} className="border-l-4 border-l-primary">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 flex-1">
                      <div>
                        <p className="text-sm text-muted-foreground">Data/Hora</p>
                        <p className="font-medium">
                          {formatDate(record.feeding_date)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatTime(record.feeding_time)}
                        </p>
                      </div>
                      
                      <div>
                        <p className="text-sm text-muted-foreground">Tipo de Ração</p>
                        <Badge variant="secondary">
                          {record.feed_type_name || 'N/A'}
                        </Badge>
                      </div>
                      
                       <div>
                         <p className="text-sm text-muted-foreground">Quantidade</p>
                         <p className="font-bold text-primary">
                           {QuantityUtils.formatKg(record.actual_amount)} kg
                         </p>
                       </div>
                      
                       <div>
                         <p className="text-sm text-muted-foreground">Custo</p>
                         <p className="font-medium">
                           R$ {(QuantityUtils.gramsToKg(record.actual_amount) * (record.unit_cost || 0)).toFixed(2)}
                         </p>
                         <p className="text-xs text-muted-foreground">
                           R$ {(record.unit_cost || 0).toFixed(2)}/kg
                         </p>
                       </div>
                    </div>
                  </div>
                  
                  {record.notes && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-sm text-muted-foreground">Observações:</p>
                      <p className="text-sm">{record.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}