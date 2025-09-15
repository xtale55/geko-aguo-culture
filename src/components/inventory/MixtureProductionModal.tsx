import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { QuantityUtils } from "@/lib/quantityUtils";
import { FlaskConical, AlertTriangle, Package } from "lucide-react";

interface InventoryItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit_price: number;
  farm_id: string;
}

interface MixtureRecipe {
  id: string;
  name: string;
  description: string;
  unit_cost: number;
}

interface MixtureIngredient {
  inventory_item_id: string;
  inventory_item_name: string;
  quantity_ratio: number;
}

interface IngredientCheck {
  name: string;
  needed: number;
  available: number;
  sufficient: boolean;
}

interface MixtureProductionModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: InventoryItem | null;
  onSuccess: () => void;
}

export function MixtureProductionModal({ isOpen, onClose, item, onSuccess }: MixtureProductionModalProps) {
  const [quantityToProduce, setQuantityToProduce] = useState('');
  const [loading, setLoading] = useState(false);
  const [recipe, setRecipe] = useState<MixtureRecipe | null>(null);
  const [ingredients, setIngredients] = useState<MixtureIngredient[]>([]);
  const [ingredientChecks, setIngredientChecks] = useState<IngredientCheck[]>([]);
  const [inventoryItems, setInventoryItems] = useState<{[key: string]: InventoryItem}>({});
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && item) {
      fetchRecipeAndIngredients();
    }
  }, [isOpen, item]);

  useEffect(() => {
    if (quantityToProduce && ingredients.length > 0) {
      checkIngredientAvailability();
    }
  }, [quantityToProduce, ingredients, inventoryItems]);

  const fetchRecipeAndIngredients = async () => {
    if (!item) return;

    try {
      // Buscar receita da mistura
      const { data: recipeData, error: recipeError } = await supabase
        .from('mixture_recipes')
        .select('*')
        .eq('name', item.name)
        .eq('farm_id', item.farm_id)
        .single();

      if (recipeError) {
        console.error('Error fetching recipe:', recipeError);
        toast({
          title: "Erro",
          description: "Receita não encontrada para esta mistura",
          variant: "destructive",
        });
        return;
      }

      setRecipe(recipeData);

      // Buscar ingredientes da receita
      const { data: ingredientsData, error: ingredientsError } = await supabase
        .from('mixture_ingredients')
        .select('*')
        .eq('recipe_id', recipeData.id);

      if (ingredientsError) {
        console.error('Error fetching ingredients:', ingredientsError);
        return;
      }

      setIngredients(ingredientsData || []);

      // Buscar itens do inventário
      const ingredientIds = ingredientsData?.map(ing => ing.inventory_item_id) || [];
      if (ingredientIds.length > 0) {
        const { data: inventoryData, error: inventoryError } = await supabase
          .from('inventory')
          .select('*')
          .in('id', ingredientIds);

        if (inventoryError) {
          console.error('Error fetching inventory:', inventoryError);
          return;
        }

        const inventoryMap = inventoryData?.reduce((acc, item) => {
          acc[item.id] = item;
          return acc;
        }, {} as {[key: string]: InventoryItem}) || {};
        
        setInventoryItems(inventoryMap);
      }
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar dados da receita",
        variant: "destructive",
      });
    }
  };

  const checkIngredientAvailability = () => {
    const produceGrams = QuantityUtils.parseInputToGrams(quantityToProduce);
    
    const checks = ingredients.map(ingredient => {
      const neededGrams = (produceGrams * ingredient.quantity_ratio) / 100;
      const inventoryItem = inventoryItems[ingredient.inventory_item_id];
      const availableGrams = inventoryItem?.quantity || 0;
      
      return {
        name: ingredient.inventory_item_name,
        needed: neededGrams,
        available: availableGrams,
        sufficient: neededGrams <= availableGrams
      };
    });

    setIngredientChecks(checks);
  };

  const canProduce = () => {
    if (!quantityToProduce || ingredientChecks.length === 0) return false;
    return ingredientChecks.every(check => check.sufficient);
  };

  const getMissingIngredients = () => {
    return ingredientChecks.filter(check => !check.sufficient);
  };

  const handleSubmit = async () => {
    if (!canProduce()) {
      toast({
        title: "Não é possível produzir",
        description: "Falta ingredientes no estoque",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const produceGrams = QuantityUtils.parseInputToGrams(quantityToProduce);
      
      // 1. Deduzir ingredientes do estoque
      for (const check of ingredientChecks) {
        const ingredient = ingredients.find(ing => ing.inventory_item_name === check.name);
        if (ingredient) {
          const inventoryItem = inventoryItems[ingredient.inventory_item_id];
          const newQuantity = inventoryItem.quantity - check.needed;
          
          await supabase
            .from('inventory')
            .update({ quantity: newQuantity })
            .eq('id', ingredient.inventory_item_id);
        }
      }

      // 2. Adicionar mistura produzida ao estoque
      const currentQuantity = item!.quantity;
      const newTotalQuantity = currentQuantity + produceGrams;
      const totalCost = recipe!.unit_cost * QuantityUtils.gramsToKg(produceGrams);
      
      // Calcular novo preço médio ponderado
      const currentValue = QuantityUtils.gramsToKg(currentQuantity) * item!.unit_price;
      const newValue = totalCost;
      const totalValue = currentValue + newValue;
      const newUnitPrice = totalValue / QuantityUtils.gramsToKg(newTotalQuantity);

      await supabase
        .from('inventory')
        .update({ 
          quantity: newTotalQuantity,
          unit_price: newUnitPrice,
          total_value: totalValue,
          entry_date: new Date().toISOString().split('T')[0]
        })
        .eq('id', item!.id);

      // 3. Registrar movimento no histórico
      await supabase
        .from('inventory_movements')
        .insert([{
          inventory_item_id: item!.id,
          movement_type: 'entrada',
          quantity_change: produceGrams,
          previous_quantity: currentQuantity,
          new_quantity: newTotalQuantity,
          reason: 'Produção de mistura',
          created_by: (await supabase.auth.getUser()).data.user?.id,
          farm_id: item!.farm_id,
          notes: `Produção: ${QuantityUtils.formatKg(produceGrams)}kg da receita ${recipe!.name}`
        }]);

      toast({
        title: "Mistura produzida",
        description: `${QuantityUtils.formatKg(produceGrams)}kg de ${item!.name} produzidos com sucesso.`,
      });

      onSuccess();
      onClose();
      setQuantityToProduce('');
    } catch (error: any) {
      console.error('Error producing mixture:', error);
      toast({
        title: "Erro ao produzir mistura",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onClose();
    setQuantityToProduce('');
    setIngredientChecks([]);
  };

  if (!item || !recipe) return null;

  const missingIngredients = getMissingIngredients();

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-primary" />
            Produzir Mistura - {item.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informações da receita */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Informações da Receita</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p><strong>Nome:</strong> {recipe.name}</p>
              {recipe.description && <p><strong>Descrição:</strong> {recipe.description}</p>}
              <p><strong>Custo por kg:</strong> R$ {recipe.unit_cost.toFixed(2)}</p>
              <p><strong>Estoque atual:</strong> {QuantityUtils.formatKg(item.quantity)}kg</p>
            </CardContent>
          </Card>

          {/* Quantidade a produzir */}
          <div>
            <Label htmlFor="quantity">Quantidade a Produzir (kg)</Label>
            <Input
              id="quantity"
              type="number"
              value={quantityToProduce}
              onChange={(e) => setQuantityToProduce(e.target.value)}
              placeholder="0.0"
              step="0.1"
              min="0"
            />
          </div>

          {/* Verificação de ingredientes */}
          {quantityToProduce && ingredientChecks.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  Verificação de Ingredientes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {ingredientChecks.map((check, index) => (
                    <div key={index} className="flex justify-between items-center p-3 border rounded-lg">
                      <div>
                        <p className="font-medium text-sm">{check.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Necessário: {QuantityUtils.formatKg(check.needed)}kg
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm">
                          Disponível: {QuantityUtils.formatKg(check.available)}kg
                        </p>
                        <Badge variant={check.sufficient ? "default" : "destructive"}>
                          {check.sufficient ? "OK" : "Insuficiente"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>

                {missingIngredients.length > 0 && (
                  <Alert className="mt-4">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Não é possível produzir:</strong> Faltam os seguintes ingredientes no estoque:
                      <ul className="mt-2 list-disc list-inside">
                        {missingIngredients.map((missing, index) => (
                          <li key={index} className="text-sm">
                            {missing.name}: faltam {QuantityUtils.formatKg(missing.needed - missing.available)}kg
                          </li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}

                {canProduce() && (
                  <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-800">
                      ✅ Todos os ingredientes estão disponíveis. Custo total: 
                      <strong> R$ {(recipe.unit_cost * parseFloat(quantityToProduce || '0')).toFixed(2)}</strong>
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={loading || !canProduce()}
          >
            {loading ? 'Produzindo...' : 'Produzir Mistura'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}