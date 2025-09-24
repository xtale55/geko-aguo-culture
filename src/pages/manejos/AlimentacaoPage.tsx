import { useState } from 'react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Clock, History, Edit2, Trash2, Loader2, Utensils } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { getCurrentDateForInput, formatDateForDisplay } from '@/lib/utils';
import { QuantityUtils } from '@/lib/quantityUtils';
import { useActivePondsWithFeeding, useFeedingHistory, useAvailableFeeds } from '@/hooks/useOptimizedFeedingData';
import { FeedingPondCard } from '@/components/FeedingPondCard';
import { useRealtimeFeedingUpdates } from '@/hooks/useRealtimeFeedingUpdates';
import { useQueryClient } from '@tanstack/react-query';

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
  pond_batch_id: string;
}

interface FeedType {
  id: string;
  name: string;
  quantity: number;
  unit_price: number;
}

interface FeedingData {
  pond_batch_id: string;
  feeding_date: string;
  feeding_time: string;
  planned_amount: number;
  actual_amount: number;
  notes?: string;
  feed_type_id?: string;
  feed_type_name?: string;
}

export default function AlimentacaoPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  // Hooks React Query otimizados
  const { 
    data: ponds = [], 
    isLoading: pondsLoading,
    error: pondsError 
  } = useActivePondsWithFeeding();
  
  const { 
    data: feedingHistory = [], 
    isLoading: historyLoading,
    error: historyError 
  } = useFeedingHistory();
  
  const { 
    data: availableFeeds = [], 
    isLoading: feedsLoading,
    error: feedsError 
  } = useAvailableFeeds();

  // Estado da UI
  const [submitting, setSubmitting] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [selectedPond, setSelectedPond] = useState<PondWithBatch | null>(null);
  const [selectedFeedType, setSelectedFeedType] = useState<string>('');
  const [editingRecord, setEditingRecord] = useState<FeedingRecord | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  
  const [feedingData, setFeedingData] = useState<FeedingData>({
    pond_batch_id: '',
    feeding_date: getCurrentDateForInput(),
    feeding_time: format(new Date(), 'HH:mm'),
    planned_amount: 0,
    actual_amount: 0,
    notes: ''
  });

  // Setup realtime updates
  useRealtimeFeedingUpdates(user?.id);

  // Tratamento de erros otimizado
  if (pondsError) {
    toast({
      title: "Erro",
      description: "Erro ao carregar dados dos viveiros",
      variant: "destructive"
    });
  }

  if (historyError && !historyLoading) {
    toast({
      title: "Erro", 
      description: "Erro ao carregar histórico de alimentação",
      variant: "destructive"
    });
  }

  if (feedsError && !feedsLoading) {
    toast({
      title: "Erro",
      description: "Erro ao carregar rações disponíveis", 
      variant: "destructive"
    });
  }

  const handleOpenDialog = async (pond: PondWithBatch) => {
    if (!pond.current_batch) return;

    setSelectedPond(pond);
    
    // Calculate planned amount based on feeding rate
    try {
      // Get latest biometry for weight calculation
      const { data: biometry } = await supabase
        .from('biometrics')
        .select('average_weight')
        .eq('pond_batch_id', pond.current_batch.id)
        .order('measurement_date', { ascending: false })
        .limit(1);

      // Get farm_id from pond to find feeding rates
      const { data: pondData } = await supabase
        .from('ponds')
        .select('farm_id')
        .eq('id', pond.id)
        .single();

      const avgWeight = biometry?.[0]?.average_weight || 1; // Default to 1g if no biometry

      // Get feeding rate configuration based on weight range and farm_id
      const { data: feedingRate } = await supabase
        .from('feeding_rates')
        .select('feeding_percentage, meals_per_day, default_feed_type_id, default_feed_type_name')
        .eq('farm_id', pondData?.farm_id)
        .lte('weight_range_min', avgWeight)
        .gte('weight_range_max', avgWeight)
        .maybeSingle();

      let plannedAmount = 0;
      if (feedingRate && pond.current_batch) {
        const biomass = (pond.current_batch.current_population * avgWeight) / 1000; // kg
        const dailyFeed = (biomass * feedingRate.feeding_percentage / 100) * 1000; // grams
        plannedAmount = Math.round(dailyFeed / feedingRate.meals_per_day);
      }

      // Set default feed type if available
      let defaultFeedId = '';
      if (feedingRate?.default_feed_type_id && availableFeeds.some(feed => feed.id === feedingRate.default_feed_type_id)) {
        defaultFeedId = feedingRate.default_feed_type_id;
      } else if (availableFeeds.length > 0) {
        defaultFeedId = availableFeeds[0].id;
      }

      setSelectedFeedType(defaultFeedId);
      setFeedingData({
        pond_batch_id: pond.current_batch.id,
        feeding_date: getCurrentDateForInput(),
        feeding_time: format(new Date(), 'HH:mm'),
        planned_amount: plannedAmount,
        actual_amount: plannedAmount,
        notes: '',
        feed_type_id: defaultFeedId,
        feed_type_name: availableFeeds.find(feed => feed.id === defaultFeedId)?.name || ''
      });
    } catch (error) {
      console.error('Error calculating planned amount:', error);
      const defaultFeedId = availableFeeds.length > 0 ? availableFeeds[0].id : '';
      setSelectedFeedType(defaultFeedId);
      setFeedingData({
        pond_batch_id: pond.current_batch.id,
        feeding_date: getCurrentDateForInput(),
        feeding_time: format(new Date(), 'HH:mm'),
        planned_amount: 0,
        actual_amount: 0,
        notes: '',
        feed_type_id: defaultFeedId,
        feed_type_name: availableFeeds.find(feed => feed.id === defaultFeedId)?.name || ''
      });
    }

    setShowDialog(true);
  };

  const handleSubmitFeeding = async () => {
    try {
      setSubmitting(true);

      if (!selectedFeedType) {
        toast({
          title: "Erro",
          description: "Selecione um tipo de ração",
          variant: "destructive"
        });
        return;
      }

      // Get selected feed info
      const selectedFeed = availableFeeds.find(feed => feed.id === selectedFeedType);
      if (!selectedFeed) {
        toast({
          title: "Erro",
          description: "Ração selecionada não encontrada",
          variant: "destructive"
        });
        return;
      }

      // Check if there's enough stock (converted to grams for comparison)
      const requiredGrams = feedingData.actual_amount;
      const availableGrams = selectedFeed.quantity * 1000;
      
      if (requiredGrams > availableGrams) {
        toast({
          title: "Erro",
          description: `Estoque insuficiente. Disponível: ${selectedFeed.quantity} kg`,
          variant: "destructive"
        });
        return;
      }

      // Update inventory
      const newQuantityGrams = Math.max(0, availableGrams - requiredGrams);
      await supabase
        .from('inventory')
        .update({ quantity: newQuantityGrams })
        .eq('id', selectedFeedType);

      const feedingRecord = {
        ...feedingData,
        feed_type_id: selectedFeedType,
        feed_type_name: selectedFeed.name,
        unit_cost: selectedFeed.unit_price,
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
      
      // Invalidar caches para atualizar dados
      queryClient.invalidateQueries({ queryKey: ['active-ponds-feeding'] });
      queryClient.invalidateQueries({ queryKey: ['feeding-history'] });
      queryClient.invalidateQueries({ queryKey: ['available-feeds'] });

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

  const handleEditFeeding = (record: FeedingRecord) => {
    setEditingRecord(record);
    setIsEditing(true);
    setFeedingData({
      pond_batch_id: record.pond_batch_id,
      feeding_date: record.feeding_date,
      feeding_time: record.feeding_time,
      planned_amount: record.planned_amount,
      actual_amount: record.actual_amount,
      notes: record.notes || ''
    });
    setShowDialog(true);
  };

  const handleDeleteFeeding = async (recordId: string) => {
    if (!confirm('Tem certeza que deseja excluir este registro?')) return;

    try {
      setSubmitting(true);

      // First, get the feeding record to restore inventory
      const { data: feedingRecord, error: fetchError } = await supabase
        .from('feeding_records')
        .select('feed_type_id, actual_amount')
        .eq('id', recordId)
        .single();

      if (fetchError) throw fetchError;

      // Restore inventory if feed_type_id exists
      if (feedingRecord.feed_type_id) {
        const { data: currentInventory, error: invError } = await supabase
          .from('inventory')
          .select('quantity')
          .eq('id', feedingRecord.feed_type_id)
          .single();

        if (!invError && currentInventory) {
          const newQuantity = currentInventory.quantity + feedingRecord.actual_amount;
          await supabase
            .from('inventory')
            .update({ quantity: newQuantity })
            .eq('id', feedingRecord.feed_type_id);
        }
      }

      // Delete the feeding record
      const { error: deleteError } = await supabase
        .from('feeding_records')
        .delete()
        .eq('id', recordId);

      if (deleteError) throw deleteError;

      toast({
        title: "Sucesso",
        description: "Registro de alimentação excluído"
      });

      // Invalidar caches
      queryClient.invalidateQueries({ queryKey: ['feeding-history'] });
      queryClient.invalidateQueries({ queryKey: ['active-ponds-feeding'] });
      queryClient.invalidateQueries({ queryKey: ['available-feeds'] });

    } catch (error) {
      console.error('Error deleting feeding record:', error);
      toast({
        title: "Erro",
        description: "Erro ao excluir registro de alimentação",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateFeeding = async () => {
    if (!editingRecord) return;

    try {
      setSubmitting(true);

      const { error } = await supabase
        .from('feeding_records')
        .update({
          feeding_date: feedingData.feeding_date,
          feeding_time: feedingData.feeding_time,
          planned_amount: feedingData.planned_amount,
          actual_amount: feedingData.actual_amount,
          notes: feedingData.notes
        })
        .eq('id', editingRecord.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Registro de alimentação atualizado"
      });

      setShowDialog(false);
      setEditingRecord(null);
      setIsEditing(false);
      
      // Invalidar caches
      queryClient.invalidateQueries({ queryKey: ['feeding-history'] });
      queryClient.invalidateQueries({ queryKey: ['available-feeds'] });
      queryClient.invalidateQueries({ queryKey: ['active-ponds-feeding'] });

    } catch (error) {
      console.error('Error updating feeding record:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar registro de alimentação",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate('/manejos')}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Alimentação</h1>
              <p className="text-gray-600">Registre e acompanhe a alimentação dos seus viveiros</p>
            </div>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="registro" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="registro">Registro por Viveiro</TabsTrigger>
              <TabsTrigger value="historico">Histórico</TabsTrigger>
            </TabsList>

            <TabsContent value="registro" className="space-y-6">
              {pondsLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <FeedingPondCard 
                      key={i}
                      pond={{} as any}
                      onFeedPond={() => {}}
                      loading={true}
                    />
                  ))}
                </div>
              ) : ponds.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-8">
                    <div className="mx-auto h-12 w-12 text-gray-400 mb-4 flex items-center justify-center">
                      🐟
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Nenhum viveiro ativo encontrado
                    </h3>
                    <p className="text-gray-500">
                      Para registrar alimentação, é necessário ter viveiros com lotes ativos.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {ponds.map((pond) => (
                    <FeedingPondCard 
                      key={pond.id}
                      pond={pond}
                      onFeedPond={handleOpenDialog}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="historico">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <History className="h-5 w-5" />
                    Histórico de Alimentação
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {historyLoading ? (
                    <div className="space-y-2">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="animate-pulse h-12 bg-gray-200 rounded"></div>
                      ))}
                    </div>
                  ) : feedingHistory.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <History className="mx-auto h-12 w-12 mb-4 opacity-50" />
                      <p>Nenhum registro de alimentação encontrado</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data</TableHead>
                          <TableHead>Hora</TableHead>
                          <TableHead>Viveiro</TableHead>
                          <TableHead>Lote</TableHead>
                          <TableHead>Quantidade</TableHead>
                          <TableHead>Observações</TableHead>
                          <TableHead>Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {feedingHistory.map((record) => (
                          <TableRow key={record.id}>
                            <TableCell>{formatDateForDisplay(record.feeding_date)}</TableCell>
                            <TableCell>{record.feeding_time}</TableCell>
                            <TableCell>{record.pond_name}</TableCell>
                            <TableCell>{record.batch_name}</TableCell>
                            <TableCell>
                              {(record.actual_amount / 1000).toFixed(2)} kg
                            </TableCell>
                            <TableCell className="max-w-xs truncate">
                              {record.notes || '-'}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleEditFeeding(record)}
                                  disabled={submitting}
                                >
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDeleteFeeding(record.id)}
                                  disabled={submitting}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Dialog for feeding registration */}
          <Dialog open={showDialog} onOpenChange={setShowDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {isEditing ? 'Editar Alimentação' : 'Registrar Alimentação'}
                  {selectedPond && ` - ${selectedPond.name}`}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="feeding_date">Data</Label>
                    <Input
                      id="feeding_date"
                      type="date"
                      value={feedingData.feeding_date}
                      onChange={(e) => setFeedingData({ ...feedingData, feeding_date: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="feeding_time">Hora</Label>
                    <Input
                      id="feeding_time"
                      type="time"
                      value={feedingData.feeding_time}
                      onChange={(e) => setFeedingData({ ...feedingData, feeding_time: e.target.value })}
                    />
                  </div>
                </div>

                {!isEditing && (
                  <div>
                    <Label htmlFor="feed_type">Tipo de Ração</Label>
                    <Select value={selectedFeedType} onValueChange={setSelectedFeedType} disabled={feedsLoading}>
                      <SelectTrigger>
                        <SelectValue placeholder={feedsLoading ? "Carregando rações..." : "Selecione a ração"} />
                      </SelectTrigger>
                      <SelectContent>
                        {availableFeeds.map((feed) => (
                          <SelectItem key={feed.id} value={feed.id}>
                            {feed.name} (Estoque: {feed.quantity.toFixed(1)} kg)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="planned_amount">Quantidade Planejada (g)</Label>
                    <Input
                      id="planned_amount"
                      type="number"
                      value={feedingData.planned_amount}
                      onChange={(e) => setFeedingData({ ...feedingData, planned_amount: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="actual_amount">Quantidade Real (g)</Label>
                    <Input
                      id="actual_amount"
                      type="number"
                      value={feedingData.actual_amount}
                      onChange={(e) => setFeedingData({ ...feedingData, actual_amount: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="notes">Observações (opcional)</Label>
                  <Input
                    id="notes"
                    value={feedingData.notes}
                    onChange={(e) => setFeedingData({ ...feedingData, notes: e.target.value })}
                    placeholder="Digite observações sobre a alimentação..."
                  />
                </div>

                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setShowDialog(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={submitting ? undefined : (isEditing ? handleUpdateFeeding : handleSubmitFeeding)} disabled={submitting || feedsLoading}>
                    {submitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Salvando...
                      </>
                    ) : isEditing ? 'Atualizar' : 'Salvar'}
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