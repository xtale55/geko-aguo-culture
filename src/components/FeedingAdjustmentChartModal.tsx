import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendUp, Target, CheckCircle, Warning } from '@phosphor-icons/react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
interface FeedingAdjustmentData {
  date: string;
  doc: number;
  cumulative_standard: number; // Ração padrão acumulada (kg)
  cumulative_adjusted: number; // Ração ajustada acumulada (kg) 
  cumulative_actual: number; // Ração real acumulada (kg)
}
interface FeedingAdjustmentChartModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pondBatchId: string;
  pondName: string;
  batchName: string;
  currentBiomass: number;
  feedingRate: number;
  mealsPerDay: number;
}
export function FeedingAdjustmentChartModal({
  open,
  onOpenChange,
  pondBatchId,
  pondName,
  batchName,
  currentBiomass,
  feedingRate,
  mealsPerDay
}: FeedingAdjustmentChartModalProps) {
  const [data, setData] = useState<FeedingAdjustmentData[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    adherenceRate: 0,
    avgVariation: 0,
    economyWaste: 0,
    totalDays: 0
  });
  useEffect(() => {
    if (open && pondBatchId) {
      fetchAdjustmentData();
    }
  }, [open, pondBatchId]);
  const fetchAdjustmentData = async () => {
    setLoading(true);
    try {
      // Buscar dados do pond_batch primeiro
      const {
        data: pondBatch,
        error: pondError
      } = await supabase.from('pond_batches').select('current_population, pl_quantity, stocking_date').eq('id', pondBatchId).single();
      if (pondError) throw pondError;
      const stockingDate = new Date(pondBatch.stocking_date);
      const today = new Date();

      // Buscar TODOS os registros de alimentação desde o povoamento
      const {
        data: feedingRecords,
        error: feedingError
      } = await supabase.from('feeding_records').select('feeding_date, planned_amount, actual_amount').eq('pond_batch_id', pondBatchId).gte('feeding_date', pondBatch.stocking_date).order('feeding_date', {
        ascending: true
      });
      if (feedingError) throw feedingError;

      // Buscar dados de biometria históricos desde o povoamento
      const {
        data: biometrics,
        error: biometricsError
      } = await supabase.from('biometrics').select('measurement_date, average_weight').eq('pond_batch_id', pondBatchId).gte('measurement_date', pondBatch.stocking_date).order('measurement_date', {
        ascending: true
      });
      if (biometricsError) throw biometricsError;

      // Buscar feeding_rates
      const {
        data: pondInfo,
        error: pondInfoError
      } = await supabase.from('pond_batches').select('pond_id, ponds!inner(farm_id)').eq('id', pondBatchId).single();
      if (pondInfoError) throw pondInfoError;
      const farmId = pondInfo?.ponds?.farm_id;
      const {
        data: feedingRates,
        error: ratesError
      } = await supabase.from('feeding_rates').select('weight_range_min, weight_range_max, feeding_percentage, meals_per_day').or(`pond_batch_id.eq.${pondBatchId},farm_id.eq.${farmId}`).order('weight_range_min', {
        ascending: true
      });
      if (ratesError) throw ratesError;

      // Função para interpolar peso médio
      const interpolateWeight = (date: Date): number => {
        if (!biometrics || biometrics.length === 0) return 1;
        if (biometrics.length === 1) return biometrics[0].average_weight;
        let beforeBio = null;
        let afterBio = null;
        for (const bio of biometrics) {
          const bioDate = new Date(bio.measurement_date);
          if (bioDate <= date) {
            beforeBio = bio;
          } else if (!afterBio && bioDate > date) {
            afterBio = bio;
            break;
          }
        }
        if (beforeBio && afterBio) {
          const beforeDate = new Date(beforeBio.measurement_date).getTime();
          const afterDate = new Date(afterBio.measurement_date).getTime();
          const targetTime = date.getTime();
          const ratio = (targetTime - beforeDate) / (afterDate - beforeDate);
          return beforeBio.average_weight + (afterBio.average_weight - beforeBio.average_weight) * ratio;
        }
        return beforeBio?.average_weight || afterBio?.average_weight || 1;
      };

      // Função para obter taxa de alimentação baseada no peso
      const getFeedingRateByWeight = (weight: number) => {
        const applicableRate = feedingRates?.find(fr => weight >= (fr.weight_range_min || 0) && weight <= (fr.weight_range_max || 999));
        if (applicableRate) {
          return {
            rate: applicableRate.feeding_percentage,
            meals: applicableRate.meals_per_day
          };
        }

        // Fallback baseado no peso
        if (weight < 1) return {
          rate: 10,
          meals: 5
        };
        if (weight < 3) return {
          rate: 8,
          meals: 4
        };
        if (weight < 5) return {
          rate: 6,
          meals: 4
        };
        if (weight < 10) return {
          rate: 4,
          meals: 3
        };
        if (weight < 15) return {
          rate: 2.5,
          meals: 2
        };
        return {
          rate: 2,
          meals: 2
        };
      };

      // Criar timeline diária com cálculos acumulados
      let cumulativeStandard = 0;
      let cumulativeAdjusted = 0;
      let cumulativeActual = 0;
      const processedData: FeedingAdjustmentData[] = [];
      for (let d = new Date(stockingDate); d <= today; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        const doc = Math.floor((d.getTime() - stockingDate.getTime()) / (1000 * 60 * 60 * 24));

        // Calcular ração padrão teórica para este dia
        const avgWeight = interpolateWeight(d);
        const biomass = pondBatch.current_population * avgWeight / 1000; // kg
        const {
          rate
        } = getFeedingRateByWeight(avgWeight);
        const dailyStandardAmount = biomass * rate / 100; // kg por dia

        // Buscar registros reais para este dia
        const dayRecords = feedingRecords.filter(r => r.feeding_date === dateStr);
        let dailyAdjusted = 0;
        let dailyActual = 0;
        if (dayRecords.length > 0) {
          dailyAdjusted = dayRecords.reduce((sum, record) => sum + record.planned_amount / 1000, 0);
          dailyActual = dayRecords.reduce((sum, record) => sum + record.actual_amount / 1000, 0);
        }

        // Acumular valores
        cumulativeStandard += dailyStandardAmount;
        cumulativeAdjusted += dailyAdjusted;
        cumulativeActual += dailyActual;
        processedData.push({
          date: dateStr,
          doc,
          cumulative_standard: cumulativeStandard,
          cumulative_adjusted: cumulativeAdjusted,
          cumulative_actual: cumulativeActual
        });
      }
      setData(processedData);
      calculateStats(processedData);
    } catch (error) {
      console.error('Error fetching adjustment data:', error);
    } finally {
      setLoading(false);
    }
  };
  const calculateStats = (data: FeedingAdjustmentData[]) => {
    if (data.length === 0) {
      setStats({
        adherenceRate: 0,
        avgVariation: 0,
        economyWaste: 0,
        totalDays: 0
      });
      return;
    }
    const lastData = data[data.length - 1];

    // Taxa de aderência - porcentagem de ajustado vs padrão no total
    const adherenceRate = lastData.cumulative_standard > 0 ? lastData.cumulative_adjusted / lastData.cumulative_standard * 100 : 0;

    // Variação média em relação ao padrão
    const avgVariation = lastData.cumulative_standard > 0 ? (lastData.cumulative_actual - lastData.cumulative_standard) / lastData.cumulative_standard * 100 : 0;

    // Economia/Desperdício total
    const economyWaste = lastData.cumulative_standard > 0 ? (lastData.cumulative_actual - lastData.cumulative_standard) / lastData.cumulative_standard * 100 : 0;
    setStats({
      adherenceRate: Math.round(adherenceRate),
      avgVariation: Math.round(avgVariation * 100) / 100,
      economyWaste: Math.round(economyWaste * 100) / 100,
      totalDays: data.length
    });
  };
  const formatChartData = () => {
    if (!data || data.length === 0) return [];
    return data.map(item => ({
      date: format(new Date(item.date), 'dd/MM', {
        locale: ptBR
      }),
      doc: item.doc,
      'Padrão': Number(item.cumulative_standard.toFixed(1)),
      'Ajustado': Number(item.cumulative_adjusted.toFixed(1)),
      'Real': Number(item.cumulative_actual.toFixed(1))
    }));
  };
  const chartData = formatChartData();
  const CustomTooltip = ({
    active,
    payload,
    label
  }: any) => {
    if (active && payload && payload.length) {
      const currentData = data?.find(item => item.doc === label);
      const dateFormatted = currentData ? format(new Date(currentData.date), 'dd/MM/yyyy', {
        locale: ptBR
      }) : '';
      return <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium mb-2">DOC {label} - {dateFormatted}</p>
          {payload.map((entry: any, index: number) => <p key={index} style={{
          color: entry.color
        }} className="text-sm">
              {entry.name}: {entry.value}kg
            </p>)}
        </div>;
    }
    return null;
  };
  return <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendUp className="w-5 h-5 text-primary" />
            Gráfico de Ajustes de Alimentação - {pondName}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {batchName} • Análise dos últimos {stats.totalDays} dias
          </p>
        </DialogHeader>

        {loading ? <div className="flex items-center justify-center h-64">
            <p>Carregando dados...</p>
          </div> : <div className="space-y-6">
            {/* Cards de Estatísticas */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-slate-800" />
                    <CardTitle className="text-sm">Aderência aos Ajustes</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-slate-800">{stats.adherenceRate}%</p>
                  <p className="text-xs text-muted-foreground">Seguiu as sugestões</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-slate-800" />
                    <CardTitle className="text-sm">Variação Média</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-slate-800">{stats.avgVariation > 0 ? '+' : ''}{stats.avgVariation}%</p>
                  <p className="text-xs text-muted-foreground">Em relação ao padrão</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <Warning className={`w-4 h-4 ${Math.abs(stats.economyWaste) > 10 ? 'text-orange-600' : 'text-slate-800'}`} />
                    <CardTitle className="text-sm">Economia/Desperdício</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className={`text-2xl font-bold ${Math.abs(stats.economyWaste) > 10 ? (stats.economyWaste > 0 ? 'text-red-700' : 'text-green-700') : 'text-slate-800'}`}>
                    {stats.economyWaste > 0 ? '+' : ''}{stats.economyWaste}%
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {stats.economyWaste > 0 ? 'Desperdício' : 'Economia'}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <TrendUp className="w-4 h-4 text-slate-800" />
                    <CardTitle className="text-sm">Dias Totais</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-slate-800">{stats.totalDays}</p>
                  <p className="text-xs text-muted-foreground">dias com dados</p>
                </CardContent>
              </Card>
            </div>

            {/* Gráfico */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Ração Acumulada (kg) - Desde Povoamento</CardTitle>
                
                <p className="text-sm text-muted-foreground mt-2">
                  Biomassa: {currentBiomass}kg
                </p>
              </CardHeader>
              <CardContent>
                {chartData.length > 0 ? <div className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200" />
                        <XAxis dataKey="doc" className="text-xs" interval={0} tickFormatter={value => value % 5 === 0 || value === 1 ? `${value}` : ''} label={{
                    value: 'Dias de Cultivo (DOC)',
                    position: 'insideBottom',
                    offset: -15
                  }} />
                        <YAxis className="text-xs" label={{
                    value: 'Ração Acumulada (kg)',
                    angle: -90,
                    position: 'insideLeft'
                  }} />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend />
                        <Line type="monotone" dataKey="Padrão" stroke="#22c55e" strokeWidth={2} name="Padrão" dot={false} />
                        <Line type="monotone" dataKey="Ajustado" stroke="#3b82f6" strokeWidth={2} name="Ajustado" dot={false} strokeDasharray="5 5" />
                        <Line type="monotone" dataKey="Real" stroke="#f97316" strokeWidth={3} name="Real" dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div> : <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                      <p className="text-muted-foreground mb-2">Nenhum dado encontrado</p>
                      <p className="text-sm text-muted-foreground">Pond Batch ID: {pondBatchId}</p>
                      <p className="text-sm text-muted-foreground">Biomassa: {currentBiomass}kg</p>
                    </div>
                  </div>}
              </CardContent>
            </Card>

            {/* Explicação das Linhas */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-4 h-0.5 bg-green-500"></div>
                  <span className="font-medium text-green-800">Padrão Acumulado</span>
                </div>
                <p className="text-green-700">
                  Total de ração que deveria ter sido fornecida desde o povoamento, baseado na curva de crescimento projetada.
                </p>
              </div>
              
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-4 h-0.5 bg-blue-500 border-dashed border-t-2"></div>
                  <span className="font-medium text-blue-800">Ajustado Acumulado</span>
                </div>
                <p className="text-blue-700">
                  Total considerando ajustes baseados em avaliações de consumo. Mostra o acumulado das quantidades otimizadas.
                </p>
              </div>
              
              <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-4 h-1 bg-orange-500"></div>
                  <span className="font-medium text-orange-800">Real Acumulado</span>
                </div>
                <p className="text-orange-700">
                  Total de ração efetivamente fornecida desde o início do cultivo. Mostra o consumo real acumulado.
                </p>
              </div>
            </div>
          </div>}
      </DialogContent>
    </Dialog>;
}