import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Calendar, Scale } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface BiometryRecord {
  measurement_date: string;
  average_weight: number;
  pond_batch_id: string;
  pond_name: string;
  batch_name: string;
}

interface GrowthData {
  pond_batch_id: string;
  pond_name: string;
  batch_name: string;
  stocking_date: string;
  doc: number;
  weekly_growth: number;
  daily_growth: number;
  growth_trend: 'increasing' | 'stable' | 'decreasing';
  latest_weight: number;
  initial_weight: number;
  total_growth: number;
}

export function GrowthAnalysis() {
  const [growthData, setGrowthData] = useState<GrowthData[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      loadGrowthAnalysis();
    }
  }, [user]);

  const loadGrowthAnalysis = async () => {
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

      // Get all pond batches with biometries
      const { data: pondBatches } = await supabase
        .from('pond_batches')
        .select(`
          id,
          stocking_date,
          ponds(name),
          batches(name),
          biometrics(measurement_date, average_weight)
        `)
        .in('pond_id',
          await supabase
            .from('ponds')
            .select('id')
            .eq('farm_id', farmId)
            .then(({ data }) => data?.map(p => p.id) || [])
        );

      const processedGrowthData: GrowthData[] = [];

      pondBatches?.forEach(pondBatch => {
        const biometries = pondBatch.biometrics || [];
        
        if (biometries.length < 2) return; // Need at least 2 measurements

        // Sort biometries by date
        const sortedBiometries = biometries.sort((a, b) => 
          new Date(a.measurement_date).getTime() - new Date(b.measurement_date).getTime()
        );

        const firstBiometry = sortedBiometries[0];
        const lastBiometry = sortedBiometries[sortedBiometries.length - 1];
        const secondLastBiometry = sortedBiometries[sortedBiometries.length - 2];

        // Calculate DOC
        const stocking = new Date(pondBatch.stocking_date);
        const today = new Date();
        const doc = Math.ceil((today.getTime() - stocking.getTime()) / (1000 * 60 * 60 * 24));

        // Calculate growth metrics
        const totalDays = Math.ceil(
          (new Date(lastBiometry.measurement_date).getTime() - 
           new Date(firstBiometry.measurement_date).getTime()) / (1000 * 60 * 60 * 24)
        );

        const totalGrowth = lastBiometry.average_weight - firstBiometry.average_weight;
        const dailyGrowth = totalDays > 0 ? totalGrowth / totalDays : 0;
        const weeklyGrowth = dailyGrowth * 7;

        // Determine growth trend (comparing last two measurements)
        let growthTrend: 'increasing' | 'stable' | 'decreasing';
        if (biometries.length >= 2) {
          const recentGrowth = lastBiometry.average_weight - secondLastBiometry.average_weight;
          if (recentGrowth > 0.5) {
            growthTrend = 'increasing';
          } else if (recentGrowth < -0.5) {
            growthTrend = 'decreasing';
          } else {
            growthTrend = 'stable';
          }
        } else {
          growthTrend = 'stable';
        }

        processedGrowthData.push({
          pond_batch_id: pondBatch.id,
          pond_name: pondBatch.ponds?.name || 'N/A',
          batch_name: pondBatch.batches?.name || 'N/A',
          stocking_date: pondBatch.stocking_date,
          doc,
          weekly_growth: weeklyGrowth,
          daily_growth: dailyGrowth,
          growth_trend: growthTrend,
          latest_weight: lastBiometry.average_weight,
          initial_weight: firstBiometry.average_weight,
          total_growth: totalGrowth
        });
      });

      // Sort by DOC (most recent first)
      processedGrowthData.sort((a, b) => b.doc - a.doc);
      setGrowthData(processedGrowthData);

    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao carregar análise de crescimento",
        description: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing':
        return <TrendingUp className="w-4 h-4 text-success" />;
      case 'decreasing':
        return <TrendingUp className="w-4 h-4 text-destructive rotate-180" />;
      default:
        return <TrendingUp className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'increasing':
        return 'default';
      case 'decreasing':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Análise de Crescimento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-muted rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const averageWeeklyGrowth = growthData.length > 0 
    ? growthData.reduce((sum, data) => sum + data.weekly_growth, 0) / growthData.length 
    : 0;

  const averageDailyGrowth = growthData.length > 0 
    ? growthData.reduce((sum, data) => sum + data.daily_growth, 0) / growthData.length 
    : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Análise de Crescimento
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Metrics */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-primary/10 rounded-lg p-3">
            <p className="text-xs text-muted-foreground">Crescimento Semanal Médio</p>
            <p className="text-lg font-bold text-primary">{averageWeeklyGrowth.toFixed(2)}g</p>
          </div>
          <div className="bg-success/10 rounded-lg p-3">
            <p className="text-xs text-muted-foreground">Crescimento Diário Médio</p>
            <p className="text-lg font-bold text-success">{averageDailyGrowth.toFixed(2)}g</p>
          </div>
        </div>

        {/* Growth Data by Pond */}
        <div className="space-y-3">
          <h3 className="font-medium text-sm">Performance por Viveiro</h3>
          {growthData.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Não há dados suficientes para análise de crescimento. 
              São necessárias pelo menos 2 biometrias por viveiro.
            </p>
          ) : (
            growthData.map((data) => (
              <div key={data.pond_batch_id} className="border rounded-lg p-3 space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-medium text-sm">{data.batch_name} - {data.pond_name}</h4>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      DOC {data.doc} • Iniciado em {new Date(data.stocking_date).toLocaleDateString('pt-BR')}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getTrendIcon(data.growth_trend)}
                    <Badge variant={getTrendColor(data.growth_trend) as any} className="text-xs">
                      {data.growth_trend === 'increasing' ? 'Crescendo' : 
                       data.growth_trend === 'decreasing' ? 'Declinando' : 'Estável'}
                    </Badge>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                  <div>
                    <p className="text-muted-foreground">Peso Atual</p>
                    <p className="font-medium flex items-center gap-1">
                      <Scale className="w-3 h-3" />
                      {data.latest_weight.toFixed(1)}g
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Crescimento Total</p>
                    <p className="font-medium text-primary">+{data.total_growth.toFixed(1)}g</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Crescimento Semanal</p>
                    <p className="font-medium text-success">{data.weekly_growth.toFixed(2)}g/sem</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Crescimento Diário</p>
                    <p className="font-medium text-accent">{data.daily_growth.toFixed(2)}g/dia</p>
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