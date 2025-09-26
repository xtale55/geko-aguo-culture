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
  feeding_time: string;
  standard: number; // Quantidade padrão baseada na taxa
  adjusted: number; // Quantidade ajustada sugerida
  actual: number; // Quantidade realmente fornecida
  consumption_evaluation?: string;
  adjustment_reason?: string;
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
      // Buscar registros dos últimos 30 dias
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const startDate = thirtyDaysAgo.toISOString().split('T')[0];

      // Buscar registros de alimentação
      const { data: feedingRecords, error: feedingError } = await supabase
        .from('feeding_records')
        .select(`
          feeding_date,
          feeding_time,
          planned_amount,
          actual_amount,
          consumption_evaluation,
          adjustment_reason,
          next_feeding_adjustment,
          feeding_rate_percentage
        `)
        .eq('pond_batch_id', pondBatchId)
        .gte('feeding_date', startDate)
        .order('feeding_date', { ascending: true })
        .order('feeding_time', { ascending: true });

      if (feedingError) throw feedingError;

      // Buscar dados de biometria históricos
      const { data: biometrics, error: biometricsError } = await supabase
        .from('biometrics')
        .select('measurement_date, average_weight')
        .eq('pond_batch_id', pondBatchId)
        .gte('measurement_date', startDate)
        .order('measurement_date', { ascending: true });

      if (biometricsError) throw biometricsError;

      // Buscar dados do pond_batch para população atual
      const { data: pondBatch, error: pondError } = await supabase
        .from('pond_batches')
        .select('current_population, pl_quantity, stocking_date')
        .eq('id', pondBatchId)
        .single();

      if (pondError) throw pondError;

      // Buscar configurações de feeding_rates históricas
      const { data: feedingRates, error: ratesError } = await supabase
        .from('feeding_rates')
        .select('weight_range_min, weight_range_max, feeding_percentage, meals_per_day, created_at')
        .or(`pond_batch_id.eq.${pondBatchId},farm_id.eq.(SELECT farm_id FROM ponds WHERE id = (SELECT pond_id FROM pond_batches WHERE id = '${pondBatchId}'))`)
        .order('created_at', { ascending: false });

      if (ratesError) throw ratesError;

      const processedData: FeedingAdjustmentData[] = [];

      // Função para obter biomassa histórica para uma data específica
      const getHistoricalBiomass = (date: string): number => {
        const targetDate = new Date(date);
        
        // Encontrar a biometria mais próxima (anterior ou igual)
        let closestBiometry = null;
        let closestDistance = Infinity;

        biometrics?.forEach(bio => {
          const bioDate = new Date(bio.measurement_date);
          const distance = targetDate.getTime() - bioDate.getTime();
          
          if (distance >= 0 && distance < closestDistance) {
            closestDistance = distance;
            closestBiometry = bio;
          }
        });

        if (closestBiometry) {
          // Usar peso médio da biometria e população atual para calcular biomassa
          return (pondBatch.current_population * closestBiometry.average_weight) / 1000; // kg
        }

        // Fallback: usar biomassa atual
        return currentBiomass;
      };

      // Função para obter taxa de alimentação histórica baseada no peso
      const getHistoricalFeedingRate = (date: string, averageWeight: number): { rate: number; meals: number } => {
        // Usar taxa específica registrada no feeding_records se disponível
        const currentRecord = feedingRecords?.find(fr => fr.feeding_date === date);
        if (currentRecord?.feeding_rate_percentage) {
          return { 
            rate: currentRecord.feeding_rate_percentage, 
            meals: mealsPerDay // Usar atual como fallback
          };
        }

        // Encontrar a configuração mais apropriada baseada no peso
        const applicableRate = feedingRates?.find(fr => 
          averageWeight >= (fr.weight_range_min || 0) && 
          averageWeight <= (fr.weight_range_max || 999)
        );

        if (applicableRate) {
          return {
            rate: applicableRate.feeding_percentage,
            meals: applicableRate.meals_per_day
          };
        }

        // Fallback: usar configuração padrão baseada no peso
        if (averageWeight < 1) return { rate: 10, meals: 5 };
        if (averageWeight < 3) return { rate: 8, meals: 4 };
        if (averageWeight < 5) return { rate: 6, meals: 4 };
        if (averageWeight < 10) return { rate: 4, meals: 3 };
        if (averageWeight < 15) return { rate: 2.5, meals: 2 };
        return { rate: 2, meals: 2 };
      };

      feedingRecords?.forEach((record) => {
        // Obter biomassa histórica para esta data
        const historicalBiomass = getHistoricalBiomass(record.feeding_date);
        
        // Obter peso médio histórico para determinar a taxa
        const closestBio = biometrics?.find(bio => 
          new Date(bio.measurement_date) <= new Date(record.feeding_date)
        ) || biometrics?.[biometrics.length - 1];
        
        const averageWeight = closestBio?.average_weight || 1;
        
        // Obter taxa de alimentação histórica
        const { rate: historicalRate, meals: historicalMeals } = getHistoricalFeedingRate(record.feeding_date, averageWeight);
        
        // Calcular quantidade padrão usando dados históricos reais
        const standardAmount = (historicalBiomass * historicalRate / 100) / historicalMeals * 1000; // em gramas
        
        // Calcular quantidade ajustada
        const adjustment = record.next_feeding_adjustment || 0;
        const adjustedAmount = standardAmount * (1 + adjustment / 100);
        
        const actualAmount = record.actual_amount || 0;

        processedData.push({
          date: record.feeding_date,
          feeding_time: record.feeding_time,
          standard: Math.round(standardAmount),
          adjusted: Math.round(adjustedAmount),
          actual: actualAmount,
          consumption_evaluation: record.consumption_evaluation,
          adjustment_reason: record.adjustment_reason
        });
      });

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
      setStats({ adherenceRate: 0, avgVariation: 0, economyWaste: 0, totalDays: 0 });
      return;
    }

    // Taxa de aderência (quantas vezes seguiu a sugestão ajustada)
    const adherentFeedings = data.filter(d => 
      Math.abs(d.actual - d.adjusted) <= (d.adjusted * 0.1) // 10% de tolerância
    ).length;
    const adherenceRate = (adherentFeedings / data.length) * 100;

    // Variação média em relação ao padrão
    const variations = data.map(d => ((d.actual - d.standard) / d.standard) * 100);
    const avgVariation = variations.reduce((acc, val) => acc + val, 0) / variations.length;

    // Economia/Desperdício total (diferença entre padrão e real)
    const totalStandard = data.reduce((acc, d) => acc + d.standard, 0);
    const totalActual = data.reduce((acc, d) => acc + d.actual, 0);
    const economyWaste = ((totalActual - totalStandard) / totalStandard) * 100;

    // Dias únicos
    const uniqueDates = new Set(data.map(d => d.date));
    const totalDays = uniqueDates.size;

    setStats({
      adherenceRate: Math.round(adherenceRate),
      avgVariation: Math.round(avgVariation * 100) / 100,
      economyWaste: Math.round(economyWaste * 100) / 100,
      totalDays
    });
  };

  const formatChartData = () => {
    const grouped = data.reduce((acc, item) => {
      const key = `${item.date} ${item.feeding_time}`;
      if (!acc[key]) {
        acc[key] = {
          dateTime: key,
          displayDate: format(new Date(`${item.date}T${item.feeding_time}`), 'dd/MM HH:mm', { locale: ptBR }),
          standard: 0,
          adjusted: 0,
          actual: 0,
          count: 0
        };
      }
      acc[key].standard += item.standard;
      acc[key].adjusted += item.adjusted;
      acc[key].actual += item.actual;
      acc[key].count += 1;
      return acc;
    }, {} as any);

    return Object.values(grouped).map((item: any) => ({
      ...item,
      standard: Math.round(item.standard / item.count),
      adjusted: Math.round(item.adjusted / item.count),
      actual: Math.round(item.actual / item.count)
    }));
  };

  const chartData = formatChartData();

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {entry.name}: {entry.value}g
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <p>Carregando dados...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Cards de Estatísticas */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <CardTitle className="text-sm">Aderência aos Ajustes</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-green-700">{stats.adherenceRate}%</p>
                  <p className="text-xs text-muted-foreground">Seguiu as sugestões</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-blue-600" />
                    <CardTitle className="text-sm">Variação Média</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-blue-700">{stats.avgVariation > 0 ? '+' : ''}{stats.avgVariation}%</p>
                  <p className="text-xs text-muted-foreground">Em relação ao padrão</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <Warning className="w-4 h-4 text-orange-600" />
                    <CardTitle className="text-sm">Economia/Desperdício</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className={`text-2xl font-bold ${stats.economyWaste > 0 ? 'text-red-700' : 'text-green-700'}`}>
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
                    <TrendUp className="w-4 h-4 text-purple-600" />
                    <CardTitle className="text-sm">Período Analisado</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-purple-700">{stats.totalDays}</p>
                  <p className="text-xs text-muted-foreground">dias com dados</p>
                </CardContent>
              </Card>
            </div>

            {/* Gráfico */}
            {chartData.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Evolução das Quantidades de Ração</CardTitle>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="text-green-600 border-green-200">
                      Padrão: {feedingRate}% da biomassa
                    </Badge>
                    <Badge variant="outline" className="text-blue-600 border-blue-200">
                      Ajustado: Sugestão do sistema
                    </Badge>
                    <Badge variant="outline" className="text-orange-600 border-orange-200">
                      Real: Quantidade fornecida
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200" />
                        <XAxis 
                          dataKey="displayDate" 
                          className="text-xs"
                          interval="preserveStartEnd"
                        />
                        <YAxis 
                          className="text-xs"
                          label={{ value: 'Quantidade (g)', angle: -90, position: 'insideLeft' }}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="standard"
                          stroke="hsl(var(--emerald-500))"
                          strokeWidth={2}
                          name="Padrão"
                          dot={{ r: 4 }}
                        />
                        <Line
                          type="monotone"
                          dataKey="adjusted"
                          stroke="hsl(var(--blue-500))"
                          strokeWidth={2}
                          name="Ajustado"
                          dot={{ r: 4 }}
                          strokeDasharray="5 5"
                        />
                        <Line
                          type="monotone"
                          dataKey="actual"
                          stroke="hsl(var(--orange-500))"
                          strokeWidth={3}
                          name="Real"
                          dot={{ r: 5 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="flex items-center justify-center h-32">
                  <p className="text-muted-foreground">Nenhum dado de alimentação encontrado para o período</p>
                </CardContent>
              </Card>
            )}

            {/* Explicação das Linhas */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-4 h-0.5 bg-green-500"></div>
                  <span className="font-medium text-green-800">Linha Padrão</span>
                </div>
                <p className="text-green-700">
                  Quantidade calculada pela taxa de arraçoamento ({feedingRate}% da biomassa)
                </p>
              </div>
              
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-4 h-0.5 bg-blue-500 border-dashed border-t-2"></div>
                  <span className="font-medium text-blue-800">Linha Ajustada</span>
                </div>
                <p className="text-blue-700">
                  Quantidade sugerida pelo sistema baseada no consumo anterior
                </p>
              </div>
              
              <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-4 h-1 bg-orange-500"></div>
                  <span className="font-medium text-orange-800">Linha Real</span>
                </div>
                <p className="text-orange-700">
                  Quantidade efetivamente fornecida aos animais
                </p>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}