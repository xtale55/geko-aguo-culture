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
import { Check, AlertCircle, Edit2, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface FeedingRecord {
  id?: string;
  feeding_time: string;
  planned_amount: number;
  actual_amount: number;
  completed: boolean;
  notes?: string;
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
  onFeedingUpdate: () => void;
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
  onFeedingUpdate
}: FeedingScheduleProps) {
  const [feedingRecords, setFeedingRecords] = useState<FeedingRecord[]>([]);
  const [editingRecord, setEditingRecord] = useState<FeedingRecord | null>(null);
  const [actualAmount, setActualAmount] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const { toast } = useToast();

  const defaultSchedule = ['06:00', '10:00', '14:00', '18:00', '22:00'];
  const feedPerMeal = dailyFeed / mealsPerDay;

  // Initialize feeding records for the day
  React.useEffect(() => {
    loadFeedingRecords();
  }, [pondBatchId, selectedDate]);

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
          notes: record.notes || ""
        })));
      }
    } catch (error: any) {
      console.error('Error loading feeding records:', error);
    }
  };

  const handleEditFeeding = (record: FeedingRecord) => {
    setEditingRecord(record);
    setActualAmount(record.actual_amount.toString());
    setNotes(record.notes || "");
  };

  const handleSaveFeeding = async () => {
    if (!editingRecord) return;

    try {
      const actualAmountNum = parseFloat(actualAmount) || 0;
      
      const feedingData = {
        pond_batch_id: pondBatchId,
        feeding_date: selectedDate,
        feeding_time: editingRecord.feeding_time,
        planned_amount: editingRecord.planned_amount,
        actual_amount: actualAmountNum,
        feeding_rate_percentage: feedingRate,
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

      toast({
        title: "Alimentação registrada",
        description: `${actualAmountNum}kg registrados para ${editingRecord.feeding_time}`
      });

      setEditingRecord(null);
      setActualAmount("");
      setNotes("");
      loadFeedingRecords();
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
          <Badge 
            variant={completionRate === 100 ? "default" : completionRate > 0 ? "secondary" : "outline"}
            className={completionRate === 100 ? "bg-success" : ""}
          >
            {completionRate.toFixed(0)}% concluído
          </Badge>
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
                    disabled
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
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Registrar Alimentação - {record.feeding_time}</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label>Quantidade Planejada</Label>
                          <Input
                            value={record.planned_amount.toFixed(1)}
                            disabled
                            className="bg-muted"
                          />
                        </div>
                        <div>
                          <Label>Quantidade Realizada (kg)</Label>
                          <Input
                            type="number"
                            step="0.1"
                            value={actualAmount}
                            onChange={(e) => setActualAmount(e.target.value)}
                            placeholder="Ex: 2.5"
                          />
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
                          <Button onClick={handleSaveFeeding}>
                            Salvar
                          </Button>
                          <Button 
                            variant="outline" 
                            onClick={() => {
                              setEditingRecord(null);
                              setActualAmount("");
                              setNotes("");
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