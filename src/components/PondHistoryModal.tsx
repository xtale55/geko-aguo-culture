import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { usePondHistory } from '@/hooks/usePondHistory';
import { LoadingScreen } from '@/components/LoadingScreen';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Fish, Scales, TrendUp } from '@phosphor-icons/react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface PondHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  pondBatchId: string;
  pondName: string;
}

export function PondHistoryModal({ isOpen, onClose, pondBatchId, pondName }: PondHistoryModalProps) {
  const { data: history, isLoading } = usePondHistory(pondBatchId);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Histórico Completo - {pondName}</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="h-96">
            <LoadingScreen />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Cultivo Atual */}
            {history?.currentCycle && (
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  Cultivo Atual 
                  <Badge variant="default">Ativo</Badge>
                </h3>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>{history.currentCycle.batch_name}</span>
                      <span className="text-sm text-muted-foreground">
                        {history.currentCycle.doc} dias
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">População</p>
                        <p className="font-medium">{history.currentCycle.current_population.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Peso Médio</p>
                        <p className="font-medium">{history.currentCycle.latest_weight.toFixed(1)}g</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Biomassa</p>
                        <p className="font-medium">{history.currentCycle.current_biomass.toFixed(1)} kg</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Sobrevivência</p>
                        <p className="font-medium">{history.currentCycle.survival_rate.toFixed(1)}%</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Histórico de Biometrias */}
            {history?.biometrics && history.biometrics.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3">Histórico de Biometrias</h3>
                <div className="space-y-2">
                  {history.biometrics.slice(0, 5).map((biometry) => (
                    <Card key={biometry.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Calendar className="h-4 w-4" />
                              <span>{format(new Date(biometry.measurement_date), 'dd/MM/yyyy', { locale: ptBR })}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Scales className="h-4 w-4" />
                              <span className="font-medium">{biometry.average_weight.toFixed(1)}g</span>
                            </div>
                          </div>
                          {biometry.sample_size && (
                            <Badge variant="outline">{biometry.sample_size} amostras</Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Cultivos Finalizados */}
            {history?.completedCycles && history.completedCycles.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3">Cultivos Anteriores</h3>
                <div className="space-y-3">
                  {history.completedCycles.map((cycle) => (
                    <Card key={cycle.id}>
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          <span>{cycle.batch_name}</span>
                          <Badge variant="secondary">Finalizado</Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">População Final</p>
                            <p className="font-medium">{cycle.final_population?.toLocaleString() || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Biomassa Final</p>
                            <p className="font-medium">{cycle.final_biomass?.toFixed(1) || 'N/A'} kg</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Peso Final</p>
                            <p className="font-medium">{cycle.final_average_weight?.toFixed(1) || 'N/A'}g</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Sobrevivência</p>
                            <p className="font-medium">{cycle.final_survival_rate?.toFixed(1) || 'N/A'}%</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}