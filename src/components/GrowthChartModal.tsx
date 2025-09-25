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
  
  // Format data for chart with DOC calculation
  const chartData = growthData.map((item, index) => {
    const measurementDate = new Date(item.measurement_date);
    const firstDate = new Date(growthData[0]?.measurement_date);
    const docAtMeasurement = Math.ceil((measurementDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24));
    
    return {
      ...item,
      docAtMeasurement,
      formattedDate: format(measurementDate, 'dd/MM', { locale: ptBR }),
      fullDate: format(measurementDate, 'dd/MM/yyyy', { locale: ptBR })
    };
  });

  // Calculate growth rate
  const calculateGrowthRate = () => {
    if (growthData.length < 2) return 0;
    const firstWeight = growthData[growthData.length - 1].average_weight;
    const lastWeight = growthData[0].average_weight;
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
                                <p className="text-primary">
                                  Peso: {data.average_weight}g
                                </p>
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
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
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
                      {chartData.reverse().map((item, index) => (
                        <tr key={index} className="border-b">
                          <td className="p-2">{item.fullDate}</td>
                          <td className="text-right p-2 font-medium">{item.average_weight}g</td>
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