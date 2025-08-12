import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Utensils, TrendingUp } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface FeedingRecord {
  id: string;
  feeding_date: string;
  feeding_time: string;
  planned_amount: number;
  actual_amount: number;
  feed_type_name: string;
  unit_cost: number;
  pond_name: string;
  batch_name: string;
}

interface FeedingSummary {
  totalPlanned: number;
  totalActual: number;
  totalCost: number;
  recordsCount: number;
  efficiency: number;
}

export function FeedingHistoryPanel() {
  const [recentFeedings, setRecentFeedings] = useState<FeedingRecord[]>([]);
  const [feedingSummary, setFeedingSummary] = useState<FeedingSummary>({
    totalPlanned: 0,
    totalActual: 0,
    totalCost: 0,
    recordsCount: 0,
    efficiency: 0
  });
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      loadFeedingHistory();
    }
  }, [user]);

  const loadFeedingHistory = async () => {
    try {
      setLoading(true);

      // Get farms
      const { data: farms } = await supabase
        .from('farms')
        .select('id')
        .eq('user_id', user?.id);

      if (!farms || farms.length === 0) {
        setLoading(false);
        return;
      }

      const farmId = farms[0].id;

      // Get pond batch IDs for this farm
      const { data: pondBatchIds } = await supabase
        .from('pond_batches')
        .select('id')
        .in('pond_id',
          await supabase
            .from('ponds')
            .select('id')
            .eq('farm_id', farmId)
            .then(({ data }) => data?.map(p => p.id) || [])
        );

      if (!pondBatchIds || pondBatchIds.length === 0) {
        setLoading(false);
        return;
      }

      // Get recent feeding records
      const { data: feedingRecords } = await supabase
        .from('feeding_records')
        .select('*')
        .in('pond_batch_id', pondBatchIds.map(pb => pb.id))
        .order('feeding_date', { ascending: false })
        .order('feeding_time', { ascending: false })
        .limit(10);

      // Get pond batch details separately
      const { data: pondBatches } = await supabase
        .from('pond_batches')
        .select(`
          id,
          ponds(name),
          batches(name)
        `)
        .in('id', pondBatchIds.map(pb => pb.id));

      // Process recent feedings
      const processedFeedings: FeedingRecord[] = feedingRecords?.map(record => {
        const pondBatch = pondBatches?.find(pb => pb.id === record.pond_batch_id);
        return {
          id: record.id,
          feeding_date: record.feeding_date,
          feeding_time: record.feeding_time,
          planned_amount: record.planned_amount,
          actual_amount: record.actual_amount,
          feed_type_name: record.feed_type_name || 'Não especificado',
          unit_cost: record.unit_cost || 0,
          pond_name: pondBatch?.ponds?.name || 'N/A',
          batch_name: pondBatch?.batches?.name || 'N/A'
        };
      }) || [];

      setRecentFeedings(processedFeedings);

      // Calculate summary for last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: summaryRecords } = await supabase
        .from('feeding_records')
        .select('planned_amount, actual_amount, unit_cost')
        .in('pond_batch_id', pondBatchIds.map(pb => pb.id))
        .gte('feeding_date', thirtyDaysAgo.toISOString().split('T')[0]);

      if (summaryRecords) {
        const totalPlanned = summaryRecords.reduce((sum, r) => sum + r.planned_amount, 0);
        const totalActual = summaryRecords.reduce((sum, r) => sum + r.actual_amount, 0);
        const totalCost = summaryRecords.reduce((sum, r) => sum + (r.actual_amount * (r.unit_cost || 0)), 0);
        const efficiency = totalPlanned > 0 ? (totalActual / totalPlanned) * 100 : 0;

        setFeedingSummary({
          totalPlanned,
          totalActual,
          totalCost,
          recordsCount: summaryRecords.length,
          efficiency
        });
      }

    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao carregar histórico de alimentação",
        description: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Utensils className="w-5 h-5" />
            Histórico de Alimentação
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-muted rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Utensils className="w-5 h-5" />
          Histórico de Alimentação
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-primary/10 rounded-lg p-3">
            <p className="text-xs text-muted-foreground">Total Consumido (30d)</p>
            <p className="text-lg font-bold text-primary">{feedingSummary.totalActual.toFixed(1)} kg</p>
          </div>
          <div className="bg-success/10 rounded-lg p-3">
            <p className="text-xs text-muted-foreground">Custo Total (30d)</p>
            <p className="text-lg font-bold text-success">R$ {feedingSummary.totalCost.toFixed(0)}</p>
          </div>
          <div className="bg-warning/10 rounded-lg p-3">
            <p className="text-xs text-muted-foreground">Eficiência</p>
            <p className="text-lg font-bold text-warning">{feedingSummary.efficiency.toFixed(1)}%</p>
          </div>
          <div className="bg-accent/10 rounded-lg p-3">
            <p className="text-xs text-muted-foreground">Registros</p>
            <p className="text-lg font-bold text-accent">{feedingSummary.recordsCount}</p>
          </div>
        </div>

        {/* Recent Feedings */}
        <div className="space-y-3">
          <h3 className="font-medium text-sm">Registros Recentes</h3>
          {recentFeedings.length === 0 ? (
            <p className="text-muted-foreground text-sm">Nenhum registro de alimentação encontrado.</p>
          ) : (
            recentFeedings.map((feeding) => (
              <div key={feeding.id} className="border rounded-lg p-3 space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-medium text-sm">{feeding.batch_name} - {feeding.pond_name}</h4>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {new Date(feeding.feeding_date).toLocaleDateString('pt-BR')} às {feeding.feeding_time}
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {feeding.feed_type_name}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-3 gap-4 text-xs">
                  <div>
                    <p className="text-muted-foreground">Planejado</p>
                    <p className="font-medium">{feeding.planned_amount.toFixed(1)} kg</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Realizado</p>
                    <p className="font-medium">{feeding.actual_amount.toFixed(1)} kg</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Custo</p>
                    <p className="font-medium">R$ {(feeding.actual_amount * feeding.unit_cost).toFixed(2)}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}