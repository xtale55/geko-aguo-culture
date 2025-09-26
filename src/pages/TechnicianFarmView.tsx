import { useParams } from 'react-router-dom';
import { useTechnicianFarmData } from '@/hooks/useTechnicianFarmData';
import { useTechnicianActivePonds } from '@/hooks/useTechnicianActivePonds';
import { TechnicianLayout } from '@/components/TechnicianLayout';
import { LoadingScreen } from '@/components/LoadingScreen';
import { TechnicianFarmHeader } from '@/components/TechnicianFarmHeader';
import { FarmMetricsCards } from '@/components/FarmMetricsCards';
import { ActivePondCard } from '@/components/ActivePondCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Fish } from '@phosphor-icons/react';

export default function TechnicianFarmView() {
  const { farmId } = useParams<{ farmId: string }>();
  
  const { data: farmData, isLoading: farmLoading } = useTechnicianFarmData(farmId!);
  const { data: activePonds, isLoading: pondsLoading } = useTechnicianActivePonds(farmId!);

  if (farmLoading || pondsLoading) {
    return <LoadingScreen />;
  }

  if (!farmData) {
    return (
      <TechnicianLayout>
        <div className="flex items-center justify-center h-96">
          <p className="text-muted-foreground">Fazenda não encontrada</p>
        </div>
      </TechnicianLayout>
    );
  }

  return (
    <TechnicianLayout>
      <div className="space-y-6">
        <TechnicianFarmHeader farm={farmData} />
        
        <FarmMetricsCards farmId={farmId!} />
        
        <div>
          <h2 className="text-2xl font-bold mb-4">Viveiros Ativos</h2>
          
          {activePonds && activePonds.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {activePonds.map((pond) => (
                <ActivePondCard key={pond.id} pond={pond} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Fish className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhum viveiro ativo</h3>
                <p className="text-muted-foreground text-center">
                  Esta fazenda não possui viveiros com cultivos ativos no momento.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </TechnicianLayout>
  );
}