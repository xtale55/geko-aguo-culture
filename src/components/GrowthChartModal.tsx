import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { TrendUp, Scales } from '@phosphor-icons/react';

interface GrowthData {
  measurement_date: string;
  average_weight: number;
}

interface GrowthChartModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pondName: string;
  batchName: string;
  doc: number;
  growthData: GrowthData[];
}

export function GrowthChartModal({ 
  open, 
  onOpenChange, 
  pondName, 
  batchName, 
  doc, 
  growthData 
}: GrowthChartModalProps) {
  
  // Sort data chronologically and format for chart with DOC calculation
  const sortedGrowthData = [...growthData].sort((a, b) => 
    new Date(a.measurement_date).getTime() - new Date(b.measurement_date).getTime()
  );
  
  // Calculate exponential trend line (only if 3+ data points)
  const calculateExponentialTrend = () => {
    if (sortedGrowthData.length < 3) return [];
    
    const n = sortedGrowthData.length;
    const xValues = sortedGrowthData.map((_, index) => index);
    const yValues = sortedGrowthData.map(item => Math.log(item.average_weight));
    
    // Linear regression on log-transformed data: ln(y) = ln(a) + b*x
    const sumX = xValues.reduce((sum, x) => sum + x, 0);
    const sumY = yValues.reduce((sum, y) => sum + y, 0);
    const sumXY = xValues.reduce((sum, x, i) => sum + x * yValues[i], 0);
    const sumXX = xValues.reduce((sum, x) => sum + x * x, 0);
    
    const b = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const lnA = (sumY - b * sumX) / n;
    const a = Math.exp(lnA);
    
    // Generate trend points
    const trendPoints = [];
    const extendedLength = Math.min(n + 2, n * 1.2); // Extend slightly beyond data
    
    for (let i = 0; i < extendedLength; i++) {
      const trendWeight = a * Math.exp(b * i);
      trendPoints.push(trendWeight);
    }
    
    return trendPoints;
  };
  
  const trendValues = calculateExponentialTrend();
  const showTrendLine = sortedGrowthData.length >= 3;
  
  const chartData = sortedGrowthData.map((item, index) => {
    const measurementDate = new Date(item.measurement_date);
    const firstDate = new Date(sortedGrowthData[0]?.measurement_date);
    const docAtMeasurement = Math.ceil((measurementDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24));
    
    return {
      ...item,
      docAtMeasurement,
      formattedDate: format(measurementDate, 'dd/MM', { locale: ptBR }),
      fullDate: format(measurementDate, 'dd/MM/yyyy', { locale: ptBR }),
      trend_weight: showTrendLine && index < trendValues.length ? trendValues[index] : null
    };
  });
  
  // Add projected trend points if available
  if (showTrendLine && trendValues.length > sortedGrowthData.length) {
    for (let i = sortedGrowthData.length; i < trendValues.length; i++) {
      const baseDate = new Date(sortedGrowthData[0]?.measurement_date);
      const projectedDate = new Date(baseDate);
      projectedDate.setDate(baseDate.getDate() + (i * 7)); // Assume weekly measurements
      
      chartData.push({
        measurement_date: projectedDate.toISOString(),
        average_weight: null,
        docAtMeasurement: Math.ceil((projectedDate.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24)),
        formattedDate: format(projectedDate, 'dd/MM', { locale: ptBR }),
        fullDate: format(projectedDate, 'dd/MM/yyyy', { locale: ptBR }),
        trend_weight: trendValues[i]
      });
    }
  }

  // Calculate growth rate
  const calculateGrowthRate = () => {
    if (sortedGrowthData.length < 2) return 0;
    const firstWeight = sortedGrowthData[0].average_weight;
    const lastWeight = sortedGrowthData[sortedGrowthData.length - 1].average_weight;
    const weightGain = lastWeight - firstWeight;
    return ((weightGain / firstWeight) * 100);
  };

  const growthRate = calculateGrowthRate();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendUp className="w-5 h-5 text-primary" />
            Gráfico de Crescimento - {pondName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Lote Atual</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg font-semibold">{batchName}</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">DOC Atual</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg font-semibold text-primary">{doc} dias</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Taxa de Crescimento</CardTitle>
              </CardHeader>
              <CardContent>
                <p className={`text-lg font-semibold ${growthRate > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {growthRate > 0 ? '+' : ''}{growthRate.toFixed(1)}%
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scales className="w-4 h-4" />
                Evolução do Peso Médio
              </CardTitle>
            </CardHeader>
            <CardContent>
              {chartData.length > 0 ? (
                <>
                  <div className="h-96">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={chartData}
                        margin={{
                          top: 20,
                          right: 30,
                          left: 20,
                          bottom: 20,
                        }}
                      >
                        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                        <XAxis 
                          dataKey="formattedDate"
                          tick={{ fontSize: 12 }}
                          angle={-45}
                          textAnchor="end"
                          height={60}
                        />
                        <YAxis 
                          tick={{ fontSize: 12 }}
                          label={{ value: 'Peso (g)', angle: -90, position: 'insideLeft' }}
                        />
                        <Tooltip
                          content={({ active, payload, label }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              return (
                                <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
                                  <p className="font-medium">{data.fullDate}</p>
                                  {data.average_weight && (
                                    <p className="text-primary">
                                      Peso Real: {data.average_weight}g
                                    </p>
                                  )}
                                  {data.trend_weight && (
                                    <p className="text-warning">
                                      Tendência: {Math.round(data.trend_weight)}g
                                    </p>
                                  )}
                                  <p className="text-muted-foreground text-sm">
                                    DOC: {data.docAtMeasurement} dias
                                  </p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="average_weight"
                          stroke="hsl(var(--primary))"
                          strokeWidth={3}
                          dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 6 }}
                          activeDot={{ r: 8, stroke: 'hsl(var(--primary))', strokeWidth: 2 }}
                          connectNulls={false}
                        />
                        {showTrendLine && (
                          <Line
                            type="monotone"
                            dataKey="trend_weight"
                            stroke="hsl(var(--warning))"
                            strokeWidth={2}
                            strokeDasharray="5 5"
                            dot={false}
                            activeDot={{ r: 6, stroke: 'hsl(var(--warning))', strokeWidth: 2 }}
                            connectNulls={true}
                          />
                        )}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  
                  {/* Legend */}
                  <div className="flex items-center justify-center gap-6 mt-4 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-0.5 bg-primary rounded"></div>
                      <span className="text-muted-foreground">Dados Reais</span>
                    </div>
                    {showTrendLine && (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-0.5 bg-warning rounded" style={{ 
                          backgroundImage: 'repeating-linear-gradient(to right, hsl(var(--warning)) 0, hsl(var(--warning)) 3px, transparent 3px, transparent 6px)' 
                        }}></div>
                        <span className="text-muted-foreground">Tendência Exponencial</span>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="h-96 flex items-center justify-center">
                  <div className="text-center">
                    <Scales className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      Nenhum dado de biometria disponível para este viveiro
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Data Table */}
          {chartData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Dados Históricos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Data</th>
                        <th className="text-right p-2">Peso (g)</th>
                        <th className="text-right p-2">DOC</th>
                      </tr>
                    </thead>
                    <tbody>
                      {chartData.map((item, index) => (
                        <tr key={index} className="border-b">
                          <td className="p-2">{item.fullDate}</td>
                          <td className="text-right p-2 font-medium">
                            {item.average_weight ? `${item.average_weight}g` : '-'}
                          </td>
                          <td className="text-right p-2 text-muted-foreground">{item.docAtMeasurement}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}