import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Clock, History, Edit2, Trash2, Loader2 } from 'lucide-react';
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

  const handleEditFeeding = async (record: FeedingRecord) => {
    setEditingRecord(record);
    setIsEditing(true);
    
    // Find the pond data for this record
    const { data: pondBatchData } = await supabase
      .from('pond_batches')
      .select(`
        ponds!inner(id, name, area),
        batches!inner(name)
      `)
      .eq('id', record.pond_batch_id)
      .single();

    if (pondBatchData) {
      const pondData: PondWithBatch = {
        id: pondBatchData.ponds.id,
        name: pondBatchData.ponds.name,
        area: pondBatchData.ponds.area,
        status: 'in_use',
        current_batch: {
          id: record.pond_batch_id,
          batch_name: pondBatchData.batches.name,
          stocking_date: '',
          current_population: 0
        }
      };
      
      setSelectedPond(pondData);
    }

    // Get the feed type from the record
    const { data: feedingRecordData } = await supabase
      .from('feeding_records')
      .select('feed_type_id, feed_type_name')
      .eq('id', record.id)
      .single();

    if (feedingRecordData?.feed_type_id) {
      setSelectedFeedType(feedingRecordData.feed_type_id);
    }

    setFeedingData({
      pond_batch_id: record.pond_batch_id,
      feeding_date: record.feeding_date,
      feeding_time: record.feeding_time,
      planned_amount: record.planned_amount,
      actual_amount: record.actual_amount,
      notes: record.notes || '',
      feed_type_id: feedingRecordData?.feed_type_id || '',
      feed_type_name: feedingRecordData?.feed_type_name || ''
    });

    setShowDialog(true);
  };

  const handleDeleteFeeding = async (recordId: string) => {
    if (!confirm('Tem certeza que deseja excluir este registro de alimentação?')) {
      return;
    }

    try {
      // Get the record to restore inventory
      const { data: record } = await supabase
        .from('feeding_records')
        .select('actual_amount, feed_type_id')
        .eq('id', recordId)
        .single();

      if (record?.feed_type_id) {
        // Restore inventory
        const { data: currentInventory } = await supabase
          .from('inventory')
          .select('quantity')
          .eq('id', record.feed_type_id)
          .single();

        if (currentInventory) {
          await supabase
            .from('inventory')
            .update({ 
              quantity: currentInventory.quantity + record.actual_amount 
            })
            .eq('id', record.feed_type_id);
        }
      }

      // Delete the feeding record
      const { error } = await supabase
        .from('feeding_records')
        .delete()
        .eq('id', recordId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Registro excluído com sucesso"
      });

      loadFeedingHistory();
      loadAvailableFeeds();
    } catch (error) {
      console.error('Error deleting feeding record:', error);
      toast({
        title: "Erro",
        description: "Erro ao excluir registro",
        variant: "destructive"
      });
    }
  };

  const handleUpdateFeeding = async () => {
    if (!editingRecord) return;

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

      // Get current and new feed info
      const { data: currentRecord } = await supabase
        .from('feeding_records')
        .select('actual_amount, feed_type_id')
        .eq('id', editingRecord.id)
        .single();

      const selectedFeed = availableFeeds.find(feed => feed.id === selectedFeedType);
      if (!selectedFeed) {
        toast({
          title: "Erro",
          description: "Ração selecionada não encontrada",
          variant: "destructive"
        });
        return;
      }

      // Calculate inventory adjustments
      const oldAmount = currentRecord?.actual_amount || 0;
      const newAmount = feedingData.actual_amount;
      const oldFeedTypeId = currentRecord?.feed_type_id;
      const newFeedTypeId = selectedFeedType;

      // If feed type changed, restore old inventory
      if (oldFeedTypeId && oldFeedTypeId !== newFeedTypeId) {
        const { data: oldInventory } = await supabase
          .from('inventory')
          .select('quantity')
          .eq('id', oldFeedTypeId)
          .single();

        if (oldInventory) {
          await supabase
            .from('inventory')
            .update({ quantity: oldInventory.quantity + oldAmount })
            .eq('id', oldFeedTypeId);
        }
      }

      // Update new inventory
      const { data: newInventory } = await supabase
        .from('inventory')
        .select('quantity')
        .eq('id', newFeedTypeId)
        .single();

      if (newInventory) {
        const inventoryChange = oldFeedTypeId === newFeedTypeId ? (newAmount - oldAmount) : newAmount;
        const newQuantity = newInventory.quantity - inventoryChange;

        if (newQuantity < 0) {
          toast({
            title: "Erro",
            description: `Estoque insuficiente. Disponível: ${(newInventory.quantity / 1000).toFixed(1)} kg`,
            variant: "destructive"
          });
          return;
        }

        await supabase
          .from('inventory')
          .update({ quantity: newQuantity })
          .eq('id', newFeedTypeId);
      }

      // Update feeding record
      const { error } = await supabase
        .from('feeding_records')
        .update({
          feeding_date: feedingData.feeding_date,
          feeding_time: feedingData.feeding_time,
          actual_amount: feedingData.actual_amount,
          planned_amount: feedingData.planned_amount,
          notes: feedingData.notes,
          feed_type_id: selectedFeedType,
          feed_type_name: selectedFeed.name,
          unit_cost: selectedFeed.unit_price
        })
        .eq('id', editingRecord.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Registro atualizado com sucesso"
      });

      setShowDialog(false);
      setIsEditing(false);
      setEditingRecord(null);
      loadFeedingHistory();
      loadAvailableFeeds();

    } catch (error) {
      console.error('Error updating feeding:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar registro",
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
                className="mb-2 bg-gradient-to-r from-slate-50 to-slate-100 hover:from-primary/10 hover:to-accent/10 border border-slate-200 hover:border-primary/20 text-slate-700 hover:text-primary transition-all duration-300"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar para Manejos
              </Button>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-gradient-to-r from-green-600 to-green-700 rounded-lg">
                  <Utensils className="w-6 h-6 text-white" />
                </div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-900 via-blue-800 to-slate-700 bg-clip-text text-transparent">
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
                             <TableHead className="text-center">Ações</TableHead>
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
                               <TableCell className="text-center">
                                 <div className="flex items-center justify-center gap-2">
                                   <Button
                                     variant="ghost"
                                     size="sm"
                                     onClick={() => handleEditFeeding(record)}
                                     className="h-8 w-8 p-0"
                                   >
                                     <Edit2 className="w-4 h-4" />
                                   </Button>
                                   <Button
                                     variant="ghost"
                                     size="sm"
                                     onClick={() => handleDeleteFeeding(record.id)}
                                     className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                   >
                                     <Trash2 className="w-4 h-4" />
                                   </Button>
                                 </div>
                               </TableCell>
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
                  {isEditing ? 'Editar Alimentação' : 'Registrar Alimentação'}
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

                <div className="space-y-2">
                  <Label htmlFor="feed-type">Tipo de Ração</Label>
                  <Select value={selectedFeedType} onValueChange={(value) => {
                    setSelectedFeedType(value);
                    const selectedFeed = availableFeeds.find(feed => feed.id === value);
                    setFeedingData(prev => ({
                      ...prev,
                      feed_type_id: value,
                      feed_type_name: selectedFeed?.name || ''
                    }));
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo de ração" />
                    </SelectTrigger>
                    <SelectContent className="bg-background border border-border z-50">
                      {availableFeeds.map(feed => (
                        <SelectItem key={feed.id} value={feed.id}>
                          <div className="flex justify-between items-center w-full">
                            <span>{feed.name}</span>
                            <span className="text-muted-foreground ml-2">
                              ({feed.quantity.toFixed(1)} kg disponível)
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {availableFeeds.length === 0 && (
                    <p className="text-sm text-destructive">
                      Nenhuma ração disponível no estoque
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantidade (kg)</Label>
                  <Input
                    id="quantity"
                    type="number"
                    step="0.1"
                    value={QuantityUtils.gramsToKg(feedingData.actual_amount)}
                    onChange={(e) => {
                      const gramsValue = QuantityUtils.parseInputToGrams(e.target.value);
                      setFeedingData(prev => ({ 
                        ...prev, 
                        actual_amount: gramsValue,
                        planned_amount: gramsValue // Keep both values in sync
                      }));
                    }}
                  />
                  <p className="text-sm text-muted-foreground">
                    Recomendado: {QuantityUtils.formatKg(feedingData.planned_amount)} kg
                  </p>
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
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setShowDialog(false);
                      setIsEditing(false);
                      setEditingRecord(null);
                    }} 
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                  <Button 
                    onClick={isEditing ? handleUpdateFeeding : handleSubmitFeeding}
                    disabled={submitting || feedingData.actual_amount <= 0 || !selectedFeedType || availableFeeds.length === 0}
                    className="flex-1"
                  >
                    {submitting ? 'Salvando...' : (isEditing ? 'Atualizar' : 'Salvar')}
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