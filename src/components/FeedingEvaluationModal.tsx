import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, CheckCircle, XCircle, Clock, TrendingUp, TrendingDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useFeedingEvaluations } from '@/hooks/useFeedingEvaluations';
import { useFeedingBaseAmount } from '@/hooks/useFeedingBaseAmount';

interface FeedingEvaluationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feedingRecord: {
    id: string;
    pond_batch_id: string;
    planned_amount: number;
    actual_amount: number;
    feeding_date: string;
    feeding_time: string;
    pond_name?: string;
    batch_name?: string;
  };
  onEvaluationComplete?: () => void;
}

const consumptionOptions = [
  {
    value: 'consumed_all',
    label: 'Consumiu Tudo',
    description: 'Não sobrou nada, animais comeram toda a ração',
    icon: CheckCircle,
    color: 'text-green-600',
    bgColor: 'bg-green-50 border-green-200',
  },
  {
    value: 'left_little',
    label: 'Sobrou Pouco',
    description: 'Sobrou uma pequena quantidade (menos de 10%)',
    icon: Clock,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 border-blue-200',
  },
  {
    value: 'excess_leftover',
    label: 'Sobrou Bastante',
    description: 'Sobrou uma quantidade considerável (mais de 15%)',
    icon: XCircle,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50 border-orange-200',
  },
  {
    value: 'no_consumption',
    label: 'Não Comeu',
    description: 'Animais não se alimentaram ou consumo insignificante',
    icon: AlertTriangle,
    color: 'text-red-600',
    bgColor: 'bg-red-50 border-red-200',
  },
];

