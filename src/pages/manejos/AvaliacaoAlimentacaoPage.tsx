import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, ClipboardCheck, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useFarmsQuery } from '@/hooks/useSupabaseQuery';
import { useActivePondBatches } from '@/hooks/useActivePondBatches';
import { FeedingEvaluationModal } from '@/components/FeedingEvaluationModal';
import { toast } from 'sonner';

export default function AvaliacaoAlimentacaoPage() {
  const navigate = useNavigate();
  const { data: farms } = useFarmsQuery();
  const farm = farms?.[0];
  const { data: activePonds, isLoading } = useActivePondBatches(farm?.id);
  
  const [selectedPondBatchId, setSelectedPondBatchId] = useState<string>("");
  const [feedingDate, setFeedingDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [feedingTime, setFeedingTime] = useState<string>("");
  const [amountOffered, setAmountOffered] = useState<string>("");
  const [isEvaluationModalOpen, setIsEvaluationModalOpen] = useState(false);

  const handleStartEvaluation = () => {
    if (!selectedPondBatchId) {
      toast.error("Selecione um viveiro");
      return;
    }
    if (!feedingTime) {
      toast.error("Informe o horário da alimentação");
      return;
    }
    if (!amountOffered || parseFloat(amountOffered) <= 0) {
      toast.error("Informe a quantidade oferecida");
      return;
    }

    setIsEvaluationModalOpen(true);
  };

  const handleEvaluationComplete = () => {
    setIsEvaluationModalOpen(false);
    setSelectedPondBatchId("");
    setFeedingTime("");
    setAmountOffered("");
    toast.success("Avaliação registrada com sucesso!");
  };

  const selectedPond = activePonds?.find(p => p.pond_batch_id === selectedPondBatchId);

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

        {/* Evaluation Form */}
        {!isLoading && (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Selecione o Viveiro e Horário</CardTitle>
                <CardDescription>
                  Escolha o viveiro e informe os dados da alimentação para avaliar o consumo
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="pond">Viveiro</Label>
                  <Select value={selectedPondBatchId} onValueChange={setSelectedPondBatchId}>
                    <SelectTrigger id="pond">
                      <SelectValue placeholder="Selecione um viveiro" />
                    </SelectTrigger>
                    <SelectContent>
                      {activePonds?.map((pond) => (
                        <SelectItem key={pond.pond_batch_id} value={pond.pond_batch_id}>
                          {pond.pond_name} - {pond.batch_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedPond && (
                  <div className="p-3 bg-muted rounded-lg text-sm">
                    <p className="text-muted-foreground">
                      População atual: <span className="font-medium text-foreground">{selectedPond.current_population.toLocaleString()}</span>
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="date">Data da Alimentação</Label>
                    <Input
                      id="date"
                      type="date"
                      value={feedingDate}
                      onChange={(e) => setFeedingDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="time">Horário</Label>
                    <Input
                      id="time"
                      type="time"
                      value={feedingTime}
                      onChange={(e) => setFeedingTime(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="amount">Quantidade Oferecida (kg)</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Ex: 25.5"
                    value={amountOffered}
                    onChange={(e) => setAmountOffered(e.target.value)}
                  />
                </div>

                <Button 
                  onClick={handleStartEvaluation}
                  className="w-full"
                  disabled={!selectedPondBatchId || !feedingTime || !amountOffered}
                >
                  <ClipboardCheck className="mr-2 h-4 w-4" />
                  Iniciar Avaliação
                </Button>
              </CardContent>
            </Card>

            {/* Info Card */}
            <Card className="mt-6 border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
              <CardHeader>
                <div className="flex items-start gap-2">
                  <Info className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
                  <div>
                    <CardTitle className="text-lg">Como funciona a avaliação</CardTitle>
                    <CardDescription className="mt-2 space-y-1">
                      <p>• Selecione o viveiro que deseja avaliar</p>
                      <p>• Informe quando foi a alimentação e a quantidade oferecida</p>
                      <p>• Avalie o consumo observado no viveiro</p>
                      <p>• O sistema irá sugerir ajustes automáticos baseados na sua avaliação</p>
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </>
        )}
      </div>

      {/* Evaluation Modal */}
      {isEvaluationModalOpen && selectedPond && (
        <FeedingEvaluationModal
          open={isEvaluationModalOpen}
          onOpenChange={setIsEvaluationModalOpen}
          feedingRecord={{
            pond_batch_id: selectedPondBatchId,
            feeding_date: feedingDate,
            feeding_time: feedingTime,
            actual_amount: Math.round(parseFloat(amountOffered) * 1000), // Convert kg to grams
            pond_name: selectedPond.pond_name,
            batch_name: selectedPond.batch_name,
          }}
          onEvaluationComplete={handleEvaluationComplete}
        />
      )}
    </Layout>
  );
}
