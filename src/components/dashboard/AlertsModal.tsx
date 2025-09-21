import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Warning, Drop, Fish, ClipboardText, Package } from "phosphor-react";

interface Alert {
  id: string;
  type: 'water' | 'mortality' | 'task' | 'stock';
  title: string;
  description: string;
  severity: 'high' | 'medium' | 'low';
}

interface AlertsModalProps {
  isOpen: boolean;
  onClose: () => void;
  alerts: Alert[];
}

export function AlertsModal({ isOpen, onClose, alerts }: AlertsModalProps) {
  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'water':
        return <Drop className="h-4 w-4" />;
      case 'mortality':
        return <Fish className="h-4 w-4" />;
      case 'task':
        return <ClipboardText className="h-4 w-4" />;
      case 'stock':
        return <Package className="h-4 w-4" />;
      default:
        return <Warning className="h-4 w-4" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'text-red-600 bg-red-50 border-red-200 dark:text-red-400 dark:bg-red-900/20 dark:border-red-800';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200 dark:text-yellow-400 dark:bg-yellow-900/20 dark:border-yellow-800';
      case 'low':
        return 'text-blue-600 bg-blue-50 border-blue-200 dark:text-blue-400 dark:bg-blue-900/20 dark:border-blue-800';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200 dark:text-gray-400 dark:bg-gray-900/20 dark:border-gray-800';
    }
  };

  const groupedAlerts = alerts.reduce((acc, alert) => {
    if (!acc[alert.type]) {
      acc[alert.type] = [];
    }
    acc[alert.type].push(alert);
    return acc;
  }, {} as Record<string, Alert[]>);

  const getTypeTitle = (type: string) => {
    switch (type) {
      case 'water':
        return 'Qualidade da Água';
      case 'mortality':
        return 'Mortalidade';
      case 'task':
        return 'Tarefas Pendentes';
      case 'stock':
        return 'Estoque';
      default:
        return 'Outros';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Warning className="h-5 w-5 text-red-600 dark:text-red-400" />
            Alertas Críticos ({alerts.length})
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {alerts.length === 0 ? (
            <div className="text-center py-8">
              <Warning className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">Nenhum alerta crítico no momento</p>
            </div>
          ) : (
            Object.entries(groupedAlerts).map(([type, typeAlerts]) => (
              <div key={type} className="space-y-3">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  {getAlertIcon(type)}
                  {getTypeTitle(type)} ({typeAlerts.length})
                </h3>
                
                <div className="space-y-2">
                  {typeAlerts.map((alert) => (
                    <div
                      key={alert.id}
                      className={`p-4 rounded-lg border ${getSeverityColor(alert.severity)}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium">{alert.title}</h4>
                          <p className="text-sm mt-1 opacity-90">{alert.description}</p>
                        </div>
                        <Badge 
                          variant="outline" 
                          className={`ml-3 ${getSeverityColor(alert.severity)} border-current`}
                        >
                          {alert.severity === 'high' ? 'Alto' : 
                           alert.severity === 'medium' ? 'Médio' : 'Baixo'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
