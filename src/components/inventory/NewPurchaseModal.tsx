import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { QuantityUtils } from '@/lib/quantityUtils';

interface NewPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: {
    id: string;
    name: string;
    category: string;
    currentStock: number;
  };
  onSuccess: () => void;
}

export function NewPurchaseModal({ isOpen, onClose, item, onSuccess }: NewPurchaseModalProps) {
  const [quantity, setQuantity] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [supplier, setSupplier] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!quantity || !unitPrice) {
      toast({
        title: "Erro",
        description: "Quantidade e preço unitário são obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    const quantityKg = parseFloat(quantity);
    const unitPriceValue = parseFloat(unitPrice);
    
    if (isNaN(quantityKg) || quantityKg <= 0 || isNaN(unitPriceValue) || unitPriceValue <= 0) {
      toast({
        title: "Erro",
        description: "Valores devem ser números positivos válidos.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Converter para gramas
      const quantityGrams = QuantityUtils.kgToGrams(quantityKg);
      const newTotalQuantity = item.currentStock + quantityGrams;
      const totalCost = quantityKg * unitPriceValue;

      // Atualizar o estoque
      const { error: updateError } = await supabase
        .from('inventory')
        .update({
          quantity: newTotalQuantity,
          unit_price: unitPriceValue, // Atualizar com o preço mais recente
          total_value: (newTotalQuantity / 1000) * unitPriceValue,
          supplier: supplier || undefined,
          updated_at: new Date().toISOString()
        })
        .eq('id', item.id);

      if (updateError) throw updateError;

      // Buscar farm_id e user_id
      const { data: inventoryData } = await supabase
        .from('inventory')
        .select('farm_id')
        .eq('id', item.id)
        .single();

      // Registrar movimento de entrada
      const { error: movementError } = await supabase
        .from('inventory_movements')
        .insert({
          inventory_item_id: item.id,
          movement_type: 'entrada',
          quantity_change: quantityGrams,
          previous_quantity: item.currentStock,
          new_quantity: newTotalQuantity,
          reason: 'Nova compra',
          notes: notes || `Compra de ${quantityKg}kg a R$${unitPriceValue.toFixed(2)}/kg${supplier ? ` - Fornecedor: ${supplier}` : ''}`,
          farm_id: inventoryData?.farm_id || '',
          created_by: (await supabase.auth.getUser()).data.user?.id || ''
        });

      if (movementError) throw movementError;

      toast({
        title: "Sucesso",
        description: `Nova compra registrada: +${quantityKg}kg de ${item.name}`,
      });

      onSuccess();
      onClose();
      
      // Reset form
      setQuantity('');
      setUnitPrice('');
      setSupplier('');
      setNotes('');
    } catch (error: any) {
      console.error('Erro ao registrar nova compra:', error);
      toast({
        title: "Erro",
        description: "Erro ao registrar nova compra. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Nova Compra</DialogTitle>
          <DialogDescription>
            Registrar nova compra de {item.name}. O estoque será somado ao existente.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4">
            <div>
              <Label htmlFor="quantity">Quantidade (kg) *</Label>
              <Input
                id="quantity"
                type="number"
                step="0.1"
                min="0.1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="Ex: 25.5"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="unitPrice">Preço Unitário (R$/kg) *</Label>
              <Input
                id="unitPrice"
                type="number"
                step="0.01"
                min="0.01"
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
                placeholder="Ex: 12.50"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="supplier">Fornecedor</Label>
              <Input
                id="supplier"
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                placeholder="Nome do fornecedor (opcional)"
              />
            </div>
            
            <div>
              <Label htmlFor="notes">Observações</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Observações sobre a compra (opcional)"
                rows={3}
              />
            </div>
            
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">
                <strong>Estoque atual:</strong> {QuantityUtils.formatKg(item.currentStock)}kg
              </p>
              {quantity && (
                <p className="text-sm text-muted-foreground">
                  <strong>Novo estoque:</strong> {QuantityUtils.formatKg(item.currentStock + QuantityUtils.kgToGrams(parseFloat(quantity) || 0))}kg
                </p>
              )}
              {quantity && unitPrice && (
                <p className="text-sm text-muted-foreground">
                  <strong>Custo total:</strong> R$ {((parseFloat(quantity) || 0) * (parseFloat(unitPrice) || 0)).toFixed(2)}
                </p>
              )}
            </div>
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Registrando...' : 'Registrar Compra'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}