export function FeedingEvaluationModal({ 
  open, 
  onOpenChange, 
  feedingRecord, 
  onEvaluationComplete 
}: FeedingEvaluationModalProps) {
  const [amountOffered, setAmountOffered] = useState<string>('');
  const [selectedConsumption, setSelectedConsumption] = useState<string>('');
  const [leftoverPercentage, setLeftoverPercentage] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [suggestion, setSuggestion] = useState<any>(null);
  const { toast } = useToast();
  const { createEvaluation } = useFeedingEvaluations(feedingRecord?.pond_batch_id);
  const { baseAmount, updateBaseAmount } = useFeedingBaseAmount(feedingRecord?.pond_batch_id);

  const handleConsumptionSelect = async (value: string) => {
    setSelectedConsumption(value);
    
    // Calculate suggested leftover percentage based on selection
    const percentageMap: Record<string, number> = {
      'consumed_all': 0,
      'left_little': 5,
      'excess_leftover': 20,
      'no_consumption': 100,
    };
    
    setLeftoverPercentage(percentageMap[value] || 0);
    
    // Get adjustment suggestion based on amount offered
    if (amountOffered && parseInt(amountOffered) > 0) {
      try {
        const offeredGrams = parseInt(amountOffered);
        const { data, error } = await supabase.rpc('calculate_feeding_adjustment', {
          pond_batch_id_param: feedingRecord.pond_batch_id,
          current_amount: offeredGrams,
          consumption_eval: value,
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
        variant: 'destructive',
      });
      return;
    }

    if (!amountOffered || parseInt(amountOffered) <= 0) {
      toast({
        title: 'Erro',
        description: 'Informe a quantidade oferecida nesta alimentação',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSaving(true);
      
      const offeredGrams = parseInt(amountOffered);
      const adjustmentAmount = suggestion?.suggested_amount 
        ? suggestion.suggested_amount - offeredGrams 
        : 0;

      // Create independent evaluation
      const evaluation = await createEvaluation({
        pondBatchId: feedingRecord.pond_batch_id,
        amountOffered: offeredGrams,
        consumptionEvaluation: selectedConsumption,
        leftoverPercentage: selectedConsumption !== 'consumed_all' ? leftoverPercentage : 0,
        adjustmentAmount,
        adjustmentPercentage: suggestion?.adjustment_percentage || 0,
        notes: notes || undefined,
      });

      // Update base amount for next feeding
      const newBaseAmount = suggestion?.suggested_amount || offeredGrams;
      await updateBaseAmount({
        pondBatchId: feedingRecord.pond_batch_id,
        baseAmountPerMeal: newBaseAmount,
        lastEvaluationId: evaluation.id,
      });

      toast({
        title: 'Sucesso',
        description: `Avaliação salva! Próxima alimentação: ${(newBaseAmount / 1000).toFixed(2)}kg`,
      });

      onEvaluationComplete?.();
      onOpenChange(false);
      
      // Reset form
      setAmountOffered('');
      setSelectedConsumption('');
      setLeftoverPercentage(0);
      setNotes('');
      setSuggestion(null);
    } catch (error) {
      console.error('Erro ao salvar avaliação:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao registrar avaliação de consumo',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const selectedOption = consumptionOptions.find(opt => opt.value === selectedConsumption);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Avaliação de Consumo da Alimentação</DialogTitle>
          <DialogDescription>
            Como foi o consumo da ração oferecida? Esta avaliação ajudará o sistema a ajustar automaticamente as próximas alimentações.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Feeding Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Informações da Alimentação</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Viveiro:</span> {feedingRecord.pond_name}
                </div>
                <div>
                  <span className="font-medium">Lote:</span> {feedingRecord.batch_name}
                </div>
                <div>
                  <span className="font-medium">Data:</span> {new Date(feedingRecord.feeding_date).toLocaleDateString('pt-BR')}
                </div>
                <div>
                  <span className="font-medium">Horário:</span> {feedingRecord.feeding_time}
                </div>
                {baseAmount && (
                  <div className="col-span-2">
                    <span className="font-medium">Base atual:</span> {(baseAmount / 1000).toFixed(2)} kg
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Amount Offered Input */}
          <div className="space-y-2">
            <Label htmlFor="amount-offered" className="text-base font-medium">
              Quantidade oferecida nesta alimentação *
            </Label>
            <div className="flex gap-2">
              <Input
                id="amount-offered"
                type="number"
                placeholder="Quantidade em gramas (ex: 10000)"
                value={amountOffered}
                onChange={(e) => {
                  setAmountOffered(e.target.value);
                  // Recalculate suggestion when amount changes
                  if (selectedConsumption) {
                    handleConsumptionSelect(selectedConsumption);
                  }
                }}
                min="0"
                step="100"
                className="flex-1"
              />
              <div className="flex items-center px-3 bg-muted rounded-md text-sm text-muted-foreground">
                g
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Informe exatamente quantos gramas você colocou nesta alimentação específica (10kg = 10000g)
            </p>
          </div>

          {/* Consumption Evaluation */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Como foi o consumo?</Label>
            <div className="grid gap-3">
              {consumptionOptions.map((option) => {
                const Icon = option.icon;
                const isSelected = selectedConsumption === option.value;
                
                return (
                  <Card 
                    key={option.value}
                    className={`cursor-pointer transition-all ${
                      isSelected 
                        ? `${option.bgColor} border-2` 
                        : 'hover:bg-muted/50 border border-border'
                    }`}
                    onClick={() => handleConsumptionSelect(option.value)}
                  >
                    <CardContent className="flex items-start space-x-3 p-4">
                      <Icon className={`h-5 w-5 mt-0.5 ${option.color}`} />
                      <div className="flex-1">
                        <div className="font-medium">{option.label}</div>
                        <div className="text-sm text-muted-foreground">{option.description}</div>
                      </div>
                      {isSelected && (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Leftover Percentage */}
          {selectedConsumption && selectedConsumption !== 'consumed_all' && (
            <div className="space-y-2">
              <Label htmlFor="leftover">Percentual de Sobra Estimado (%)</Label>
              <Input
                id="leftover"
                type="number"
                min="0"
                max="100"
                value={leftoverPercentage}
                onChange={(e) => setLeftoverPercentage(Number(e.target.value))}
                placeholder="0"
              />
            </div>
          )}

          {/* Suggestion Display */}
          {suggestion && (
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center space-x-2">
                  <TrendingUp className="h-4 w-4" />
                  <span>Sugestão Automática</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {suggestion.should_suspend ? (
                  <div className="flex items-center space-x-2 text-red-600">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="font-medium">Recomendação: {suggestion.reason}</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span>Próxima quantidade sugerida:</span>
                      <Badge variant="outline" className="font-mono">
                        {(suggestion.suggested_amount / 1000).toFixed(1)} kg
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Ajuste:</span>
                      <Badge 
                        variant={suggestion.adjustment_percentage >= 0 ? "default" : "secondary"}
                        className="font-mono"
                      >
                        {suggestion.adjustment_percentage >= 0 ? '+' : ''}
                        {suggestion.adjustment_percentage.toFixed(1)}%
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{suggestion.reason}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Observações (opcional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Adicione observações sobre o comportamento dos animais, qualidade da ração, condições ambientais, etc."
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !selectedConsumption}
            >
              {saving ? 'Salvando...' : 'Salvar Avaliação'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}