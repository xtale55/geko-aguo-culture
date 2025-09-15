import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useStockAlerts } from '@/hooks/useStockAlerts';
import { QuantityUtils } from '@/lib/quantityUtils';
import { AlertTriangle, Package } from 'lucide-react';

interface StockAlertsProps {
  inventoryData: any[];
  onItemClick?: (itemId: string) => void;
}

export function StockAlerts({ inventoryData, onItemClick }: StockAlertsProps) {
  const alerts = useStockAlerts(inventoryData);

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'high':
        return <AlertTriangle className="w-4 h-4 text-red-600" />;
      case 'medium':
        return <AlertTriangle className="w-4 h-4 text-orange-600" />;
      default:
        return <Package className="w-4 h-4 text-yellow-600" />;
    }
  };

  const getSeverityBadge = (severity: string) => {
    const colors = {
      high: 'bg-red-100 text-red-800',
      medium: 'bg-orange-100 text-orange-800',
      low: 'bg-yellow-100 text-yellow-800'
    };
    const labels = {
      high: 'Crítico',
      medium: 'Atenção',
      low: 'Aviso'
    };
    
    return (
      <Badge className={colors[severity as keyof typeof colors]}>
        {labels[severity as keyof typeof labels]}
      </Badge>
    );
  };

  const getCategoryIcon = (category: string) => {
    // You can customize icons per category if needed
    return <Package className="w-4 h-4 text-muted-foreground" />;
  };

  if (alerts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-600">
            <Package className="w-5 h-5" />
            Estoque OK
          </CardTitle>
          <CardDescription>
            Todos os itens estão com estoque adequado
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-muted-foreground">
            <Package className="w-8 h-8 mx-auto mb-2 text-green-600" />
            <p>Nenhum alerta de estoque no momento</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Group alerts by category
  const alertsByCategory = alerts.reduce((groups, alert) => {
    if (!groups[alert.category]) {
      groups[alert.category] = [];
    }
    groups[alert.category].push(alert);
    return groups;
  }, {} as Record<string, typeof alerts>);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-orange-600" />
          Alertas de Estoque
        </CardTitle>
        <CardDescription>
          {alerts.length} {alerts.length === 1 ? 'item precisa' : 'itens precisam'} de atenção
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {Object.entries(alertsByCategory).map(([category, categoryAlerts]) => (
            <div key={category} className="space-y-2">
              <div className="flex items-center gap-2 pb-2 border-b">
                {getCategoryIcon(category)}
                <h4 className="font-medium">{category}</h4>
                <Badge variant="outline" className="ml-auto">
                  {categoryAlerts.length} {categoryAlerts.length === 1 ? 'alerta' : 'alertas'}
                </Badge>
              </div>
              
              <div className="space-y-1">
                {categoryAlerts.map((alert) => (
                  <div 
                    key={alert.id} 
                    className="border rounded-lg p-2 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {getSeverityIcon(alert.severity)}
                          <h5 className="font-medium text-sm truncate">{alert.itemName}</h5>
                          {getSeverityBadge(alert.severity)}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span>Estoque: {QuantityUtils.formatKg(QuantityUtils.kgToGrams(alert.currentStock))}kg</span>
                          <span>Limite: {QuantityUtils.formatKg(QuantityUtils.kgToGrams(alert.threshold))}kg</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}