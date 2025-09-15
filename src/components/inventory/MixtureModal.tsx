import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus, FlaskConical, Calculator } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { QuantityUtils } from '@/lib/quantityUtils';

interface InventoryItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit_price: number;
}

interface MixtureIngredient {
  inventory_item_id: string;
  inventory_item_name: string;
  quantity_ratio: number;
  available_quantity: number;
  unit_price: number;
}

interface MixtureModalProps {
  isOpen: boolean;
  onClose: () => void;
  farmId: string;
  onSuccess: () => void;
}

export function MixtureModal({ isOpen, onClose, farmId, onSuccess }: MixtureModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [availableItems, setAvailableItems] = useState<InventoryItem[]>([]);
  
  // Form state
  const [recipeName, setRecipeName] = useState('');
  const [description, setDescription] = useState('');
  const [quantityToProduce, setQuantityToProduce] = useState('');
  const [ingredients, setIngredients] = useState<MixtureIngredient[]>([]);

  useEffect(() => {
    if (isOpen) {
      fetchAvailableItems();
    }
  }, [isOpen, farmId]);

  const fetchAvailableItems = async () => {
    try {
      const { data, error } = await supabase
        .from('inventory')
        .select('*')
        .eq('farm_id', farmId)
        .gt('quantity', 0)
        .order('name');

      if (error) throw error;
      setAvailableItems(data || []);
    } catch (error) {
      console.error('Error fetching items:', error);
      toast.error('Erro ao carregar itens do estoque');
    }
  };

  const addIngredient = () => {
    setIngredients([...ingredients, {
      inventory_item_id: '',
      inventory_item_name: '',
      quantity_ratio: 0,
      available_quantity: 0,
      unit_price: 0
    }]);
  };

  const removeIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const updateIngredient = (index: number, field: keyof MixtureIngredient, value: any) => {
    const updated = [...ingredients];
    updated[index] = { ...updated[index], [field]: value };
    
    // Se mudou o item, atualizar dados do item
    if (field === 'inventory_item_id') {
      const selectedItem = availableItems.find(item => item.id === value);
      if (selectedItem) {
        updated[index].inventory_item_name = selectedItem.name;
        updated[index].available_quantity = selectedItem.quantity;
        updated[index].unit_price = selectedItem.unit_price;
      }
    }
    
    setIngredients(updated);
  };

  const getTotalRatio = () => {
    return ingredients.reduce((sum, ing) => sum + (ing.quantity_ratio || 0), 0);
  };

  const calculateMixtureData = () => {
    const totalRatio = getTotalRatio();
    const produceGrams = QuantityUtils.parseInputToGrams(quantityToProduce);
    
    if (totalRatio !== 100 || !produceGrams) {
      return { canProduce: false, totalCost: 0, ingredientNeeds: [] };
    }

    let totalCost = 0;
    const ingredientNeeds = ingredients.map(ing => {
      const neededGrams = (produceGrams * ing.quantity_ratio) / 100;
      const cost = (neededGrams / 1000) * ing.unit_price;
      totalCost += cost;
      
      return {
        name: ing.inventory_item_name,
        needed: neededGrams,
        available: ing.available_quantity,
        sufficient: neededGrams <= ing.available_quantity,
        cost
      };
    });

    const canProduce = ingredientNeeds.every(need => need.sufficient);
    
    return { canProduce, totalCost, ingredientNeeds };
  };

  const handleSubmit = async () => {
    if (!recipeName.trim()) {
      toast.error('Nome da receita é obrigatório');
      return;
    }

    if (ingredients.length === 0) {
      toast.error('Adicione pelo menos um ingrediente');
      return;
    }

    if (getTotalRatio() !== 100) {
      toast.error('A soma das proporções deve ser exatamente 100%');
      return;
    }

    const { canProduce, totalCost, ingredientNeeds } = calculateMixtureData();
    
    if (!canProduce) {
      toast.error('Estoque insuficiente para produzir esta quantidade');
      return;
    }

    setLoading(true);

    try {
      // 1. Criar receita
      const { data: recipe, error: recipeError } = await supabase
        .from('mixture_recipes')
        .insert({
          farm_id: farmId,
          name: recipeName,
          description: description || null,
          total_yield_grams: QuantityUtils.parseInputToGrams(quantityToProduce),
          unit_cost: totalCost / QuantityUtils.gramsToKg(QuantityUtils.parseInputToGrams(quantityToProduce))
        })
        .select()
        .single();

      if (recipeError) throw recipeError;

      // 2. Criar ingredientes da receita
      const ingredientsData = ingredients.map(ing => ({
        recipe_id: recipe.id,
        inventory_item_id: ing.inventory_item_id,
        inventory_item_name: ing.inventory_item_name,
        quantity_ratio: ing.quantity_ratio
      }));

      const { error: ingredientsError } = await supabase
        .from('mixture_ingredients')
        .insert(ingredientsData);

      if (ingredientsError) throw ingredientsError;

      // 3. Deduzir ingredientes do estoque
      for (const need of ingredientNeeds) {
        const ingredient = ingredients.find(ing => ing.inventory_item_name === need.name);
        if (ingredient) {
          const newQuantity = ingredient.available_quantity - need.needed;
          
          await supabase
            .from('inventory')
            .update({ quantity: newQuantity })
            .eq('id', ingredient.inventory_item_id);
        }
      }

      // 4. Criar item de mistura no inventário
      const { error: inventoryError } = await supabase
        .from('inventory')
        .insert({
          farm_id: farmId,
          name: recipeName,
          category: 'Mistura',
          quantity: QuantityUtils.parseInputToGrams(quantityToProduce),
          unit_price: totalCost / QuantityUtils.gramsToKg(QuantityUtils.parseInputToGrams(quantityToProduce)),
          total_value: totalCost,
          entry_date: new Date().toISOString().split('T')[0]
        });

      if (inventoryError) throw inventoryError;

      toast.success('Mistura criada com sucesso!');
      resetForm();
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error creating mixture:', error);
      toast.error('Erro ao criar mistura');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setRecipeName('');
    setDescription('');
    setQuantityToProduce('');
    setIngredients([]);
  };

  const { canProduce, totalCost, ingredientNeeds } = calculateMixtureData();
  const totalRatio = getTotalRatio();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-primary" />
            Criar Nova Mistura
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-6">
          {/* Informações básicas */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="recipeName">Nome da Receita</Label>
              <Input
                id="recipeName"
                value={recipeName}
                onChange={(e) => setRecipeName(e.target.value)}
                placeholder="Ex: Ração + Probiótico Premium"
              />
            </div>
            <div>
              <Label htmlFor="quantity">Quantidade a Produzir (kg)</Label>
              <Input
                id="quantity"
                type="number"
                value={quantityToProduce}
                onChange={(e) => setQuantityToProduce(e.target.value)}
                placeholder="0.0"
                step="0.1"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="description">Descrição (opcional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva o propósito ou características desta mistura..."
              rows={2}
            />
          </div>

          {/* Ingredientes */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Ingredientes</h3>
              <Button onClick={addIngredient} size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Ingrediente
              </Button>
            </div>

            <div className="space-y-3">
              {ingredients.map((ingredient, index) => (
                <Card key={index}>
                  <CardContent className="p-4">
                    <div className="grid grid-cols-12 gap-3 items-end">
                      <div className="col-span-5">
                        <Label>Item do Estoque</Label>
                        <Select
                          value={ingredient.inventory_item_id}
                          onValueChange={(value) => updateIngredient(index, 'inventory_item_id', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecionar item" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableItems.map(item => (
                              <SelectItem key={item.id} value={item.id}>
                                {item.name} - {QuantityUtils.formatKg(item.quantity)}kg disponível
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="col-span-2">
                        <Label>Proporção (%)</Label>
                        <Input
                          type="number"
                          value={ingredient.quantity_ratio || ''}
                          onChange={(e) => updateIngredient(index, 'quantity_ratio', parseFloat(e.target.value) || 0)}
                          placeholder="0"
                          min="0"
                          max="100"
                          step="0.1"
                        />
                      </div>

                      {ingredient.inventory_item_name && (
                        <>
                          <div className="col-span-2">
                            <Label>Necessário</Label>
                            <div className="text-sm text-muted-foreground">
                              {quantityToProduce && ingredient.quantity_ratio ? 
                                QuantityUtils.formatKg((QuantityUtils.parseInputToGrams(quantityToProduce) * ingredient.quantity_ratio) / 100) + 'kg'
                                : '0kg'
                              }
                            </div>
                          </div>
                          
                          <div className="col-span-2">
                            <Label>Disponível</Label>
                            <div className="text-sm text-muted-foreground">
                              {QuantityUtils.formatKg(ingredient.available_quantity)}kg
                            </div>
                          </div>
                        </>
                      )}

                      <div className="col-span-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeIngredient(index)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {ingredients.length > 0 && (
              <div className="mt-4 p-3 bg-muted rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Total das Proporções:</span>
                  <Badge variant={totalRatio === 100 ? "default" : "destructive"}>
                    {totalRatio.toFixed(1)}%
                  </Badge>
                </div>
              </div>
            )}
          </div>

          {/* Preview da mistura */}
          {quantityToProduce && ingredients.length > 0 && totalRatio === 100 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="w-5 h-5" />
                  Preview da Mistura
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {ingredientNeeds.map((need, index) => (
                    <div key={index} className="flex justify-between items-center">
                      <span className="text-sm">{need.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm">
                          {QuantityUtils.formatKg(need.needed)}kg
                        </span>
                        <Badge variant={need.sufficient ? "default" : "destructive"}>
                          {need.sufficient ? "OK" : "Insuficiente"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                  
                  <div className="border-t pt-3 mt-3">
                    <div className="flex justify-between items-center font-semibold">
                      <span>Custo Total:</span>
                      <span>R$ {totalCost.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm text-muted-foreground">
                      <span>Custo por kg:</span>
                      <span>R$ {quantityToProduce ? (totalCost / parseFloat(quantityToProduce)).toFixed(2) : '0.00'}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={loading || !canProduce || totalRatio !== 100 || !recipeName.trim()}
          >
            {loading ? 'Criando...' : 'Criar Mistura'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}