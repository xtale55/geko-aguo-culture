import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useConsumptionForecast } from '@/hooks/useConsumptionForecast';
import { QuantityUtils } from '@/lib/quantityUtils';
import { TrendingDown, Calendar, AlertTriangle, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ConsumptionForecastProps {
  inventoryData: any[];
  feedingRecords: any[];
  inputApplications: any[];
  farmId?: string;
}

export function ConsumptionForecast({ 
  inventoryData, 
  feedingRecords, 
  inputApplications,
  farmId 
}: ConsumptionForecastProps) {
  const forecasts = useConsumptionForecast(inventoryData, feedingRecords, inputApplications);

  // Filter forecasts by farm if specified
  const filteredForecasts = farmId 
    ? forecasts.filter(forecast => 
        inventoryData.find(item => item.id === forecast.itemId)?.farm_id === farmId
      )
    : forecasts;

  const getUrgencyColor = (daysRemaining: number) => {
    if (daysRemaining <= 3) return 'text-red-600 bg-red-50';
    if (daysRemaining <= 7) return 'text-orange-600 bg-orange-50';
    if (daysRemaining <= 14) return 'text-yellow-600 bg-yellow-50';
    return 'text-green-600 bg-green-50';
  };

  const getUrgencyIcon = (daysRemaining: number) => {
    if (daysRemaining <= 3) return <AlertTriangle className="w-4 h-4 text-red-600" />;
    if (daysRemaining <= 7) return <Clock className="w-4 h-4 text-orange-600" />;
    return <Calendar className="w-4 h-4 text-green-600" />;
  };

  const getAccuracyBadge = (accuracy: string) => {
    const colors = {
      high: 'bg-green-100 text-green-800',
      medium: 'bg-yellow-100 text-yellow-800',
      low: 'bg-red-100 text-red-800'
    };
    const labels = {
      high: 'Alta',
      medium: 'Média',
      low: 'Baixa'
    };
    
    return (
      <Badge className={colors[accuracy as keyof typeof colors]}>
        {labels[accuracy as keyof typeof labels]}
      </Badge>
    );
  };

  const getProgressValue = (daysRemaining: number) => {
    // Convert days to a progress value (0-100)
    // 30 days = 100%, 0 days = 0%
    const maxDays = 30;
    return Math.min(100, Math.max(0, (daysRemaining / maxDays) * 100));
  };

  if (filteredForecasts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingDown className="w-5 h-5" />
            Previsão de Consumo
          </CardTitle>
          <CardDescription>
            Estimativa de duração do estoque baseada no histórico de uso
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-muted-foreground">
            Dados insuficientes para gerar previsões. Use os produtos por alguns dias para obter estimativas.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingDown className="w-5 h-5" />
          Previsão de Consumo
        </CardTitle>
        <CardDescription>
          Estimativa de duração do estoque baseada no histórico de uso dos últimos 30 dias
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {filteredForecasts.map((forecast) => (
            <div key={forecast.itemId} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium">{forecast.itemName}</h4>
                    <Badge variant="outline">{forecast.category}</Badge>
                    {getAccuracyBadge(forecast.forecastAccuracy)}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Estoque atual: {QuantityUtils.formatKg(QuantityUtils.kgToGrams(forecast.currentStock))}kg
                  </p>
                </div>
                <div className={`flex items-center gap-2 px-3 py-1 rounded-lg ${getUrgencyColor(forecast.estimatedDaysRemaining)}`}>
                  {getUrgencyIcon(forecast.estimatedDaysRemaining)}
                  <span className="font-semibold">
                    {forecast.estimatedDaysRemaining > 999 ? '999+' : forecast.estimatedDaysRemaining} dias
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Duração estimada</span>
                  <span>{forecast.estimatedDaysRemaining > 999 ? 'Sem previsão de fim' : `${forecast.estimatedDaysRemaining} dias`}</span>
                </div>
                <Progress 
                  value={getProgressValue(forecast.estimatedDaysRemaining)} 
                  className="h-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Consumo médio diário:</span>
                  <p className="font-medium">
                    {forecast.averageDailyConsumption > 0 
                      ? `${QuantityUtils.formatKg(QuantityUtils.kgToGrams(forecast.averageDailyConsumption))}kg/dia`
                      : 'Sem uso recente'
                    }
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Último uso:</span>
                  <p className="font-medium">
                    {forecast.lastUsageDate 
                      ? format(new Date(forecast.lastUsageDate), 'dd/MM/yyyy', { locale: ptBR })
                      : 'Nunca usado'
                    }
                  </p>
                </div>
              </div>

              {forecast.estimatedDaysRemaining <= 7 && forecast.estimatedDaysRemaining > 0 && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-orange-600 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-orange-800">Atenção necessária</p>
                    <p className="text-orange-700">
                      Este item pode acabar em breve. Considere fazer um pedido de reposição.
                    </p>
                  </div>
                </div>
              )}

              {forecast.estimatedDaysRemaining === 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-red-800">Estoque crítico</p>
                    <p className="text-red-700">
                      Este item pode acabar hoje com base no consumo atual.
                    </p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}