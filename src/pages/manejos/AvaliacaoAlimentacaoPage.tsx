import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, ClipboardCheck, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useFarmsQuery } from '@/hooks/useSupabaseQuery';
import { useActivePondBatches } from '@/hooks/useActivePondBatches';
import { PondEvaluationCard } from '@/components/PondEvaluationCard';
import { useUnevaluatedFeedings, useLastEvaluationTime, useTodayFeedingRecords } from '@/hooks/useTodayFeedingRecords';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export default function AvaliacaoAlimentacaoPage() {
  const navigate = useNavigate();
  const { data: farms } = useFarmsQuery();
  const farm = farms?.[0];
  const { data: activePonds, isLoading } = useActivePondBatches(farm?.id);

  // Get biometry data and stocking dates for all active ponds
  const { data: biometryData } = useQuery({
    queryKey: ['biometry-for-evaluation', farm?.id],
    queryFn: async () => {
      if (!farm?.id) return {};

      const pondBatchIds = activePonds?.map(p => p.pond_batch_id) || [];
      if (pondBatchIds.length === 0) return {};

      const { data, error } = await supabase
        .from('biometrics')
        .select('pond_batch_id, average_weight, measurement_date')
        .in('pond_batch_id', pondBatchIds)
        .order('measurement_date', { ascending: false });

      if (error) throw error;

      // Get latest biometry for each pond
      const biometryMap: Record<string, { average_weight: number }> = {};
      data?.forEach((bio) => {
        if (!biometryMap[bio.pond_batch_id]) {
          biometryMap[bio.pond_batch_id] = { average_weight: bio.average_weight };
        }
      });

      return biometryMap;
    },
    enabled: !!farm?.id && !!activePonds && activePonds.length > 0,
  });

  return (
    <Layout>
      <div className="container mx-auto p-4 sm:p-6 max-w-7xl">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/manejos')}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para Manejos
          </Button>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-amber-600/10 rounded-lg">
              <ClipboardCheck className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Avaliação de Alimentação</h1>
              <p className="text-muted-foreground">
                Avalie o consumo de ração e receba sugestões para ajustes
              </p>
            </div>
          </div>
        </div>

        {/* Info Card */}
        <Card className="mb-6 border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
          <CardHeader>
            <div className="flex items-start gap-2">
              <Info className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
              <div>
                <CardTitle className="text-lg">Como funciona</CardTitle>
                <CardDescription className="mt-2 space-y-1">
                  <p>• <strong>Modo 1:</strong> Avalie alimentações já registradas no sistema hoje</p>
                  <p>• <strong>Modo 2:</strong> Registre manualmente quantidade + avaliação (para registro semanal)</p>
                  <p>• O sistema sugerirá ajustes automáticos baseados nas suas avaliações</p>
                </CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Loading State */}
        {isLoading && (
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Pond Cards Grid */}
        {!isLoading && activePonds && activePonds.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activePonds.map((pond) => {
              const latestWeight = biometryData?.[pond.pond_batch_id]?.average_weight;
              const currentBiomass = latestWeight 
                ? (pond.current_population * latestWeight) / 1000 
                : undefined;

              return (
                <PondEvaluationCardWithData
                  key={pond.pond_batch_id}
                  pondBatchId={pond.pond_batch_id}
                  pondName={pond.pond_name}
                  batchName={pond.batch_name}
                  stockingDate={pond.stocking_date}
                  currentPopulation={pond.current_population}
                  latestWeight={latestWeight}
                  currentBiomass={currentBiomass}
                />
              );
            })}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && (!activePonds || activePonds.length === 0) && (
          <Card>
            <CardContent className="p-6 text-center">
              <ClipboardCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum viveiro ativo</h3>
              <p className="text-muted-foreground">
                Não há viveiros ativos no momento para avaliar alimentação.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}

// Wrapper component to fetch data for each card
function PondEvaluationCardWithData({
  pondBatchId,
  pondName,
  batchName,
  stockingDate,
  currentPopulation,
  latestWeight,
  currentBiomass,
}: {
  pondBatchId: string;
  pondName: string;
  batchName: string;
  stockingDate: string;
  currentPopulation: number;
  latestWeight?: number;
  currentBiomass?: number;
}) {
  const { data: unevaluatedFeedings } = useUnevaluatedFeedings(pondBatchId);
  const { data: lastEvaluationTime } = useLastEvaluationTime(pondBatchId);
  const { data: todayFeedings } = useTodayFeedingRecords(pondBatchId);

  return (
    <PondEvaluationCard
      pondBatchId={pondBatchId}
      pondName={pondName}
      batchName={batchName}
      stockingDate={stockingDate}
      currentPopulation={currentPopulation}
      latestWeight={latestWeight}
      currentBiomass={currentBiomass}
      unevaluatedFeedings={unevaluatedFeedings || []}
      todayFeedings={todayFeedings?.length || 0}
      lastEvaluationTime={lastEvaluationTime || undefined}
    />
  );
}
