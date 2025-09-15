import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { QuantityUtils } from '@/lib/quantityUtils';
import { AlertTriangle } from 'lucide-react';

interface StockAdjustmentModalProps {
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

const ADJUSTMENT_REASONS = [
  { value: 'deterioracao', label: '🔥 Perda por deterioração' },
  { value: 'vencimento', label: '⏰ Vencimento/validade' },
  { value: 'erro_contagem', label: '📦 Erro de contagem' },
  { value: 'transferencia', label: '🔄 Transferência entre fazendas' },
  { value: 'outros', label: '📝 Outros' },
];

export function StockAdjustmentModal({ isOpen, onClose, item, onSuccess }: StockAdjustmentModalProps) {
  const [newQuantity, setNewQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const currentQuantityKg = QuantityUtils.gramsToKg(item.currentStock);
  const newQuantityKg = parseFloat(newQuantity) || 0;
  const difference = newQuantityKg - currentQuantityKg;
  const isReduction = difference < 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newQuantity || !reason) {
      toast({
        title: "Erro",
        description: "Quantidade e motivo são obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    if (isNaN(newQuantityKg) || newQuantityKg < 0) {
      toast({
        title: "Erro",
        description: "Quantidade deve ser um número positivo válido.",
        variant: "destructive",
      });
      return;
    }

    if (reason === 'outros' && !notes.trim()) {
      toast({
        title: "Erro",
        description: "Para motivo 'Outros', é necessário especificar nas observações.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const newQuantityGrams = QuantityUtils.kgToGrams(newQuantityKg);
      const quantityChange = newQuantityGrams - item.currentStock;

      // Atualizar o estoque
      const { error: updateError } = await supabase
        .from('inventory')
        .update({
          quantity: newQuantityGrams,
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

      // Registrar movimento de ajuste
      const reasonLabel = ADJUSTMENT_REASONS.find(r => r.value === reason)?.label || reason;
      const movementNotes = `Ajuste de estoque - ${reasonLabel}${notes ? ` - ${notes}` : ''}`;

      const { error: movementError } = await supabase
        .from('inventory_movements')
        .insert({
          inventory_item_id: item.id,
          movement_type: 'ajuste',
          quantity_change: quantityChange,
          previous_quantity: item.currentStock,
          new_quantity: newQuantityGrams,
          reason: reasonLabel,
          notes: movementNotes,
          farm_id: inventoryData?.farm_id || '',
          created_by: (await supabase.auth.getUser()).data.user?.id || ''
        });

      if (movementError) throw movementError;

      toast({
        title: "Sucesso",
        description: `Estoque ajustado: ${isReduction ? '' : '+'}${difference.toFixed(1)}kg`,
      });

      onSuccess();
      onClose();
      
      // Reset form
      setNewQuantity('');
      setReason('');
      setNotes('');
    } catch (error: any) {
      console.error('Erro ao ajustar estoque:', error);
      toast({
        title: "Erro",
        description: "Erro ao ajustar estoque. Tente novamente.",
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
          <DialogTitle>Ajustar Estoque</DialogTitle>
          <DialogDescription>
            Ajustar quantidade em estoque de {item.name}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4">
            <div>
              <Label htmlFor="newQuantity">Nova Quantidade (kg) *</Label>
              <Input
                id="newQuantity"
                type="number"
                step="0.1"
                min="0"
                value={newQuantity}
                onChange={(e) => setNewQuantity(e.target.value)}
                placeholder={`Atual: ${currentQuantityKg.toFixed(1)}kg`}
                required
              />
            </div>
            
            <div>
              <Label htmlFor="reason">Motivo do Ajuste *</Label>
              <Select value={reason} onValueChange={setReason} required>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o motivo" />
                </SelectTrigger>
                <SelectContent>
                  {ADJUSTMENT_REASONS.map((reasonOption) => (
                    <SelectItem key={reasonOption.value} value={reasonOption.value}>
                      {reasonOption.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="notes">
                Observações {reason === 'outros' && <span className="text-destructive">*</span>}
              </Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Detalhes do ajuste..."
                rows={3}
                required={reason === 'outros'}
              />
            </div>
            
            {newQuantity && (
              <div className={`p-3 rounded-lg border ${
                isReduction ? 'bg-destructive/10 border-destructive' : 'bg-success/10 border-success'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  {isReduction && <AlertTriangle className="h-4 w-4 text-destructive" />}
                  <p className="text-sm font-medium">
                    {isReduction ? 'Redução de estoque' : 'Aumento de estoque'}
                  </p>
                </div>
                <p className="text-sm text-muted-foreground">
                  <strong>Atual:</strong> {currentQuantityKg.toFixed(1)}kg →{' '}
                  <strong>Novo:</strong> {newQuantityKg.toFixed(1)}kg
                </p>
                <p className="text-sm text-muted-foreground">
                  <strong>Diferença:</strong> {difference > 0 ? '+' : ''}{difference.toFixed(1)}kg
                </p>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting} variant={isReduction ? "destructive" : "default"}>
              {isSubmitting ? 'Ajustando...' : 'Confirmar Ajuste'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}