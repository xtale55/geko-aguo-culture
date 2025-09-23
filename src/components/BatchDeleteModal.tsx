import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Trash, Warning, X } from '@phosphor-icons/react';

interface BatchDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  batch: {
    id: string;
    name: string;
    pond_allocations: any[];
  } | null;
}

export function BatchDeleteModal({ isOpen, onClose, onSuccess, batch }: BatchDeleteModalProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleDelete = async () => {
    if (!batch) return;

    // Verificar se existem viveiros ativos
    const activePonds = batch.pond_allocations.filter(p => p.cycle_status === 'active');
    if (activePonds.length > 0) {
      toast.error('Não é possível excluir um lote com viveiros ativos. Finalize os ciclos primeiro.');
      return;
    }

    setIsLoading(true);

    try {
      // Buscar pond_batches relacionados ao lote
      const { data: pondBatchData, error: pondBatchError } = await supabase
        .from('pond_batches')
        .select('id, pond_id, cycle_status')
        .eq('batch_id', batch.id);

      if (pondBatchError) throw pondBatchError;

      // Verificar se há ciclos ativos
      const hasActiveRecords = pondBatchData?.some(record => record.cycle_status === 'active');
      if (hasActiveRecords) {
        toast.error('Não é possível excluir um lote com ciclos ativos.');
        return;
      }

      if (pondBatchData && pondBatchData.length > 0) {
        const pondBatchIds = pondBatchData.map(pb => pb.id);
        const pondIds = pondBatchData.map(pb => pb.pond_id);

        // 1. Deletar registros de despesca primeiro (harvest_records)
        await supabase
          .from('harvest_records')
          .delete()
          .in('pond_batch_id', pondBatchIds);

        // 2. Deletar outros registros dependentes
        await supabase
          .from('biometrics')
          .delete()
          .in('pond_batch_id', pondBatchIds);

        await supabase
          .from('feeding_records')
          .delete()
          .in('pond_batch_id', pondBatchIds);

        await supabase
          .from('input_applications')
          .delete()
          .in('pond_batch_id', pondBatchIds);

        await supabase
          .from('mortality_records')
          .delete()
          .in('pond_batch_id', pondBatchIds);

        await supabase
          .from('survival_adjustments')
          .delete()
          .in('pond_batch_id', pondBatchIds);

        await supabase
          .from('feeding_rates')
          .delete()
          .in('pond_batch_id', pondBatchIds);

        // 3. Atualizar status dos viveiros para 'free'
        await supabase
          .from('ponds')
          .update({ status: 'free' })
          .in('id', pondIds);

        // 4. Deletar pond_batches
        await supabase
          .from('pond_batches')
          .delete()
          .eq('batch_id', batch.id);
      }

      // 5. Finalmente, deletar o lote
      const { error: deleteError } = await supabase
        .from('batches')
        .delete()
        .eq('id', batch.id);

      if (deleteError) throw deleteError;

      toast.success('Lote excluído com sucesso!');
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Erro ao excluir lote:', error);
      toast.error('Erro ao excluir lote. Verifique se não há registros dependentes.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!batch) return null;

  const activePonds = batch.pond_allocations.filter(p => p.cycle_status === 'active');
  const canDelete = activePonds.length === 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <Trash className="h-5 w-5" />
            Excluir Lote
          </DialogTitle>
          <DialogDescription>
            Esta ação não pode ser desfeita.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-muted p-4 rounded-lg">
            <p className="font-medium">Lote: {batch.name}</p>
            <p className="text-sm text-muted-foreground">
              {batch.pond_allocations.length} viveiro(s) associado(s)
            </p>
          </div>

          {!canDelete && (
            <div className="bg-destructive/10 border border-destructive/20 p-4 rounded-lg">
              <div className="flex items-start gap-2">
                <Warning className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-destructive">Não é possível excluir</p>
                  <p className="text-sm text-destructive/80">
                    Este lote possui {activePonds.length} viveiro(s) com ciclo ativo. 
                    Finalize os ciclos antes de excluir o lote.
                  </p>
                </div>
              </div>
            </div>
          )}

          {canDelete && (
            <div className="bg-destructive/10 border border-destructive/20 p-4 rounded-lg">
              <div className="flex items-start gap-2">
                <Warning className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-destructive">Atenção!</p>
                  <p className="text-sm text-destructive/80">
                    Ao excluir este lote, todos os registros relacionados serão removidos permanentemente.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
            <X className="mr-2 h-4 w-4" />
            Cancelar
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleDelete} 
            disabled={isLoading || !canDelete}
          >
            <Trash className="mr-2 h-4 w-4" />
            {isLoading ? 'Excluindo...' : 'Excluir Lote'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}