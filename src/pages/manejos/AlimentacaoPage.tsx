import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Clock, Utensils, History } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { getCurrentDateForInput, formatDateForDisplay } from '@/lib/utils';

interface PondWithBatch {
  id: string;
  name: string;
  area: number;
  status: string;
  current_batch?: {
    id: string;
    batch_name: string;
    stocking_date: string;
    current_population: number;
    latest_feeding?: {
      feeding_date: string;
      total_daily: number;
      meals_completed: number;
      meals_per_day: number;
      planned_total_daily: number;
      planned_per_meal: number;
      feeding_percentage: number;
    };
  };
}

interface FeedingRecord {
  id: string;
  feeding_date: string;
  feeding_time: string;
  actual_amount: number;
  planned_amount: number;
  notes?: string;
  pond_name: string;
  batch_name: string;
}

interface FeedingData {
  pond_batch_id: string;
  feeding_date: string;
  feeding_time: string;
  planned_amount: number;
  actual_amount: number;
  notes?: string;
}

export default function AlimentacaoPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [ponds, setPonds] = useState<PondWithBatch[]>([]);
  const [feedingHistory, setFeedingHistory] = useState<FeedingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [selectedPond, setSelectedPond] = useState<PondWithBatch | null>(null);
  
  const [feedingData, setFeedingData] = useState<FeedingData>({
    pond_batch_id: '',
    feeding_date: getCurrentDateForInput(),
    feeding_time: format(new Date(), 'HH:mm'),
    planned_amount: 0,
    actual_amount: 0,
    notes: ''
  });

  useEffect(() => {
    if (user) {
      loadActivePonds();
      loadFeedingHistory();
    }
  }, [user]);

  const loadActivePonds = async () => {
    try {
      // Load farms first
      const { data: farmsData, error: farmsError } = await supabase
        .from('farms')
        .select('id')
        .eq('user_id', user?.id);

      if (farmsError) throw farmsError;

      if (farmsData && farmsData.length > 0) {
        // Load active ponds with active batch data
        const { data: pondsData, error: pondsError } = await supabase
          .from('ponds')
          .select(`
            *,
            pond_batches!inner(
              id,
              current_population,
              stocking_date,
              cycle_status,
              batches!inner(name)
            )
          `)
          .eq('farm_id', farmsData[0].id)
          .eq('status', 'in_use')
          .eq('pond_batches.cycle_status', 'active')
          .gt('pond_batches.current_population', 0)
          .order('name');

        if (pondsError) throw pondsError;

        // Process and format pond data
        const formattedPonds: PondWithBatch[] = pondsData?.map(pond => {
          const activeBatch = pond.pond_batches[0];
          return {
            id: pond.id,
            name: pond.name,
            area: pond.area,
            status: pond.status,
            current_batch: activeBatch ? {
              id: activeBatch.id,
              batch_name: activeBatch.batches.name,
              stocking_date: activeBatch.stocking_date,
              current_population: activeBatch.current_population
            } : undefined
          };
        }) || [];

        // Load today's feeding summary for each pond
        for (const pond of formattedPonds) {
          if (pond.current_batch) {
            await loadTodayFeedingSummary(pond);
          }
        }

        setPonds(formattedPonds);
      }
    } catch (error) {
      console.error('Error loading ponds:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar viveiros",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadTodayFeedingSummary = async (pond: PondWithBatch) => {
    if (!pond.current_batch) return;

    try {
      const today = getCurrentDateForInput();
      
      // Get today's feeding records
      const { data: feedingRecords } = await supabase
        .from('feeding_records')
        .select('actual_amount')
        .eq('pond_batch_id', pond.current_batch.id)
        .eq('feeding_date', today);

      // Get feeding rate configuration
      const { data: feedingRate } = await supabase
        .from('feeding_rates')
        .select('feeding_percentage, meals_per_day, weight_range_min, weight_range_max')
        .eq('pond_batch_id', pond.current_batch.id)
        .maybeSingle();

      // Get latest biometry for calculations
      const { data: biometry } = await supabase
        .from('biometrics')
        .select('average_weight')
        .eq('pond_batch_id', pond.current_batch.id)
        .order('measurement_date', { ascending: false })
        .limit(1);

      const totalDaily = feedingRecords?.reduce((sum, record) => sum + record.actual_amount, 0) || 0;
      const mealsCompleted = feedingRecords?.length || 0;
      const mealsPerDay = feedingRate?.meals_per_day || 3;
      
      // Calculate planned amounts
      let plannedTotalDaily = 0;
      let plannedPerMeal = 0;
      
      if (feedingRate && pond.current_batch) {
        const avgWeight = biometry?.[0]?.average_weight || 1;
        const biomass = (pond.current_batch.current_population * avgWeight) / 1000; // kg
        plannedTotalDaily = (biomass * feedingRate.feeding_percentage / 100) * 1000; // grams
        plannedPerMeal = Math.round(plannedTotalDaily / feedingRate.meals_per_day);
      }

      // Update pond with feeding summary
      pond.current_batch.latest_feeding = {
        feeding_date: today,
        total_daily: totalDaily,
        meals_completed: mealsCompleted,
        meals_per_day: mealsPerDay,
        planned_total_daily: plannedTotalDaily,
        planned_per_meal: plannedPerMeal,
        feeding_percentage: feedingRate?.feeding_percentage || 0
      };
    } catch (error) {
      console.error('Error loading feeding summary:', error);
    }
  };

  const loadFeedingHistory = async () => {
    try {
      setHistoryLoading(true);

      // Load farms first
      const { data: farmsData, error: farmsError } = await supabase
        .from('farms')
        .select('id')
        .eq('user_id', user?.id);

      if (farmsError) throw farmsError;

      if (farmsData && farmsData.length > 0) {
        const { data: historyData, error: historyError } = await supabase
          .from('feeding_records')
          .select(`
            id,
            feeding_date,
            feeding_time,
            actual_amount,
            planned_amount,
            notes,
            pond_batch_id
          `)
          .order('feeding_date', { ascending: false })
          .order('feeding_time', { ascending: false })
          .limit(50);

        if (historyError) throw historyError;

        // Get pond and batch info for each record
        const formattedHistory: FeedingRecord[] = [];
        
        if (historyData) {
          for (const record of historyData) {
            const { data: pondBatchData } = await supabase
              .from('pond_batches')
              .select(`
                ponds!inner(name, farm_id),
                batches!inner(name)
              `)
              .eq('id', record.pond_batch_id)
              .eq('ponds.farm_id', farmsData[0].id)
              .single();

            if (pondBatchData) {
              formattedHistory.push({
                id: record.id,
                feeding_date: record.feeding_date,
                feeding_time: record.feeding_time,
                actual_amount: record.actual_amount,
                planned_amount: record.planned_amount,
                notes: record.notes,
                pond_name: pondBatchData.ponds.name,
                batch_name: pondBatchData.batches.name
              });
            }
          }
        }

        setFeedingHistory(formattedHistory);
      }
    } catch (error) {
      console.error('Error loading feeding history:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar histórico de alimentação",
        variant: "destructive"
      });
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleOpenDialog = async (pond: PondWithBatch) => {
    if (!pond.current_batch) return;

    setSelectedPond(pond);
    
    // Calculate planned amount based on feeding rate
    try {
      const { data: feedingRate } = await supabase
        .from('feeding_rates')
        .select('feeding_percentage, meals_per_day')
        .eq('pond_batch_id', pond.current_batch.id)
        .single();

      // Get latest biometry for weight calculation
      const { data: biometry } = await supabase
        .from('biometrics')
        .select('average_weight')
        .eq('pond_batch_id', pond.current_batch.id)
        .order('measurement_date', { ascending: false })
        .limit(1);

      let plannedAmount = 0;
      if (feedingRate && pond.current_batch) {
        const avgWeight = biometry?.[0]?.average_weight || 1;
        const biomass = (pond.current_batch.current_population * avgWeight) / 1000; // kg
        const dailyFeed = (biomass * feedingRate.feeding_percentage / 100) * 1000; // grams
        plannedAmount = Math.round(dailyFeed / feedingRate.meals_per_day);
      }

      setFeedingData({
        pond_batch_id: pond.current_batch.id,
        feeding_date: getCurrentDateForInput(),
        feeding_time: format(new Date(), 'HH:mm'),
        planned_amount: plannedAmount,
        actual_amount: plannedAmount,
        notes: ''
      });
    } catch (error) {
      console.error('Error calculating planned amount:', error);
      setFeedingData({
        pond_batch_id: pond.current_batch.id,
        feeding_date: getCurrentDateForInput(),
        feeding_time: format(new Date(), 'HH:mm'),
        planned_amount: 0,
        actual_amount: 0,
        notes: ''
      });
    }

    setShowDialog(true);
  };

  const handleSubmitFeeding = async () => {
    try {
      setSubmitting(true);

      // Get feed type info from inventory
      const { data: farmsData } = await supabase
        .from('farms')
        .select('id')
        .eq('user_id', user?.id);

      let feedTypeId = null;
      let feedTypeName = '';
      let unitCost = 0;

      if (farmsData?.[0]) {
        const { data: inventory } = await supabase
          .from('inventory')
          .select('*')
          .eq('farm_id', farmsData[0].id)
          .eq('category', 'feed')
          .gt('quantity', 0)
          .order('created_at', { ascending: false })
          .limit(1);

        if (inventory?.[0]) {
          feedTypeId = inventory[0].id;
          feedTypeName = inventory[0].name;
          unitCost = inventory[0].unit_price;

          // Update inventory
          const newQuantity = Math.max(0, inventory[0].quantity - feedingData.actual_amount);
          await supabase
            .from('inventory')
            .update({ quantity: newQuantity })
            .eq('id', feedTypeId);
        }
      }

      const feedingRecord = {
        ...feedingData,
        feed_type_id: feedTypeId,
        feed_type_name: feedTypeName,
        unit_cost: unitCost,
        feeding_rate_percentage: 0
      };

      const { error } = await supabase
        .from('feeding_records')
        .insert(feedingRecord);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Alimentação registrada com sucesso"
      });

      setShowDialog(false);
      loadActivePonds();
      loadFeedingHistory();

    } catch (error) {
      console.error('Error saving feeding:', error);
      toast({
        title: "Erro",
        description: "Erro ao registrar alimentação",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-emerald-50/20">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Carregando viveiros...</p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

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
                Voltar para Manejos
              </Button>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-gradient-to-r from-green-600 to-green-700 rounded-lg">
                  <Utensils className="w-6 h-6 text-white" />
                </div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-green-600 via-primary to-emerald-600 bg-clip-text text-transparent">
                  Alimentação
                </h1>
              </div>
              <p className="text-slate-600">
                Registre e acompanhe a alimentação diária dos viveiros
              </p>
            </div>
          </div>

          {/* Content */}
          <Tabs defaultValue="registro" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="registro" className="flex items-center gap-2">
                <Utensils className="w-4 h-4" />
                Registro por Viveiro
              </TabsTrigger>
              <TabsTrigger value="historico" className="flex items-center gap-2">
                <History className="w-4 h-4" />
                Histórico
              </TabsTrigger>
            </TabsList>

            <TabsContent value="registro" className="space-y-4">
              {ponds.length === 0 ? (
                <Card className="backdrop-blur-sm bg-white/80 border-white/20 shadow-xl">
                  <CardContent className="flex flex-col items-center justify-center h-64">
                    <Utensils className="w-12 h-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold text-muted-foreground mb-2">
                      Nenhum viveiro ativo encontrado
                    </h3>
                    <p className="text-sm text-muted-foreground text-center">
                      Adicione camarões aos viveiros para começar a registrar alimentação
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {ponds.map(pond => (
                    <Card key={pond.id} className="backdrop-blur-sm bg-white/80 border-white/20 shadow-xl hover:shadow-2xl transition-all duration-300">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg font-semibold">{pond.name}</CardTitle>
                          <Badge variant="secondary">
                            {pond.current_batch?.batch_name}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground space-y-1">
                          <div>População: {pond.current_batch?.current_population?.toLocaleString()} camarões</div>
                          <div>Área: {pond.area}m²</div>
                        </div>
                      </CardHeader>
                      
                      <CardContent className="space-y-4">
                        {/* Feeding Configuration Summary */}
                        {pond.current_batch?.latest_feeding && (
                          <div className="space-y-3">
                            <div className="bg-slate-50 rounded-lg p-3 space-y-2">
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Taxa de alimentação:</span>
                                <span className="font-medium">{pond.current_batch.latest_feeding.feeding_percentage.toFixed(1)}%</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Por refeição (planejado):</span>
                                <span className="font-medium">{(pond.current_batch.latest_feeding.planned_per_meal / 1000).toFixed(1)} kg</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Total diário (planejado):</span>
                                <span className="font-medium">{(pond.current_batch.latest_feeding.planned_total_daily / 1000).toFixed(1)} kg</span>
                              </div>
                            </div>
                            
                            {/* Daily Progress */}
                            <div className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <span>Refeições Hoje</span>
                                <span>
                                  {pond.current_batch.latest_feeding.meals_completed}/
                                  {pond.current_batch.latest_feeding.meals_per_day}
                                </span>
                              </div>
                              <Progress 
                                value={(pond.current_batch.latest_feeding.meals_completed / pond.current_batch.latest_feeding.meals_per_day) * 100} 
                                className="h-2" 
                              />
                              <div className="flex justify-between text-xs text-muted-foreground">
                                <span>Alimentado: {(pond.current_batch.latest_feeding.total_daily / 1000).toFixed(1)} kg</span>
                                <span>Restante: {((pond.current_batch.latest_feeding.planned_total_daily - pond.current_batch.latest_feeding.total_daily) / 1000).toFixed(1)} kg</span>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        <Button 
                          onClick={() => handleOpenDialog(pond)}
                          className="w-full"
                          size="sm"
                        >
                          <Utensils className="w-4 h-4 mr-2" />
                          Registrar Alimentação
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="historico" className="space-y-4">
              <Card className="backdrop-blur-sm bg-white/80 border-white/20 shadow-xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <History className="w-5 h-5" />
                    Histórico de Alimentação
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {historyLoading ? (
                    <div className="flex items-center justify-center h-32">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                    </div>
                  ) : feedingHistory.length === 0 ? (
                    <div className="text-center py-8">
                      <Utensils className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">Nenhum registro de alimentação encontrado</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Data</TableHead>
                            <TableHead>Horário</TableHead>
                            <TableHead>Viveiro</TableHead>
                            <TableHead>Lote</TableHead>
                            <TableHead>Quantidade</TableHead>
                            <TableHead>Observações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {feedingHistory.map(record => (
                            <TableRow key={record.id}>
                              <TableCell>{formatDateForDisplay(record.feeding_date)}</TableCell>
                              <TableCell>{record.feeding_time.slice(0, 5)}</TableCell>
                              <TableCell>{record.pond_name}</TableCell>
                              <TableCell>{record.batch_name}</TableCell>
                              <TableCell>{(record.actual_amount / 1000).toFixed(1)} kg</TableCell>
                              <TableCell className="max-w-xs truncate">{record.notes || '-'}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Dialog for Adding Feeding */}
          <Dialog open={showDialog} onOpenChange={setShowDialog}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Utensils className="w-5 h-5 text-green-600" />
                  Registrar Alimentação
                </DialogTitle>
                <p className="text-sm text-muted-foreground">
                  {selectedPond?.name} - {selectedPond?.current_batch?.batch_name}
                </p>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="date">Data</Label>
                    <Input
                      id="date"
                      type="date"
                      value={feedingData.feeding_date}
                      onChange={(e) => setFeedingData(prev => ({ ...prev, feeding_date: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="time">Horário</Label>
                    <Input
                      id="time"
                      type="time"
                      value={feedingData.feeding_time}
                      onChange={(e) => setFeedingData(prev => ({ ...prev, feeding_time: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="planned">Planejado (g)</Label>
                    <Input
                      id="planned"
                      type="number"
                      value={feedingData.planned_amount}
                      onChange={(e) => setFeedingData(prev => ({ ...prev, planned_amount: Number(e.target.value) }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="actual">Quantidade Real (g)</Label>
                    <Input
                      id="actual"
                      type="number"
                      value={feedingData.actual_amount}
                      onChange={(e) => setFeedingData(prev => ({ ...prev, actual_amount: Number(e.target.value) }))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Observações (opcional)</Label>
                  <Input
                    id="notes"
                    placeholder="Ex: Ração bem aceita, apetite normal"
                    value={feedingData.notes}
                    onChange={(e) => setFeedingData(prev => ({ ...prev, notes: e.target.value }))}
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <Button variant="outline" onClick={() => setShowDialog(false)} className="flex-1">
                    Cancelar
                  </Button>
                  <Button 
                    onClick={handleSubmitFeeding}
                    disabled={submitting || feedingData.actual_amount <= 0}
                    className="flex-1"
                  >
                    {submitting ? 'Salvando...' : 'Salvar'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </Layout>
  );
}