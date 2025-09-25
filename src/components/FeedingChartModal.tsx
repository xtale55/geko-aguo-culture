import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { TrendUp, ForkKnife } from '@phosphor-icons/react';

interface FeedingData {
  feeding_date: string;
  cumulative_feed: number;
}

interface FeedingChartModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pondName: string;
  batchName: string;
  doc: number;
  feedingData: FeedingData[];
}

export function FeedingChartModal({ 
  open, 
  onOpenChange, 
  pondName, 
  batchName, 
  doc, 
  feedingData 
}: FeedingChartModalProps) {
  
  // Sort data chronologically and format for chart with DOC calculation
  const sortedFeedingData = [...feedingData].sort((a, b) => 
    new Date(a.feeding_date).getTime() - new Date(b.feeding_date).getTime()
  );
  
  // Calculate cumulative feed correctly
  let cumulativeTotal = 0;
  const chartData = sortedFeedingData.map((item, index) => {
    const feedingDate = new Date(item.feeding_date);
    const firstDate = new Date(sortedFeedingData[0]?.feeding_date);
    const docAtFeeding = Math.ceil((feedingDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24));
    
    cumulativeTotal = item.cumulative_feed; // Use the pre-calculated cumulative value
    
    return {
      ...item,
      docAtFeeding,
      formattedDate: format(feedingDate, 'dd/MM', { locale: ptBR }),
      fullDate: format(feedingDate, 'dd/MM/yyyy', { locale: ptBR })
    };
  });

  // Calculate feeding efficiency
  const calculateFeedingEfficiency = () => {
    if (sortedFeedingData.length < 2) return 0;
    const totalFeed = sortedFeedingData[sortedFeedingData.length - 1].cumulative_feed;
    const totalDays = chartData.length;
    return totalDays > 0 ? (totalFeed / totalDays) : 0;
  };

  const averageDailyFeed = calculateFeedingEfficiency();
  const totalFeed = sortedFeedingData.length > 0 ? sortedFeedingData[sortedFeedingData.length - 1].cumulative_feed : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendUp className="w-5 h-5 text-primary" />
            Gráfico de Alimentação Acumulada - {pondName}
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
                <CardTitle className="text-sm text-muted-foreground">Total Acumulado</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg font-semibold text-green-600">
                  {totalFeed.toFixed(1)} kg
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ForkKnife className="w-4 h-4" />
                Evolução da Alimentação Acumulada
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
                        label={{ value: 'Ração (kg)', angle: -90, position: 'insideLeft' }}
                      />
                      <Tooltip
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
                                <p className="font-medium">{data.fullDate}</p>
                                <p className="text-primary">
                                  Acumulado: {data.cumulative_feed}kg
                                </p>
                                <p className="text-muted-foreground text-sm">
                                  DOC: {data.docAtFeeding} dias
                                </p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="cumulative_feed"
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
                    <ForkKnife className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      Nenhum dado de alimentação disponível para este viveiro
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
                        <th className="text-right p-2">Acumulado (kg)</th>
                        <th className="text-right p-2">DOC</th>
                      </tr>
                    </thead>
                    <tbody>
                      {chartData.map((item, index) => (
                        <tr key={index} className="border-b">
                          <td className="p-2">{item.fullDate}</td>
                          <td className="text-right p-2 font-medium">{item.cumulative_feed}kg</td>
                          <td className="text-right p-2 text-muted-foreground">{item.docAtFeeding}</td>
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