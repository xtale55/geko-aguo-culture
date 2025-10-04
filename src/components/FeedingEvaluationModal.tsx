import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, CheckCircle, XCircle, Clock, TrendingUp, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useFeedingEvaluations } from '@/hooks/useFeedingEvaluations';
import { useFeedingBaseAmount } from '@/hooks/useFeedingBaseAmount';
interface FeedingEvaluationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pondBatchId: string;
  pondName: string;
  batchName: string;
  unevaluatedFeedings?: Array<{
    id: string;
    feeding_time: string;
    actual_amount: number;
    feeding_date: string;
    feed_type_name?: string;
  }>;
  onEvaluationComplete?: () => void;
}
const consumptionOptions = [{
  value: 'consumed_all',
  label: 'Consumiu Tudo',
  description: 'Não sobrou nada, animais comeram toda a ração',
  icon: CheckCircle,
  color: 'text-green-600',
  bgColor: 'bg-green-50 border-green-200'
}, {
  value: 'left_little',
  label: 'Sobrou Pouco',
  description: 'Sobrou uma pequena quantidade (menos de 10%)',
  icon: Clock,
  color: 'text-blue-600',
  bgColor: 'bg-blue-50 border-blue-200'
}, {
  value: 'excess_leftover',
  label: 'Sobrou Bastante',
  description: 'Sobrou uma quantidade considerável (mais de 15%)',
  icon: XCircle,
  color: 'text-orange-600',
  bgColor: 'bg-orange-50 border-orange-200'
}, {
  value: 'no_consumption',
  label: 'Não Comeu',
  description: 'Animais não se alimentaram ou consumo insignificante',
  icon: AlertTriangle,
  color: 'text-red-600',
  bgColor: 'bg-red-50 border-red-200'
}];
export function FeedingEvaluationModal({
  open,
  onOpenChange,
  pondBatchId,
  pondName,
  batchName,
  unevaluatedFeedings = [],
  onEvaluationComplete
}: FeedingEvaluationModalProps) {
  const [mode, setMode] = useState<'registered' | 'manual'>(unevaluatedFeedings.length > 0 ? 'registered' : 'manual');
  const [selectedFeedingId, setSelectedFeedingId] = useState<string>('');
  const [manualDate, setManualDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [manualTime, setManualTime] = useState<string>('');
  const [amountOffered, setAmountOffered] = useState<string>('');
  const [selectedConsumption, setSelectedConsumption] = useState<string>('');
  const [leftoverPercentage, setLeftoverPercentage] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [suggestion, setSuggestion] = useState<any>(null);
  const {
    toast
  } = useToast();
  const {
    createEvaluation
  } = useFeedingEvaluations(pondBatchId);
  const {
    baseAmount,
    updateBaseAmount
  } = useFeedingBaseAmount(pondBatchId);

  // Reset form when opening
  useEffect(() => {
    if (open) {
      console.log('🔄 FeedingEvaluationModal opened - unevaluatedFeedings count:', unevaluatedFeedings.length);
      console.log('📋 Unevaluated feedings:', unevaluatedFeedings);
      if (unevaluatedFeedings.length === 0) {
        console.log('⚠️ Nenhuma alimentação não avaliada encontrada - usando modo manual');
      }
      setMode(unevaluatedFeedings.length > 0 ? 'registered' : 'manual');
      setSelectedFeedingId('');
      setManualDate(new Date().toISOString().split('T')[0]);
      setManualTime('');
      setAmountOffered('');
      setSelectedConsumption('');
      setLeftoverPercentage(0);
      setNotes('');
      setSuggestion(null);
    }
  }, [open, unevaluatedFeedings.length]);

  // Auto-fill amount when selecting a registered feeding
  useEffect(() => {
    if (mode === 'registered' && selectedFeedingId) {
      const feeding = unevaluatedFeedings.find(f => f.id === selectedFeedingId);
      if (feeding) {
        setAmountOffered((feeding.actual_amount / 1000).toFixed(2));
      }
    }
  }, [selectedFeedingId, mode, unevaluatedFeedings]);
  const handleConsumptionSelect = async (value: string) => {
    setSelectedConsumption(value);
    const percentageMap: Record<string, number> = {
      'consumed_all': 0,
      'left_little': 5,
      'excess_leftover': 20,
      'no_consumption': 100
    };
    setLeftoverPercentage(percentageMap[value] || 0);
    if (amountOffered && parseFloat(amountOffered) > 0) {
      try {
        const offeredGrams = Math.round(parseFloat(amountOffered) * 1000);
        const {
          data,
          error
        } = await supabase.rpc('calculate_feeding_adjustment', {
          pond_batch_id_param: pondBatchId,
          current_amount: offeredGrams,
          consumption_eval: value
        });
        if (error) throw error;
        if (data && data.length > 0) {
          setSuggestion(data[0]);
        }
      } catch (error) {
        console.error('Erro ao calcular sugestão:', error);
      }
    }
  };
  const handleSave = async () => {
    if (!selectedConsumption) {
      toast({
        title: 'Erro',
        description: 'Selecione o tipo de consumo observado',
        variant: 'destructive'
      });
      return;
    }
    if (!amountOffered || parseFloat(amountOffered) <= 0) {
      toast({
        title: 'Erro',
        description: 'Informe a quantidade oferecida',
        variant: 'destructive'
      });
      return;
    }
    if (mode === 'manual' && !manualTime) {
      toast({
        title: 'Erro',
        description: 'Informe o horário da alimentação',
        variant: 'destructive'
      });
      return;
    }
    try {
      setSaving(true);
      const offeredGrams = Math.round(parseFloat(amountOffered) * 1000);
      const adjustmentAmount = suggestion?.suggested_amount ? suggestion.suggested_amount - offeredGrams : 0;
      if (mode === 'registered' && selectedFeedingId) {
        // Mode 1: Update existing feeding_record with evaluation
        const {
          error: updateError
        } = await supabase.from('feeding_records').update({
          consumption_evaluation: selectedConsumption,
          leftover_percentage: selectedConsumption !== 'consumed_all' ? leftoverPercentage : 0,
          next_feeding_adjustment: suggestion?.adjustment_percentage || 0,
          adjustment_reason: suggestion?.reason || '',
          evaluation_time: new Date().toISOString(),
          notes: notes || null
        }).eq('id', selectedFeedingId);
        if (updateError) throw updateError;

        // Create evaluation record
        await createEvaluation({
          pondBatchId,
          amountOffered: offeredGrams,
          consumptionEvaluation: selectedConsumption,
          leftoverPercentage: selectedConsumption !== 'consumed_all' ? leftoverPercentage : 0,
          adjustmentAmount,
          adjustmentPercentage: suggestion?.adjustment_percentage || 0,
          notes: notes || undefined
        });
      } else {
        // Mode 2: Create new feeding_record + evaluation
        const {
          data: newFeeding,
          error: feedingError
        } = await supabase.from('feeding_records').insert({
          pond_batch_id: pondBatchId,
          feeding_date: manualDate,
          feeding_time: manualTime,
          planned_amount: offeredGrams,
          actual_amount: offeredGrams,
          feeding_rate_percentage: 0,
          consumption_evaluation: selectedConsumption,
          leftover_percentage: selectedConsumption !== 'consumed_all' ? leftoverPercentage : 0,
          next_feeding_adjustment: suggestion?.adjustment_percentage || 0,
          adjustment_reason: suggestion?.reason || '',
          evaluation_time: new Date().toISOString(),
          notes: notes || null
        }).select().single();
        if (feedingError) throw feedingError;

        // Create evaluation record
        await createEvaluation({
          pondBatchId,
          amountOffered: offeredGrams,
          consumptionEvaluation: selectedConsumption,
          leftoverPercentage: selectedConsumption !== 'consumed_all' ? leftoverPercentage : 0,
          adjustmentAmount,
          adjustmentPercentage: suggestion?.adjustment_percentage || 0,
          notes: notes || undefined
        });
      }

      // Update base amount for next feeding
      const newBaseAmount = suggestion?.suggested_amount || offeredGrams;
      await updateBaseAmount({
        pondBatchId,
        baseAmountPerMeal: newBaseAmount
      });
      toast({
        title: 'Sucesso',
        description: `Avaliação salva! Próxima alimentação: ${(newBaseAmount / 1000).toFixed(2)}kg`
      });
      onEvaluationComplete?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Erro ao salvar avaliação:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao registrar avaliação de consumo',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };
  const selectedFeeding = unevaluatedFeedings.find(f => f.id === selectedFeedingId);
  return <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Avaliação de Consumo da Alimentação</DialogTitle>
          <DialogDescription>
            {pondName} - {batchName}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={mode} onValueChange={v => setMode(v as 'registered' | 'manual')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="registered" disabled={unevaluatedFeedings.length === 0}>
              <FileText className="mr-2 h-4 w-4" />
              Alimentação Registrada
            </TabsTrigger>
            <TabsTrigger value="manual">
              <Clock className="mr-2 h-4 w-4" />
              Registro Manual
            </TabsTrigger>
          </TabsList>

          <TabsContent value="registered" className="space-y-6">
            {unevaluatedFeedings.length === 0 ? <Card>
                <CardContent className="p-6 text-center text-muted-foreground">
                  Nenhuma alimentação registrada hoje aguardando avaliação.
                </CardContent>
              </Card> : <>
                <div className="space-y-2">
                  <Label>Selecione a alimentação</Label>
                  <Select value={selectedFeedingId} onValueChange={setSelectedFeedingId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Escolha qual alimentação avaliar" />
                    </SelectTrigger>
                    <SelectContent>
                      {unevaluatedFeedings.map(feeding => <SelectItem key={feeding.id} value={feeding.id}>
                          {feeding.feeding_time.substring(0, 5)} - {(feeding.actual_amount / 1000).toFixed(2)}kg
                          {feeding.feed_type_name && ` - ${feeding.feed_type_name}`}
                        </SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {selectedFeeding && <Card className="bg-muted/50">
                    <CardContent className="pt-4 space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Horário:</span>
                        <span className="font-medium">{selectedFeeding.feeding_time.substring(0, 5)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Quantidade:</span>
                        <span className="font-medium">{(selectedFeeding.actual_amount / 1000).toFixed(2)} kg</span>
                      </div>
                      {selectedFeeding.feed_type_name && <div className="flex justify-between">
                          <span className="text-muted-foreground">Tipo de ração:</span>
                          <span className="font-medium">{selectedFeeding.feed_type_name}</span>
                        </div>}
                    </CardContent>
                  </Card>}
              </>}
          </TabsContent>

          <TabsContent value="manual" className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="manual-date">Data da Alimentação</Label>
                <Input id="manual-date" type="date" value={manualDate} onChange={e => setManualDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="manual-time">Horário *</Label>
                
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="manual-amount">Quantidade Oferecida (kg) *</Label>
              <Input id="manual-amount" type="number" step="0.01" min="0" placeholder="Ex: 10.5" value={amountOffered} onChange={e => {
              setAmountOffered(e.target.value);
              if (selectedConsumption) {
                handleConsumptionSelect(selectedConsumption);
              }
            }} />
            </div>
          </TabsContent>
        </Tabs>

        {/* Consumption Evaluation - shown for both modes */}
        {(mode === 'registered' && selectedFeedingId || mode === 'manual' && amountOffered) && <div className="space-y-6">
            <div className="space-y-3">
              <Label className="text-base font-medium">Como foi o consumo?</Label>
              <div className="grid gap-3">
                {consumptionOptions.map(option => {
              const Icon = option.icon;
              const isSelected = selectedConsumption === option.value;
              return <Card key={option.value} className={`cursor-pointer transition-all ${isSelected ? `${option.bgColor} border-2` : 'hover:bg-muted/50 border border-border'}`} onClick={() => handleConsumptionSelect(option.value)}>
                      <CardContent className="flex items-start space-x-3 p-4">
                        <Icon className={`h-5 w-5 mt-0.5 ${option.color}`} />
                        <div className="flex-1">
                          <div className="font-medium">{option.label}</div>
                          <div className="text-sm text-muted-foreground">{option.description}</div>
                        </div>
                        {isSelected && <CheckCircle className="h-5 w-5 text-green-600" />}
                      </CardContent>
                    </Card>;
            })}
              </div>
            </div>

            {selectedConsumption && selectedConsumption !== 'consumed_all' && <div className="space-y-2">
                <Label htmlFor="leftover">Percentual de Sobra Estimado (%)</Label>
                <Input id="leftover" type="number" min="0" max="100" value={leftoverPercentage} onChange={e => setLeftoverPercentage(Number(e.target.value))} />
              </div>}

            {suggestion && <Card className="border-primary/20 bg-primary/5">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center space-x-2">
                    <TrendingUp className="h-4 w-4" />
                    <span>Sugestão Automática</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {suggestion.should_suspend ? <div className="flex items-center space-x-2 text-red-600">
                      <AlertTriangle className="h-4 w-4" />
                      <span className="font-medium">{suggestion.reason}</span>
                    </div> : <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span>Próxima quantidade sugerida:</span>
                        <Badge variant="outline" className="font-mono">
                          {(suggestion.suggested_amount / 1000).toFixed(1)} kg
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Ajuste:</span>
                        <Badge variant={suggestion.adjustment_percentage >= 0 ? "default" : "secondary"} className="font-mono">
                          {suggestion.adjustment_percentage >= 0 ? '+' : ''}
                          {suggestion.adjustment_percentage.toFixed(1)}%
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{suggestion.reason}</p>
                    </div>}
                </CardContent>
              </Card>}

            <div className="space-y-2">
              <Label htmlFor="notes">Observações (opcional)</Label>
              <Textarea id="notes" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Adicione observações sobre comportamento, qualidade da ração, condições ambientais..." rows={3} />
            </div>
          </div>}

        <div className="flex justify-end space-x-3 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving || !selectedConsumption || mode === 'registered' && !selectedFeedingId || mode === 'manual' && (!manualTime || !amountOffered)}>
            {saving ? 'Salvando...' : 'Salvar Avaliação'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>;
}