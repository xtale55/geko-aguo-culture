import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Clock, Utensils, Target, TrendingUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFarmsQuery, useActivePondsQuery } from '@/hooks/useSupabaseQuery';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface FeedingRecord {
  id: string;
  feeding_time: string;
  actual_amount: number;
  notes?: string;
}

interface DailyFeeding {
  totalPlanned: number;
  totalActual: number;
  mealsPerDay: number;
  feedingsToday: FeedingRecord[];
  feedingRate?: {
    feeding_percentage: number;
    meals_per_day: number;
    default_feed_type_name?: string;
  };
}

export default function AlimentacaoPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: farms } = useFarmsQuery();
  const { data: activePonds } = useActivePondsQuery(farms?.[0]?.id);

  const [selectedPondBatch, setSelectedPondBatch] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [feedingTime, setFeedingTime] = useState(format(new Date(), 'HH:mm'));
  const [actualAmount, setActualAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [dailyFeeding, setDailyFeeding] = useState<DailyFeeding>({
    totalPlanned: 0,
    totalActual: 0,
    mealsPerDay: 3,
    feedingsToday: []
  });
  const [isLoading, setIsLoading] = useState(false);

  // Load daily feeding data when pond batch or date changes
  useEffect(() => {
    if (selectedPondBatch && selectedDate) {
      loadDailyFeedingData();
    }
  }, [selectedPondBatch, selectedDate]);

  const loadDailyFeedingData = async () => {
    if (!selectedPondBatch) return;

    try {
      setIsLoading(true);

      // Get feeding records for today
      const { data: feedingRecords } = await supabase
        .from('feeding_records')
        .select('*')
        .eq('pond_batch_id', selectedPondBatch)
        .eq('feeding_date', selectedDate)
        .order('feeding_time');

      // Get feeding rate configuration
      const { data: feedingRate } = await supabase
        .from('feeding_rates')
        .select('feeding_percentage, meals_per_day, default_feed_type_name')
        .eq('pond_batch_id', selectedPondBatch)
        .single();

      // Get current pond batch info for biomass calculation
      const { data: pondBatch } = await supabase
        .from('pond_batches')
        .select(`
          *,
          biometrics(average_weight, measurement_date)
        `)
        .eq('id', selectedPondBatch)
        .single();

      // Calculate planned daily amount
      let plannedAmount = 0;
      if (feedingRate && pondBatch) {
        const latestBiometry = pondBatch.biometrics?.[0];
        const avgWeight = latestBiometry?.average_weight || 1;
        const biomass = (pondBatch.current_population * avgWeight) / 1000; // kg
        plannedAmount = (biomass * feedingRate.feeding_percentage / 100) * 1000; // grams
      }

      const totalActual = feedingRecords?.reduce((sum, record) => sum + record.actual_amount, 0) || 0;

      setDailyFeeding({
        totalPlanned: plannedAmount,
        totalActual,
        mealsPerDay: feedingRate?.meals_per_day || 3,
        feedingsToday: feedingRecords || [],
        feedingRate
      });
    } catch (error) {
      console.error('Error loading daily feeding data:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar dados de alimentação",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitFeeding = async () => {
    if (!selectedPondBatch || !actualAmount) {
      toast({
        title: "Erro",
        description: "Selecione o viveiro e informe a quantidade",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsLoading(true);

      // Get feed type info from inventory
      let feedTypeId = null;
      let feedTypeName = dailyFeeding.feedingRate?.default_feed_type_name;
      let unitCost = 0;

      // Get default feed from inventory
      const { data: inventory } = await supabase
        .from('inventory')
        .select('*')
        .eq('farm_id', farms?.[0]?.id)
        .eq('category', 'feed')
        .gt('quantity', 0)
        .order('created_at', { ascending: false })
        .limit(1);

      if (inventory?.[0]) {
        feedTypeId = inventory[0].id;
        feedTypeName = inventory[0].name || feedTypeName;
        unitCost = inventory[0].unit_price;
      }

      const feedingData = {
        pond_batch_id: selectedPondBatch,
        feeding_date: selectedDate,
        feeding_time: feedingTime,
        planned_amount: Math.round(dailyFeeding.totalPlanned / dailyFeeding.mealsPerDay),
        actual_amount: parseInt(actualAmount),
        feed_type_id: feedTypeId,
        feed_type_name: feedTypeName,
        unit_cost: unitCost,
        feeding_rate_percentage: dailyFeeding.feedingRate?.feeding_percentage || 0,
        notes
      };

      const { error } = await supabase
        .from('feeding_records')
        .insert(feedingData);

      if (error) throw error;

      // Update inventory if feed type found
      if (feedTypeId && inventory?.[0]) {
        const newQuantity = Math.max(0, inventory[0].quantity - parseInt(actualAmount));
        const { error: inventoryError } = await supabase
          .from('inventory')
          .update({ quantity: newQuantity })
          .eq('id', feedTypeId);

        if (inventoryError) console.warn('Inventory update error:', inventoryError);
      }

      toast({
        title: "Sucesso",
        description: "Alimentação registrada com sucesso"
      });

      // Reset form
      setActualAmount('');
      setNotes('');
      setFeedingTime(format(new Date(), 'HH:mm'));

      // Reload data
      loadDailyFeedingData();

    } catch (error) {
      console.error('Error saving feeding:', error);
      toast({
        title: "Erro",
        description: "Erro ao registrar alimentação",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const selectedPond = activePonds?.find(pond => 
    pond.pond_batches.some(pb => pb.id === selectedPondBatch)
  );

  const progressPercentage = dailyFeeding.totalPlanned > 0 
    ? Math.min((dailyFeeding.totalActual / dailyFeeding.totalPlanned) * 100, 100)
    : 0;

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-emerald-50/20">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate('/manejos')}
                className="mb-2"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar
              </Button>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                Registro de Alimentação
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Registre a alimentação diária dos viveiros
              </p>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Registro Form */}
            <Card className="backdrop-blur-sm bg-white/80 border-white/20 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Utensils className="w-5 h-5 text-green-600" />
                  Registrar Alimentação
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="pondBatch">Viveiro/Lote</Label>
                    <Select value={selectedPondBatch} onValueChange={setSelectedPondBatch}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o viveiro" />
                      </SelectTrigger>
                      <SelectContent>
                        {activePonds?.map(pond => 
                          pond.pond_batches.map(batch => (
                            <SelectItem key={batch.id} value={batch.id}>
                              {pond.name} - {batch.batches.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="date">Data</Label>
                    <Input
                      id="date"
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="time">Horário</Label>
                    <Input
                      id="time"
                      type="time"
                      value={feedingTime}
                      onChange={(e) => setFeedingTime(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="amount">Quantidade (g)</Label>
                    <Input
                      id="amount"
                      type="number"
                      placeholder="Ex: 5000"
                      value={actualAmount}
                      onChange={(e) => setActualAmount(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Observações (opcional)</Label>
                  <Input
                    id="notes"
                    placeholder="Ex: Ração bem aceita"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>

                <Button 
                  onClick={handleSubmitFeeding}
                  disabled={isLoading || !selectedPondBatch || !actualAmount}
                  className="w-full"
                >
                  Registrar Alimentação
                </Button>
              </CardContent>
            </Card>

            {/* Daily Progress */}
            {selectedPondBatch && (
              <Card className="backdrop-blur-sm bg-white/80 border-white/20 shadow-xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-blue-600" />
                    Progresso do Dia
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {selectedPond?.name} - {format(new Date(selectedDate), 'dd/MM/yyyy', { locale: ptBR })}
                  </p>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Progress Bar */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progresso</span>
                      <span>{Math.round(progressPercentage)}%</span>
                    </div>
                    <Progress value={progressPercentage} className="h-3" />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{(dailyFeeding.totalActual / 1000).toFixed(1)} kg alimentado</span>
                      <span>{(dailyFeeding.totalPlanned / 1000).toFixed(1)} kg planejado</span>
                    </div>
                  </div>

                  <Separator />

                  {/* Feeding Summary */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-slate-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">
                        {dailyFeeding.feedingsToday.length}
                      </div>
                      <div className="text-xs text-muted-foreground">Refeições</div>
                    </div>
                    <div className="text-center p-3 bg-slate-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">
                        {dailyFeeding.mealsPerDay - dailyFeeding.feedingsToday.length}
                      </div>
                      <div className="text-xs text-muted-foreground">Restantes</div>
                    </div>
                  </div>

                  {/* Today's Feedings */}
                  {dailyFeeding.feedingsToday.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="font-medium text-sm">Alimentações de Hoje</h4>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {dailyFeeding.feedingsToday.map((feeding) => (
                          <div key={feeding.id} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-slate-500" />
                              <span className="text-sm font-medium">
                                {feeding.feeding_time.slice(0, 5)}
                              </span>
                            </div>
                            <Badge variant="secondary">
                              {(feeding.actual_amount / 1000).toFixed(1)} kg
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}