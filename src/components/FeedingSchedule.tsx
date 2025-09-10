import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Edit2, Clock, Plus, History, Utensils, Target, TrendingUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { FeedingHistoryDialog } from './FeedingHistoryDialog';
import { QuantityUtils } from '@/lib/quantityUtils';

interface FeedingRecord {
  id: string;
  feeding_date: string;
  feeding_time: string;
  actual_amount: number;
  notes?: string;
  feed_type_id?: string;
  feed_type_name?: string;
  unit_cost?: number;
  created_at: string;
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
  isWeightEstimated?: boolean;
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
  onRateUpdate,
  isWeightEstimated = false
}: FeedingScheduleProps) {
  const [feedingRecords, setFeedingRecords] = useState<FeedingRecord[]>([]);
  const [availableFeeds, setAvailableFeeds] = useState<FeedType[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRate, setEditingRate] = useState(false);
  const [newFeedingRate, setNewFeedingRate] = useState<string>("");
  const [newMealsPerDay, setNewMealsPerDay] = useState<string>("");
  const [actualAmount, setActualAmount] = useState<string>("");
  const [selectedFeedType, setSelectedFeedType] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [feedingDate, setFeedingDate] = useState<string>(selectedDate);
  const [feedingTime, setFeedingTime] = useState<string>("");
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const feedPerMeal = dailyFeed / mealsPerDay;

  // Load feeding records and available feeds
  React.useEffect(() => {
    loadFeedingRecords();
    loadAvailableFeeds();
    setFeedingDate(selectedDate);
  }, [pondBatchId, selectedDate, farmId]);

  const loadAvailableFeeds = async () => {
    try {
      const { data, error } = await supabase
        .from('inventory')
        .select('id, name, quantity, unit_price')
        .eq('farm_id', farmId)
        .eq('category', 'Ração')
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
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFeedingRecords(data || []);
    } catch (error: any) {
      console.error('Error loading feeding records:', error);
    }
  };

  const handleOpenFeedingDialog = async () => {
    // Reset form
    setActualAmount(parseFloat(feedPerMeal.toFixed(1)).toString());
    setNotes("");
    setFeedingDate(selectedDate);
    
    // Set current time
    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5);
    setFeedingTime(currentTime);
    
    // Try to get default feed type from feeding rates
    let defaultFeedType = "";
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
    
    setSelectedFeedType(defaultFeedType);
    loadAvailableFeeds();
    setIsDialogOpen(true);
  };

  const handleRemoveFeeding = async (recordId: string) => {
    try {
      // Get the record to restore inventory
      const { data: record } = await supabase
        .from('feeding_records')
        .select('*')
        .eq('id', recordId)
        .single();

      if (record) {
        // Restore inventory
        if (record.feed_type_id) {
          const { data: inventory } = await supabase
            .from('inventory')
            .select('quantity')
            .eq('id', record.feed_type_id)
            .single();

          if (inventory) {
          await supabase
              .from('inventory')
              .update({ 
                quantity: inventory.quantity + record.actual_amount,
                updated_at: new Date().toISOString()
              })
              .eq('id', record.feed_type_id);
          }
        }

        // Delete the record
        const { error } = await supabase
          .from('feeding_records')
          .delete()
          .eq('id', recordId);

        if (error) throw error;

        toast({
          title: "Alimentação removida",
          description: "Registro removido e estoque restaurado"
        });

        loadFeedingRecords();
        loadAvailableFeeds();
        onFeedingUpdate();
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message
      });
    }
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
    try {
      // Anti-Drift: usar QuantityUtils para converter entrada em gramas (inteiro)
      const actualAmountGrams = QuantityUtils.parseInputToGrams(actualAmount);
      
      if (actualAmountGrams <= 0) {
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

      if (!feedingTime) {
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Por favor, informe o horário da alimentação"
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

      // Check if there's enough stock (Anti-Drift: comparação com gramas)
      if (selectedFeed.quantity < actualAmountGrams) {
        toast({
          variant: "destructive",
          title: "Estoque insuficiente",
          description: `Disponível: ${QuantityUtils.formatKg(selectedFeed.quantity)}kg, Solicitado: ${QuantityUtils.formatKg(actualAmountGrams)}kg`
        });
        return;
      }
      
      const feedingData = {
        pond_batch_id: pondBatchId,
        feeding_date: feedingDate,
        feeding_time: feedingTime,
        planned_amount: QuantityUtils.kgToGrams(feedPerMeal),
        actual_amount: actualAmountGrams,
        feeding_rate_percentage: feedingRate,
        feed_type_id: selectedFeedType,
        feed_type_name: selectedFeed.name,
        unit_cost: selectedFeed.unit_price,
        notes: notes || null
      };

      // Create new record
      const { error } = await supabase
        .from('feeding_records')
        .insert([feedingData]);

      if (error) throw error;

      // Update inventory - reduce stock (Anti-Drift: operação com inteiros)
      const { error: inventoryError } = await supabase
        .from('inventory')
        .update({ 
          quantity: selectedFeed.quantity - actualAmountGrams,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedFeedType);

      if (inventoryError) throw inventoryError;

      toast({
        title: "Alimentação registrada",
        description: `${QuantityUtils.formatKg(actualAmountGrams)}kg de ${selectedFeed.name} registrados às ${feedingTime}`
      });

      // Reset form and close dialog
      setActualAmount("");
      setNotes("");
      setSelectedFeedType("");
      setFeedingTime("");
      setIsDialogOpen(false);
      loadFeedingRecords();
      loadAvailableFeeds();
      onFeedingUpdate();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message
      });
    }
  };

  const getTotalActualFeed = () => {
    return feedingRecords.reduce((sum, record) => sum + QuantityUtils.gramsToKg(record.actual_amount), 0);
  };

  const totalActualFeed = getTotalActualFeed();
  const feedingsToday = feedingRecords.length;

  const progressPercentage = dailyFeed > 0 ? Math.min((totalActualFeed / dailyFeed) * 100, 100) : 0;

  return (
    <Card className="shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-ocean)] transition-shadow">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between mb-3">
          <CardTitle className="text-lg">{pondName}</CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              Lote: {batchName} • DOC: {doc}
            </Badge>
            <Button 
              variant="outline"
              size="sm"
              onClick={() => setIsHistoryDialogOpen(true)}
              className="h-7 px-2 text-xs"
            >
              <History className="w-3 h-3 mr-1" />
              Histórico
            </Button>
          </div>
        </div>

        {/* Main Feeding Information - Compact Gray Card */}
        <div className="bg-muted/50 rounded-lg p-3 space-y-3">
          {/* Top Row - Main Numbers */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Target className="w-3 h-3 text-primary" />
                <span className="text-xs font-medium text-muted-foreground">Diária</span>
              </div>
              <div className="text-lg font-bold text-primary">{dailyFeed.toFixed(1)} kg</div>
              <div className="text-xs text-muted-foreground">Total</div>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Utensils className="w-3 h-3 text-ocean" />
                <span className="text-xs font-medium text-muted-foreground">Por Refeição</span>
              </div>
              <div className="text-lg font-bold text-ocean">{feedPerMeal.toFixed(1)} kg</div>
              <div className="text-xs text-muted-foreground">{mealsPerDay}x/dia</div>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <TrendingUp className="w-3 h-3 text-accent" />
                <span className="text-xs font-medium text-muted-foreground">Taxa</span>
              </div>
              <div className="text-xl font-bold text-accent">{feedingRate}%</div>
              <div className="flex items-center justify-center">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={handleEditFeedingRate}
                      className="h-5 px-1 text-xs hover:bg-accent/20"
                    >
                      <Edit2 className="w-2 h-2 mr-1" />
                      Editar
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
              </div>
            </div>
          </div>

          {/* Bottom Row - Context Info with Population */}
          <div className="grid grid-cols-3 gap-4 text-xs border-t border-border/50 pt-2">
            <div className="text-center">
              <span className="text-muted-foreground">Biomassa</span>
              <div className="font-medium">{biomass.toFixed(1)} kg</div>
            </div>
            <div className="text-center">
              <span className="text-muted-foreground">Peso médio</span>
              <div className="font-medium flex items-center justify-center gap-1">
                {averageWeight < 0.1 ? '<0,1g' : `${averageWeight.toFixed(1)}g`}
                {isWeightEstimated && (
                  <Badge variant="secondary" className="text-xs">
                    Est.
                  </Badge>
                )}
              </div>
            </div>
            <div className="text-center">
              <span className="text-muted-foreground">População</span>
              <div className="font-medium">{currentPopulation.toLocaleString()}</div>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Progress Summary - Simplified */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-success/10 border border-success/20 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 bg-success rounded-full"></div>
              <span className="text-sm font-medium text-success">Realizado Hoje</span>
            </div>
            <div className="text-xl font-bold text-success">{totalActualFeed.toFixed(1)} kg</div>
            <div className="text-xs text-muted-foreground">
              {feedingsToday} de {mealsPerDay} alimentações
            </div>
          </div>
          
          <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 bg-primary rounded-full"></div>
              <span className="text-sm font-medium text-primary">Progresso</span>
            </div>
            <div className="text-xl font-bold text-primary">{progressPercentage.toFixed(0)}%</div>
            <div className="w-full bg-border rounded-full h-2 mt-2">
              <div 
                className="bg-primary rounded-full h-2 transition-all duration-300" 
                style={{ width: `${Math.min(progressPercentage, 100)}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                onClick={handleOpenFeedingDialog}
                className="flex-1 max-w-xs"
                size="lg"
              >
                <Plus className="w-4 h-4 mr-2" />
                Registrar Alimentação
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Registrar Alimentação - {pondName}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Viveiro</Label>
                  <Input
                    value={`${pondName} - ${batchName}`}
                    disabled
                    className="bg-muted"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Data</Label>
                    <Input
                      type="date"
                      value={feedingDate}
                      onChange={(e) => setFeedingDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Horário</Label>
                    <Input
                      type="time"
                      value={feedingTime}
                      onChange={(e) => setFeedingTime(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <Label>Tipo de Ração *</Label>
                  <Select value={selectedFeedType} onValueChange={setSelectedFeedType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo de ração..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableFeeds.map((feed) => (
                        <SelectItem key={feed.id} value={feed.id}>
                          {feed.name} - Disponível: {QuantityUtils.formatKg(feed.quantity)}kg (R$ {feed.unit_price}/kg)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {availableFeeds.length === 0 && (
                    <p className="text-xs text-destructive mt-1">
                      Nenhuma ração disponível no estoque
                    </p>
                  )}
                </div>
                <div>
                  <Label>Quantidade (kg) *</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={actualAmount}
                    onChange={(e) => setActualAmount(e.target.value)}
                    placeholder="Ex: 2.5"
                    onFocus={(e) => e.target.select()}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Sugerido por refeição: {feedPerMeal.toFixed(1)}kg
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
                    disabled={!selectedFeedType || !actualAmount || !feedingTime || availableFeeds.length === 0}
                    className="flex-1"
                  >
                    Registrar Alimentação
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Feeding History Dialog */}
        <FeedingHistoryDialog 
          open={isHistoryDialogOpen}
          onOpenChange={setIsHistoryDialogOpen}
          pondBatchId={pondBatchId}
          pondName={pondName}
          batchName={batchName}
        />

        {/* Feeding History */}
        {feedingRecords.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-medium">Alimentações de Hoje</div>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {feedingRecords.map((record) => (
                <div key={record.id} className="flex items-center justify-between p-3 border border-border rounded-lg bg-muted/30">
                  <div className="flex items-center space-x-3">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <div className="font-medium">{record.feeding_time}</div>
                      <div className="text-sm text-muted-foreground">
                        {QuantityUtils.formatKg(record.actual_amount)}kg de {record.feed_type_name}
                        {record.notes && (
                          <span className="block text-xs">{record.notes}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveFeeding(record.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    Remover
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}