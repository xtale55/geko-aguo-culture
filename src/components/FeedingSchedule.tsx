import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Check, AlertCircle, Edit2, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface FeedingRecord {
  id?: string;
  feeding_time: string;
  planned_amount: number;
  actual_amount: number;
  completed: boolean;
  notes?: string;
  feed_type_id?: string;
  feed_type_name?: string;
  unit_cost?: number;
}

interface FeedType {
  id: string;
  name: string;
  quantity: number;
  unit_price: number;
}

interface FeedingScheduleProps {
  pondId: string;
  pondName: string;
  batchName: string;
  pondBatchId: string;
  biomass: number;
  feedingRate: number;
  mealsPerDay: number;
  dailyFeed: number;
  doc: number;
  selectedDate: string;
  currentPopulation: number;
  averageWeight: number;
  farmId: string;
  onFeedingUpdate: () => void;
  onRateUpdate: () => void;
}

export function FeedingSchedule({
  pondId,
  pondName,
  batchName,
  pondBatchId,
  biomass,
  feedingRate,
  mealsPerDay,
  dailyFeed,
  doc,
  selectedDate,
  currentPopulation,
  averageWeight,
  farmId,
  onFeedingUpdate,
  onRateUpdate
}: FeedingScheduleProps) {
  const [feedingRecords, setFeedingRecords] = useState<FeedingRecord[]>([]);
  const [availableFeeds, setAvailableFeeds] = useState<FeedType[]>([]);
  const [editingRecord, setEditingRecord] = useState<FeedingRecord | null>(null);
  const [editingRate, setEditingRate] = useState(false);
  const [newFeedingRate, setNewFeedingRate] = useState<string>("");
  const [newMealsPerDay, setNewMealsPerDay] = useState<string>("");
  const [actualAmount, setActualAmount] = useState<string>("");
  const [selectedFeedType, setSelectedFeedType] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const { toast } = useToast();
  const { user } = useAuth();

  const defaultSchedule = ['06:00', '10:00', '14:00', '18:00', '22:00'];
  const feedPerMeal = dailyFeed / mealsPerDay;

  // Initialize feeding records for the day
  React.useEffect(() => {
    loadFeedingRecords();
    loadAvailableFeeds();
  }, [pondBatchId, selectedDate, farmId]);

  const loadAvailableFeeds = async () => {
    try {
      const { data, error } = await supabase
        .from('inventory')
        .select('id, name, quantity, unit_price')
        .eq('farm_id', farmId)
        .eq('category', 'ração')
        .gt('quantity', 0)
        .order('name');

      if (error) throw error;
      setAvailableFeeds(data || []);
    } catch (error: any) {
      console.error('Error loading available feeds:', error);
    }
  };

  const loadFeedingRecords = async () => {
    try {
      const { data, error } = await supabase
        .from('feeding_records')
        .select('*')
        .eq('pond_batch_id', pondBatchId)
        .eq('feeding_date', selectedDate)
        .order('feeding_time');

      if (error) throw error;

      // If no records exist, create default schedule
      if (!data || data.length === 0) {
        const defaultRecords = defaultSchedule.slice(0, mealsPerDay).map(time => ({
          feeding_time: time,
          planned_amount: feedPerMeal,
          actual_amount: 0,
          completed: false
        }));
        setFeedingRecords(defaultRecords);
      } else {
        setFeedingRecords(data.map(record => ({
          id: record.id,
          feeding_time: record.feeding_time,
          planned_amount: record.planned_amount,
          actual_amount: record.actual_amount,
          completed: record.actual_amount > 0,
          notes: record.notes || "",
          feed_type_id: record.feed_type_id,
          feed_type_name: record.feed_type_name,
          unit_cost: record.unit_cost
        })));
      }
    } catch (error: any) {
      console.error('Error loading feeding records:', error);
    }
  };

  const handleEditFeeding = async (record: FeedingRecord) => {
    setEditingRecord(record);
    setActualAmount(record.planned_amount.toString()); // Pre-fill with planned amount
    setNotes(record.notes || "");
    
    // Try to get default feed type from feeding rates
    let defaultFeedType = record.feed_type_id || "";
    
    if (!defaultFeedType) {
      try {
        const { data: rateData } = await supabase
          .from('feeding_rates')
          .select('default_feed_type_id')
          .eq('farm_id', farmId)
          .is('pond_batch_id', null)
          .lte('weight_range_min', averageWeight)
          .gte('weight_range_max', averageWeight)
          .order('weight_range_min', { ascending: false })
          .limit(1);
          
        if (rateData && rateData.length > 0 && rateData[0].default_feed_type_id) {
          defaultFeedType = rateData[0].default_feed_type_id;
        }
      } catch (error) {
        console.error('Error getting default feed type:', error);
      }
    }
    
    setSelectedFeedType(defaultFeedType);
  };

  const handleEditFeedingRate = () => {
    setEditingRate(true);
    setNewFeedingRate(feedingRate.toString());
    setNewMealsPerDay(mealsPerDay.toString());
  };

  const handleSaveFeedingRate = async () => {
    try {
      const newRate = parseFloat(newFeedingRate);
      const newMeals = parseInt(newMealsPerDay);
      
      if (isNaN(newRate) || newRate <= 0) {
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Por favor, insira um percentual válido"
        });
        return;
      }

      if (isNaN(newMeals) || newMeals < 1 || newMeals > 10) {
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Por favor, insira um número válido de refeições (1-10)"
        });
        return;
      }

      // Check if there's already a rate for this weight range
      const { data: existingRates } = await supabase
        .from('feeding_rates')
        .select('*')
        .eq('pond_batch_id', pondBatchId)
        .lte('weight_range_min', averageWeight)
        .gte('weight_range_max', averageWeight);

      if (existingRates && existingRates.length > 0) {
        // Update existing rate
        const { error } = await supabase
          .from('feeding_rates')
          .update({ 
            feeding_percentage: newRate,
            meals_per_day: newMeals
          })
          .eq('id', existingRates[0].id);

        if (error) throw error;
      } else {
        // Create new rate for current weight
        const { error } = await supabase
          .from('feeding_rates')
          .insert({
            pond_batch_id: pondBatchId,
            weight_range_min: Math.max(0, averageWeight - 1),
            weight_range_max: averageWeight + 10,
            feeding_percentage: newRate,
            meals_per_day: newMeals,
            created_by: user?.id
          });

        if (error) throw error;
      }

      toast({
        title: "Taxa atualizada",
        description: `Nova taxa: ${newRate}% da biomassa • ${newMeals}x/dia`
      });

      setEditingRate(false);
      setNewFeedingRate("");
      setNewMealsPerDay("");
      onRateUpdate();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message
      });
    }
  };

  const handleSaveFeeding = async () => {
    if (!editingRecord) return;

    try {
      const actualAmountNum = parseFloat(actualAmount) || 0;
      
      if (actualAmountNum <= 0) {
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Por favor, insira uma quantidade válida"
        });
        return;
      }

      if (!selectedFeedType) {
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Por favor, selecione o tipo de ração"
        });
        return;
      }

      // Get feed details
      const selectedFeed = availableFeeds.find(feed => feed.id === selectedFeedType);
      if (!selectedFeed) {
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Tipo de ração não encontrado"
        });
        return;
      }

      // Check if there's enough stock
      if (selectedFeed.quantity < actualAmountNum) {
        toast({
          variant: "destructive",
          title: "Estoque insuficiente",
          description: `Disponível: ${selectedFeed.quantity}kg, Solicitado: ${actualAmountNum}kg`
        });
        return;
      }
      
      const feedingData = {
        pond_batch_id: pondBatchId,
        feeding_date: selectedDate,
        feeding_time: editingRecord.feeding_time,
        planned_amount: editingRecord.planned_amount,
        actual_amount: actualAmountNum,
        feeding_rate_percentage: feedingRate,
        feed_type_id: selectedFeedType,
        feed_type_name: selectedFeed.name,
        unit_cost: selectedFeed.unit_price,
        notes: notes || null
      };

      if (editingRecord.id) {
        // Update existing record
        const { error } = await supabase
          .from('feeding_records')
          .update(feedingData)
          .eq('id', editingRecord.id);

        if (error) throw error;
      } else {
        // Create new record
        const { error } = await supabase
          .from('feeding_records')
          .insert([feedingData]);

        if (error) throw error;
      }

      // Update inventory - reduce stock
      const { error: inventoryError } = await supabase
        .from('inventory')
        .update({ 
          quantity: selectedFeed.quantity - actualAmountNum,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedFeedType);

      if (inventoryError) throw inventoryError;

      toast({
        title: "Alimentação registrada",
        description: `${actualAmountNum}kg de ${selectedFeed.name} registrados para ${editingRecord.feeding_time}`
      });

      setEditingRecord(null);
      setActualAmount("");
      setNotes("");
      setSelectedFeedType("");
      loadFeedingRecords();
      loadAvailableFeeds(); // Refresh to show updated stock
      onFeedingUpdate();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message
      });
    }
  };

  const getCompletionRate = () => {
    const completed = feedingRecords.filter(record => record.completed).length;
    return feedingRecords.length > 0 ? (completed / feedingRecords.length) * 100 : 0;
  };

  const getTotalActualFeed = () => {
    return feedingRecords.reduce((sum, record) => sum + record.actual_amount, 0);
  };

  const completionRate = getCompletionRate();
  const totalActualFeed = getTotalActualFeed();

  return (
    <Card className="shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-ocean)] transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{pondName}</CardTitle>
          <div className="flex items-center gap-2">
            <Dialog>
              <DialogTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleEditFeedingRate}
                >
                  <Edit2 className="w-3 h-3 mr-1" />
                  {feedingRate}%
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Editar Taxa de Alimentação - {pondName}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Percentual da Biomassa (%)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={newFeedingRate}
                        onChange={(e) => setNewFeedingRate(e.target.value)}
                        placeholder="Ex: 5.0"
                      />
                    </div>
                    <div>
                      <Label>Refeições por Dia</Label>
                      <Input
                        type="number"
                        min="1"
                        max="10"
                        value={newMealsPerDay}
                        onChange={(e) => setNewMealsPerDay(e.target.value)}
                        placeholder="Ex: 3"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Peso atual dos animais: {averageWeight}g
                  </p>
                  <div className="flex gap-2">
                    <Button onClick={handleSaveFeedingRate} disabled={!newFeedingRate || !newMealsPerDay}>
                      Salvar
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setEditingRate(false);
                        setNewFeedingRate("");
                        setNewMealsPerDay("");
                      }}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            <Badge 
              variant={completionRate === 100 ? "default" : completionRate > 0 ? "secondary" : "outline"}
              className={completionRate === 100 ? "bg-success" : ""}
            >
              {completionRate.toFixed(0)}% concluído
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Task Summary */}
        <div className="bg-muted/50 rounded-lg p-3 space-y-2">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Lote:</span>
              <span className="font-medium ml-1">{batchName}</span>
            </div>
            <div>
              <span className="text-muted-foreground">DOC:</span>
              <span className="font-medium ml-1">{doc} dias</span>
            </div>
            <div>
              <span className="text-muted-foreground">Biomassa:</span>
              <span className="font-medium ml-1">{biomass.toFixed(1)} kg</span>
            </div>
            <div>
              <span className="text-muted-foreground">Peso médio:</span>
              <span className="font-medium ml-1">{averageWeight}g</span>
            </div>
          </div>
        </div>

        {/* Daily Feed Summary */}
        <div className="grid grid-cols-2 gap-4">
          <div className="border-l-4 border-primary pl-4">
            <div className="text-sm text-muted-foreground">Planejado</div>
            <div className="text-xl font-bold text-primary">{dailyFeed.toFixed(1)} kg</div>
            <div className="text-xs text-muted-foreground">
              {feedingRate}% da biomassa
            </div>
          </div>
          <div className="border-l-4 border-success pl-4">
            <div className="text-sm text-muted-foreground">Realizado</div>
            <div className="text-xl font-bold text-success">{totalActualFeed.toFixed(1)} kg</div>
            <div className="text-xs text-muted-foreground">
              {mealsPerDay}x por dia
            </div>
          </div>
        </div>

        {/* Feeding Schedule */}
        <div className="space-y-2">
          <div className="text-sm font-medium">Horários de Alimentação</div>
          <div className="space-y-2">
            {feedingRecords.map((record, index) => (
              <div key={index} className="flex items-center justify-between p-2 border border-border rounded">
                <div className="flex items-center space-x-3">
                  <Checkbox
                    checked={record.completed}
                    onCheckedChange={() => {
                      if (!record.completed) {
                        handleEditFeeding(record);
                      }
                    }}
                    className="cursor-pointer"
                  />
                  <div>
                    <div className="font-medium flex items-center gap-2">
                      <Clock className="w-3 h-3" />
                      {record.feeding_time}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Planejado: {record.planned_amount.toFixed(1)} kg
                      {record.actual_amount > 0 && (
                        <span className="ml-2 text-success">
                          • Realizado: {record.actual_amount.toFixed(1)} kg
                          {record.feed_type_name && (
                            <span className="ml-1">({record.feed_type_name})</span>
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {record.completed && (
                    <Check className="w-4 h-4 text-success" />
                  )}
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleEditFeeding(record)}
                      >
                        <Edit2 className="w-3 h-3" />
                        {record.completed ? 'Editar' : 'Registrar'}
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>Registrar Alimentação - {record.feeding_time}</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label>Quantidade Planejada</Label>
                          <Input
                            value={record.planned_amount.toFixed(1) + " kg"}
                            disabled
                            className="bg-muted"
                          />
                        </div>
                        <div>
                          <Label>Tipo de Ração *</Label>
                          <select
                            className="w-full p-2 border border-border rounded-md bg-background"
                            value={selectedFeedType}
                            onChange={(e) => setSelectedFeedType(e.target.value)}
                          >
                            <option value="">Selecione o tipo de ração...</option>
                            {availableFeeds.map((feed) => (
                              <option key={feed.id} value={feed.id}>
                                {feed.name} - Disponível: {feed.quantity}kg (R$ {feed.unit_price}/kg)
                              </option>
                            ))}
                          </select>
                          {availableFeeds.length === 0 && (
                            <p className="text-xs text-destructive mt-1">
                              Nenhuma ração disponível no estoque
                            </p>
                          )}
                        </div>
                        <div>
                          <Label>Quantidade Realizada (kg) *</Label>
                          <Input
                            type="number"
                            step="0.1"
                            value={actualAmount}
                            onChange={(e) => setActualAmount(e.target.value)}
                            placeholder="Ex: 2.5"
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Sugerido: {record.planned_amount.toFixed(1)}kg
                          </p>
                        </div>
                        <div>
                          <Label>Observações</Label>
                          <Textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Observações sobre a alimentação..."
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            onClick={handleSaveFeeding}
                            disabled={!selectedFeedType || !actualAmount || availableFeeds.length === 0}
                          >
                            Registrar Alimentação
                          </Button>
                          <Button 
                            variant="outline" 
                            onClick={() => {
                              setEditingRecord(null);
                              setActualAmount("");
                              setNotes("");
                              setSelectedFeedType("");
                            }}
                          >
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            ))}
          </div>
        </div>

        {completionRate < 100 && (
          <div className="flex items-center space-x-2 text-sm text-amber-600">
            <AlertCircle className="w-4 h-4" />
            <span>Pendente: {feedingRecords.filter(r => !r.completed).length} refeições</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}