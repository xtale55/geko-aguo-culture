import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { PencilSimple, FloppyDisk, X } from '@phosphor-icons/react';

interface BatchEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  batch: {
    id: string;
    name: string;
    arrival_date: string;
    total_pl_quantity: number;
    pl_size: number;
    pl_cost: number;
    survival_rate: number;
  } | null;
}

export function BatchEditModal({ isOpen, onClose, onSuccess, batch }: BatchEditModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    arrival_date: '',
    total_pl_quantity: 0,
    pl_size: 0,
    pl_cost: 0,
    survival_rate: 85
  });

  useEffect(() => {
    if (batch) {
      setFormData({
        name: batch.name,
        arrival_date: batch.arrival_date,
        total_pl_quantity: batch.total_pl_quantity,
        pl_size: batch.pl_size,
        pl_cost: batch.pl_cost,
        survival_rate: batch.survival_rate
      });
    }
  }, [batch]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!batch) return;

    // Validações
    if (!formData.name.trim()) {
      toast.error('Nome do lote é obrigatório');
      return;
    }

    if (formData.total_pl_quantity <= 0) {
      toast.error('Quantidade inicial deve ser maior que zero');
      return;
    }

    if (formData.pl_size <= 0 || formData.pl_size > 999) {
      toast.error('PLs por grama deve estar entre 1 e 999');
      return;
    }

    if (formData.pl_cost <= 0) {
      toast.error('Custo por milheiro deve ser maior que zero');
      return;
    }

    if (formData.survival_rate <= 0 || formData.survival_rate > 100) {
      toast.error('Taxa de sobrevivência deve estar entre 0,1% e 100%');
      return;
    }

    setIsLoading(true);

    try {
      // Atualizar a tabela batches
      const { error: batchError } = await supabase
        .from('batches')
        .update({
          name: formData.name.trim(),
          arrival_date: formData.arrival_date,
          total_pl_quantity: formData.total_pl_quantity,
          pl_size: formData.pl_size,
          pl_cost: formData.pl_cost,
          survival_rate: formData.survival_rate
        })
        .eq('id', batch.id);

      if (batchError) throw batchError;

      // Atualizar a data de povoamento nos pond_batches se a data de chegada foi alterada
      if (formData.arrival_date !== batch.arrival_date) {
        const { error: pondBatchError } = await supabase
          .from('pond_batches')
          .update({
            stocking_date: formData.arrival_date
          })
          .eq('batch_id', batch.id);

        if (pondBatchError) throw pondBatchError;
      }

      toast.success('Lote atualizado com sucesso!');
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Erro ao atualizar lote:', error);
      if (error.code === '23505') {
        toast.error('Já existe um lote com este nome na fazenda');
      } else {
        toast.error('Erro ao atualizar lote');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!batch) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PencilSimple className="h-5 w-5" />
            Editar Lote
          </DialogTitle>
          <DialogDescription>
            Edite as informações do lote de pós-larvas
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Nome do Lote *</Label>
            <Input
              id="edit-name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Ex: Lote Janeiro 2024"
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-arrival-date">Data de Chegada *</Label>
            <Input
              id="edit-arrival-date"
              type="date"
              value={formData.arrival_date}
              onChange={(e) => setFormData(prev => ({ ...prev, arrival_date: e.target.value }))}
              disabled={isLoading}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-quantity">Quantidade Inicial *</Label>
              <Input
                id="edit-quantity"
                type="number"
                value={formData.total_pl_quantity || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, total_pl_quantity: parseInt(e.target.value) || 0 }))}
                placeholder="Ex: 50000"
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-size">PLs por Grama *</Label>
              <Input
                id="edit-size"
                type="number"
                min="1"
                max="999"
                value={formData.pl_size || ''}
                onChange={(e) => {
                  const value = parseFloat(e.target.value) || 0;
                  if (value <= 999) {
                    setFormData(prev => ({ ...prev, pl_size: value }));
                  }
                }}
                placeholder="Ex: 10"
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-cost">Custo por Milheiro (R$) *</Label>
              <Input
                id="edit-cost"
                type="number"
                step="0.01"
                value={formData.pl_cost || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, pl_cost: parseFloat(e.target.value) || 0 }))}
                placeholder="Ex: 80.00"
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-survival">Taxa de Sobrevivência (%) *</Label>
              <Input
                id="edit-survival"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={formData.survival_rate || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, survival_rate: parseFloat(e.target.value) || 0 }))}
                placeholder="Ex: 85.5"
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              <X className="mr-2 h-4 w-4" />
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              <FloppyDisk className="mr-2 h-4 w-4" />
              {isLoading ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}