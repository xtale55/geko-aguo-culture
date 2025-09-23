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
import { getFeedItemsIncludingMixtures } from '@/lib/feedUtils';

interface FeedingRate {
  id?: string;
  weight_range_min: number;
  weight_range_max: number;
  feeding_percentage: number;
  meals_per_day: number;
  default_feed_type_id?: string;
  default_feed_type_name?: string;
}

interface FeedType {
  id: string;
  name: string;
  quantity: number;
  unit_price: number;
}

interface FeedingRateConfigProps {
  farmId: string;
  onRateUpdate: () => void;
}

export function FeedingRateConfig({ farmId, onRateUpdate }: FeedingRateConfigProps) {
  const [feedingRates, setFeedingRates] = useState<FeedingRate[]>([]);
  const [availableFeeds, setAvailableFeeds] = useState<FeedType[]>([]);
  const [editingRate, setEditingRate] = useState<FeedingRate | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    weight_range_min: '',
    weight_range_max: '',
    feeding_percentage: '',
    meals_per_day: '',
    default_feed_type_id: ''
  });
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    loadFeedingRates();
    loadAvailableFeeds();
  }, [farmId]);

  const loadAvailableFeeds = async () => {
    try {
      const data = await getFeedItemsIncludingMixtures(farmId);
      setAvailableFeeds(data);
    } catch (error: any) {
      console.error('Error loading available feeds:', error);
    }
  };

  const loadFeedingRates = async () => {
    try {
      const { data, error } = await supabase
        .from('feeding_rates')
        .select('*')
        .eq('farm_id', farmId)
        .is('pond_batch_id', null)
        .order('weight_range_min');

      if (error) throw error;
      setFeedingRates(data || []);
    } catch (error: any) {
      console.error('Error loading feeding rates:', error);
    }
  };

  const getCurrentRate = (weight: number) => {
    return feedingRates.find(rate => 
      weight >= rate.weight_range_min && weight <= rate.weight_range_max
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
      meals_per_day: rate.meals_per_day.toString(),
      default_feed_type_id: rate.default_feed_type_id || ''
    });
    setIsCreating(false);
  };

  const handleCreateRate = () => {
    setEditingRate(null);
    setFormData({
      weight_range_min: '',
      weight_range_max: '',
      feeding_percentage: '',
      meals_per_day: '',
      default_feed_type_id: ''
    });
    setIsCreating(true);
  };

  const handleSaveRate = async () => {
    try {
      // Validate all fields are filled
      if (!formData.weight_range_min || !formData.weight_range_max || 
          !formData.feeding_percentage || !formData.meals_per_day) {
        toast({
          variant: "destructive",
          title: "Erro de validação",
          description: "Todos os campos obrigatórios devem ser preenchidos"
        });
        return;
      }

      // Parse and validate numeric values
      const weightMin = parseFloat(formData.weight_range_min);
      const weightMax = parseFloat(formData.weight_range_max);
      const feedingPercentage = parseFloat(formData.feeding_percentage);
      const mealsPerDay = parseInt(formData.meals_per_day);

      if (isNaN(weightMin) || isNaN(weightMax) || isNaN(feedingPercentage) || isNaN(mealsPerDay)) {
        toast({
          variant: "destructive",
          title: "Erro de validação",
          description: "Por favor, insira valores numéricos válidos"
        });
        return;
      }

      if (weightMin >= weightMax) {
        toast({
          variant: "destructive",
          title: "Erro de validação",
          description: "O peso máximo deve ser maior que o peso mínimo"
        });
        return;
      }

      // Get selected feed details
      const selectedFeed = formData.default_feed_type_id ? 
        availableFeeds.find(feed => feed.id === formData.default_feed_type_id) : null;

      const rateData = {
        farm_id: farmId,
        pond_batch_id: null, // null for farm templates
        weight_range_min: weightMin,
        weight_range_max: weightMax,
        feeding_percentage: feedingPercentage,
        meals_per_day: mealsPerDay,
        default_feed_type_id: formData.default_feed_type_id || null,
        default_feed_type_name: selectedFeed?.name || null,
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
        title: "Padrão de alimentação salvo",
        description: "Configuração aplicada para toda a fazenda"
      });

      setEditingRate(null);
      setIsCreating(false);
      loadFeedingRates();
      loadAvailableFeeds();
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
        title: "Padrão removido",
        description: "Configuração removida da fazenda"
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

  const currentRate = getCurrentRate(5); // Show example for 5g shrimp

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Padrões da Fazenda
            </CardTitle>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" onClick={handleCreateRate}>
                <Plus className="w-3 h-3 mr-1" />
                Novo Padrão
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {isCreating ? 'Novo Padrão de Alimentação' : 'Editar Padrão de Alimentação'}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Peso Mínimo (g) *</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={formData.weight_range_min}
                      onChange={(e) => setFormData(prev => ({...prev, weight_range_min: e.target.value}))}
                      placeholder="Ex: 0"
                      required
                    />
                  </div>
                  <div>
                    <Label>Peso Máximo (g) *</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={formData.weight_range_max}
                      onChange={(e) => setFormData(prev => ({...prev, weight_range_max: e.target.value}))}
                      placeholder="Ex: 10"
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>% da Biomassa *</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={formData.feeding_percentage}
                      onChange={(e) => setFormData(prev => ({...prev, feeding_percentage: e.target.value}))}
                      placeholder="Ex: 5.0"
                      required
                    />
                  </div>
                  <div>
                    <Label>Refeições/Dia *</Label>
                    <Input
                      type="number"
                      min="1"
                      max="10"
                      value={formData.meals_per_day}
                      onChange={(e) => setFormData(prev => ({...prev, meals_per_day: e.target.value}))}
                      placeholder="Ex: 3"
                      required
                    />
                    </div>
                    <div>
                      <Label>Tipo de Ração Padrão</Label>
                      <select
                        className="w-full p-2 border border-border rounded-md bg-background"
                        value={formData.default_feed_type_id}
                        onChange={(e) => setFormData(prev => ({...prev, default_feed_type_id: e.target.value}))}
                      >
                        <option value="">Selecione o tipo de ração...</option>
                        {availableFeeds.map((feed) => (
                          <option key={feed.id} value={feed.id}>
                            {feed.name} - {feed.quantity}kg disponível
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-muted-foreground mt-1">
                        Tipo de ração que será pré-selecionado para animais nesta faixa de peso
                      </p>
                    </div>
                  </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={handleSaveRate}
                    disabled={!formData.weight_range_min || !formData.weight_range_max || 
                             !formData.feeding_percentage || !formData.meals_per_day}
                  >
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
        {/* Description */}
        <div className="bg-muted/50 rounded-lg p-3">
          <p className="text-sm text-muted-foreground">
            Configure padrões de alimentação para toda a fazenda. Estes padrões serão aplicados automaticamente 
            aos viveiros baseado no peso médio dos animais na última biometria.
          </p>
        </div>


        {/* Farm Templates List */}
        {feedingRates.length > 0 && (
          <div>
            <div className="text-sm font-medium mb-2">Padrões Configurados</div>
            <div className="space-y-2">
              {feedingRates.map((rate) => (
                <div key={rate.id} className="flex items-center justify-between p-2 border rounded">
                  <div className="text-sm">
                    <div className="font-medium">
                      {rate.weight_range_min}g - {rate.weight_range_max}g
                    </div>
                    <div className="text-muted-foreground">
                      {rate.feeding_percentage}% • {rate.meals_per_day}x/dia
                      {rate.default_feed_type_name && (
                        <span className="block text-xs">Ração: {rate.default_feed_type_name}</span>
                      )}
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
                          <DialogTitle>Editar Padrão de Alimentação</DialogTitle>
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
                           <div>
                             <Label>Tipo de Ração Padrão</Label>
                             <select
                               className="w-full p-2 border border-border rounded-md bg-background"
                               value={formData.default_feed_type_id}
                               onChange={(e) => setFormData(prev => ({...prev, default_feed_type_id: e.target.value}))}
                             >
                               <option value="">Selecione o tipo de ração...</option>
                               {availableFeeds.map((feed) => (
                                 <option key={feed.id} value={feed.id}>
                                   {feed.name} - {feed.quantity}kg disponível
                                 </option>
                               ))}
                             </select>
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