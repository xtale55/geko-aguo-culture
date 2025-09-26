import { useTechnicianFarmMetrics } from '@/hooks/useTechnicianFarmMetrics';
import { StatsCard } from '@/components/StatsCard';
import { Fish, TrendUp, Warning, Scales } from '@phosphor-icons/react';

interface FarmMetricsCardsProps {
  farmId: string;
}

export function FarmMetricsCards({ farmId }: FarmMetricsCardsProps) {
  const { data: metrics, isLoading } = useTechnicianFarmMetrics(farmId);

  if (isLoading || !metrics) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatsCard
        title="Viveiros Ativos"
        value={metrics.activePonds.toString()}
        icon={<Fish className="h-4 w-4" />}
        subtitle={`${metrics.totalPonds} total`}
      />
      
      <StatsCard
        title="População Total"
        value={metrics.totalPopulation.toLocaleString()}
        icon={<Fish className="h-4 w-4" />}
        subtitle="organismos"
      />
      
      <StatsCard
        title="Biomassa Total"
        value={`${metrics.totalBiomass.toFixed(1)} kg`}
        icon={<Scales className="h-4 w-4" />}
        subtitle="estimada"
      />
      
      <StatsCard
        title="Taxa Sobrevivência Média"
        value={`${metrics.averageSurvivalRate.toFixed(1)}%`}
        icon={<TrendUp className="h-4 w-4" />}
        subtitle="cultivos ativos"
      />
    </div>
  );
}