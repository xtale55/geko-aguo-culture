import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Settings, Edit2, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

interface FeedingRate {
  id?: string;
  weight_range_min: number;
  weight_range_max: number;
  feeding_percentage: number;
  meals_per_day: number;
}

interface FeedingRateConfigProps {
  pondBatchId: string;
  currentWeight: number;
  onRateUpdate: () => void;
}

export function FeedingRateConfig({ pondBatchId, currentWeight, onRateUpdate }: FeedingRateConfigProps) {
  const [feedingRates, setFeedingRates] = useState<FeedingRate[]>([]);
  const [editingRate, setEditingRate] = useState<FeedingRate | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    weight_range_min: '',
    weight_range_max: '',
    feeding_percentage: '',
    meals_per_day: ''
  });
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    loadFeedingRates();
  }, [pondBatchId]);

  const loadFeedingRates = async () => {
    try {
      const { data, error } = await supabase
        .from('feeding_rates')
        .select('*')
        .eq('pond_batch_id', pondBatchId)
        .order('weight_range_min');

      if (error) throw error;
      setFeedingRates(data || []);
    } catch (error: any) {
      console.error('Error loading feeding rates:', error);
    }
  };

  const getCurrentRate = () => {
    return feedingRates.find(rate => 
      currentWeight >= rate.weight_range_min && currentWeight <= rate.weight_range_max
    );
  };

  const getDefaultRate = (weight: number): FeedingRate => {
    // Default feeding rates based on weight
    if (weight < 1) return { weight_range_min: 0, weight_range_max: 1, feeding_percentage: 8, meals_per_day: 5 };
    if (weight < 3) return { weight_range_min: 1, weight_range_max: 3, feeding_percentage: 6, meals_per_day: 4 };
    if (weight < 5) return { weight_range_min: 3, weight_range_max: 5, feeding_percentage: 5, meals_per_day: 4 };
    if (weight < 10) return { weight_range_min: 5, weight_range_max: 10, feeding_percentage: 4, meals_per_day: 3 };
    if (weight < 15) return { weight_range_min: 10, weight_range_max: 15, feeding_percentage: 3.5, meals_per_day: 3 };
    return { weight_range_min: 15, weight_range_max: 1000, feeding_percentage: 3, meals_per_day: 2 };
  };

  const handleEditRate = (rate: FeedingRate) => {
    setEditingRate(rate);
    setFormData({
      weight_range_min: rate.weight_range_min.toString(),
      weight_range_max: rate.weight_range_max.toString(),
      feeding_percentage: rate.feeding_percentage.toString(),
      meals_per_day: rate.meals_per_day.toString()
    });
    setIsCreating(false);
  };

  const handleCreateRate = () => {
    setEditingRate(null);
    setFormData({
      weight_range_min: '',
      weight_range_max: '',
      feeding_percentage: '',
      meals_per_day: ''
    });
    setIsCreating(true);
  };

  const handleSaveRate = async () => {
    try {
      const rateData = {
        pond_batch_id: pondBatchId,
        weight_range_min: parseFloat(formData.weight_range_min),
        weight_range_max: parseFloat(formData.weight_range_max),
        feeding_percentage: parseFloat(formData.feeding_percentage),
        meals_per_day: parseInt(formData.meals_per_day),
        created_by: user?.id
      };

      if (editingRate?.id) {
        // Update existing rate
        const { error } = await supabase
          .from('feeding_rates')
          .update(rateData)
          .eq('id', editingRate.id);

        if (error) throw error;
      } else {
        // Create new rate
        const { error } = await supabase
          .from('feeding_rates')
          .insert([rateData]);

        if (error) throw error;
      }

      toast({
        title: "Taxa de alimentação salva",
        description: "Configuração atualizada com sucesso"
      });

      setEditingRate(null);
      setIsCreating(false);
      loadFeedingRates();
      onRateUpdate();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message
      });
    }
  };

  const handleDeleteRate = async (rateId: string) => {
    try {
      const { error } = await supabase
        .from('feeding_rates')
        .delete()
        .eq('id', rateId);

      if (error) throw error;

      toast({
        title: "Taxa removida",
        description: "Configuração removida com sucesso"
      });

      loadFeedingRates();
      onRateUpdate();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message
      });
    }
  };

  const currentRate = getCurrentRate() || getDefaultRate(currentWeight);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Configuração de Alimentação
          </CardTitle>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" onClick={handleCreateRate}>
                <Plus className="w-3 h-3 mr-1" />
                Nova Taxa
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {isCreating ? 'Nova Taxa de Alimentação' : 'Editar Taxa de Alimentação'}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Peso Mínimo (g)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={formData.weight_range_min}
                      onChange={(e) => setFormData(prev => ({...prev, weight_range_min: e.target.value}))}
                    />
                  </div>
                  <div>
                    <Label>Peso Máximo (g)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={formData.weight_range_max}
                      onChange={(e) => setFormData(prev => ({...prev, weight_range_max: e.target.value}))}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>% da Biomassa</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={formData.feeding_percentage}
                      onChange={(e) => setFormData(prev => ({...prev, feeding_percentage: e.target.value}))}
                    />
                  </div>
                  <div>
                    <Label>Refeições/Dia</Label>
                    <Input
                      type="number"
                      value={formData.meals_per_day}
                      onChange={(e) => setFormData(prev => ({...prev, meals_per_day: e.target.value}))}
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSaveRate}>
                    Salvar
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setEditingRate(null);
                      setIsCreating(false);
                    }}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Rate Display */}
        <div className="bg-primary/10 rounded-lg p-3">
          <div className="text-sm font-medium mb-2">Taxa Atual (Peso: {currentWeight}g)</div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">% da Biomassa:</span>
              <span className="font-medium ml-1">{currentRate.feeding_percentage}%</span>
            </div>
            <div>
              <span className="text-muted-foreground">Refeições/Dia:</span>
              <span className="font-medium ml-1">{currentRate.meals_per_day}</span>
            </div>
          </div>
          {!getCurrentRate() && (
            <Badge variant="outline" className="mt-2">
              Taxa padrão
            </Badge>
          )}
        </div>

        {/* Custom Rates List */}
        {feedingRates.length > 0 && (
          <div>
            <div className="text-sm font-medium mb-2">Taxas Personalizadas</div>
            <div className="space-y-2">
              {feedingRates.map((rate) => (
                <div key={rate.id} className="flex items-center justify-between p-2 border rounded">
                  <div className="text-sm">
                    <div className="font-medium">
                      {rate.weight_range_min}g - {rate.weight_range_max}g
                    </div>
                    <div className="text-muted-foreground">
                      {rate.feeding_percentage}% • {rate.meals_per_day}x/dia
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleEditRate(rate)}
                        >
                          <Edit2 className="w-3 h-3" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Editar Taxa de Alimentação</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label>Peso Mínimo (g)</Label>
                              <Input
                                type="number"
                                step="0.1"
                                value={formData.weight_range_min}
                                onChange={(e) => setFormData(prev => ({...prev, weight_range_min: e.target.value}))}
                              />
                            </div>
                            <div>
                              <Label>Peso Máximo (g)</Label>
                              <Input
                                type="number"
                                step="0.1"
                                value={formData.weight_range_max}
                                onChange={(e) => setFormData(prev => ({...prev, weight_range_max: e.target.value}))}
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label>% da Biomassa</Label>
                              <Input
                                type="number"
                                step="0.1"
                                value={formData.feeding_percentage}
                                onChange={(e) => setFormData(prev => ({...prev, feeding_percentage: e.target.value}))}
                              />
                            </div>
                            <div>
                              <Label>Refeições/Dia</Label>
                              <Input
                                type="number"
                                value={formData.meals_per_day}
                                onChange={(e) => setFormData(prev => ({...prev, meals_per_day: e.target.value}))}
                              />
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button onClick={handleSaveRate}>
                              Salvar
                            </Button>
                            <Button 
                              variant="outline" 
                              onClick={() => setEditingRate(null)}
                            >
                              Cancelar
                            </Button>
                            {rate.id && (
                              <Button 
                                variant="destructive" 
                                onClick={() => handleDeleteRate(rate.id!)}
                              >
                                Excluir
                              </Button>
                            )}
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}