import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { QuantityUtils } from "@/lib/quantityUtils";

interface InventoryItem {
  id: string;
  name: string;
  category: string;
  brand: string | null;
  supplier: string | null;
  quantity: number;
  unit_price: number;
  total_value: number;
  entry_date: string;
  farm_id: string;
}

interface NewPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: InventoryItem | null;
  onSuccess: () => void;
}

export function NewPurchaseModal({ isOpen, onClose, item, onSuccess }: NewPurchaseModalProps) {
  const [formData, setFormData] = useState({
    quantity: '',
    unit_price: '',
    entry_date: new Date().toISOString().split('T')[0]
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  if (!item) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Converter nova quantidade para gramas
      const newQuantityGrams = QuantityUtils.parseInputToGrams(formData.quantity);
      const newQuantityKg = QuantityUtils.gramsToKg(newQuantityGrams);
      const newUnitPrice = parseFloat(formData.unit_price);

      // Quantidade atual em kg para cálculo
      const currentQuantityKg = QuantityUtils.gramsToKg(item.quantity);

      // Cálculos de somatório e média ponderada
      const totalQuantityKg = currentQuantityKg + newQuantityKg;
      const totalQuantityGrams = QuantityUtils.kgToGrams(totalQuantityKg);
      
      // Média ponderada do preço
      const weightedAveragePrice = ((currentQuantityKg * item.unit_price) + (newQuantityKg * newUnitPrice)) / totalQuantityKg;
      
      // Valor total atualizado
      const newTotalValue = totalQuantityKg * weightedAveragePrice;

      // Atualizar item existente
      const { error } = await supabase
        .from('inventory')
        .update({
          quantity: totalQuantityGrams,
          unit_price: weightedAveragePrice,
          total_value: newTotalValue,
          entry_date: formData.entry_date
        })
        .eq('id', item.id);

      if (error) throw error;

      // Registrar movimento no histórico
      await supabase
        .from('inventory_movements')
        .insert([{
          inventory_item_id: item.id,
          movement_type: 'entrada',
          quantity_change: newQuantityGrams,
          previous_quantity: item.quantity,
          new_quantity: totalQuantityGrams,
          reason: 'Nova compra - Adição de estoque',
          created_by: (await supabase.auth.getUser()).data.user?.id,
          farm_id: item.farm_id,
          notes: `Compra: ${newQuantityKg}kg a R$ ${newUnitPrice.toFixed(2)}/kg`
        }]);

      toast({
        title: "Compra registrada",
        description: `${newQuantityKg}kg adicionados ao estoque. Novo total: ${totalQuantityKg.toFixed(2)}kg`,
      });

      onSuccess();
      onClose();
      setFormData({
        quantity: '',
        unit_price: '',
        entry_date: new Date().toISOString().split('T')[0]
      });
    } catch (error: any) {
      toast({
        title: "Erro ao registrar compra",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onClose();
    setFormData({
      quantity: '',
      unit_price: '',
      entry_date: new Date().toISOString().split('T')[0]
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nova Compra - {item.name}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Informações do item (readonly) */}
          <div className="bg-muted/50 p-3 rounded-lg">
            <div className="text-sm space-y-1">
              <p><strong>Categoria:</strong> {item.category}</p>
              <p><strong>Marca:</strong> {item.brand || "N/A"}</p>
              <p><strong>Fornecedor:</strong> {item.supplier || "N/A"}</p>
              <p><strong>Estoque atual:</strong> {QuantityUtils.formatKg(item.quantity)}kg</p>
              <p><strong>Preço atual:</strong> R$ {item.unit_price.toFixed(2)}/kg</p>
            </div>
          </div>

          {/* Campos editáveis */}
          <div>
            <Label htmlFor="quantity">Nova Quantidade (kg)</Label>
            <Input
              id="quantity"
              type="number"
              step="0.01"
              value={formData.quantity}
              onChange={(e) => setFormData({...formData, quantity: e.target.value})}
              required
              placeholder="Ex: 30"
            />
          </div>

          <div>
            <Label htmlFor="unit_price">Preço desta Compra (R$/kg)</Label>
            <Input
              id="unit_price"
              type="number"
              step="0.01"
              value={formData.unit_price}
              onChange={(e) => setFormData({...formData, unit_price: e.target.value})}
              required
              placeholder="Ex: 85.00"
            />
          </div>

          <div>
            <Label htmlFor="entry_date">Data da Compra</Label>
            <Input
              id="entry_date"
              type="date"
              value={formData.entry_date}
              onChange={(e) => setFormData({...formData, entry_date: e.target.value})}
              required
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Registrando..." : "Registrar Compra"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}