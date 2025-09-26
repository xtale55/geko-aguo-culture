import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Fish, Calendar, Scales, TrendUp, Eye } from '@phosphor-icons/react';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useState } from 'react';
import { PondHistoryModal } from '@/components/PondHistoryModal';

interface ActivePond {
  id: string;
  pond_name: string;
  batch_name: string;
  current_population: number;
  latest_weight: number;
  current_biomass: number;
  doc: number;
  stocking_date: string;
  survival_rate: number;
}

interface ActivePondCardProps {
  pond: ActivePond;
}

export function ActivePondCard({ pond }: ActivePondCardProps) {
  const [showHistory, setShowHistory] = useState(false);
  
  const getPerformanceColor = (survivalRate: number) => {
    if (survivalRate >= 85) return 'bg-green-500';
    if (survivalRate >= 70) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getPerformanceLabel = (survivalRate: number) => {
    if (survivalRate >= 85) return 'Excelente';
    if (survivalRate >= 70) return 'Bom';
    return 'Atenção';
  };

  return (
    <>
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-lg">{pond.pond_name}</CardTitle>
              <p className="text-sm text-muted-foreground">{pond.batch_name}</p>
            </div>
            <div className="flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${getPerformanceColor(pond.survival_rate)}`} />
              <Badge variant="outline" className="text-xs">
                {getPerformanceLabel(pond.survival_rate)}
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-muted-foreground">
                <Calendar className="h-3 w-3" />
                <span>DOC</span>
              </div>
              <p className="font-medium">{pond.doc} dias</p>
            </div>
            
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-muted-foreground">
                <Fish className="h-3 w-3" />
                <span>População</span>
              </div>
              <p className="font-medium">{pond.current_population.toLocaleString()}</p>
            </div>
            
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-muted-foreground">
                <Scales className="h-3 w-3" />
                <span>Peso Médio</span>
              </div>
              <p className="font-medium">{pond.latest_weight.toFixed(1)}g</p>
            </div>
            
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-muted-foreground">
                <TrendUp className="h-3 w-3" />
                <span>Biomassa</span>
              </div>
              <p className="font-medium">{pond.current_biomass.toFixed(1)} kg</p>
            </div>
          </div>

          <div className="pt-2 border-t">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
              <span>Taxa de Sobrevivência</span>
              <span>{pond.survival_rate.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div 
                className={`h-2 rounded-full ${getPerformanceColor(pond.survival_rate)}`}
                style={{ width: `${Math.min(pond.survival_rate, 100)}%` }}
              />
            </div>
          </div>

          <Button 
            variant="outline" 
            size="sm" 
            className="w-full"
            onClick={() => setShowHistory(true)}
          >
            <Eye className="h-4 w-4 mr-2" />
            Ver Histórico
          </Button>
        </CardContent>
      </Card>

      <PondHistoryModal
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        pondBatchId={pond.id}
        pondName={pond.pond_name}
      />
    </>
  );
}