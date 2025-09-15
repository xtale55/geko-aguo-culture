import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { QuantityUtils } from '@/lib/quantityUtils';
import { AlertTriangle, CheckCircle } from 'lucide-react';

interface AlertConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: {
    id: string;
    name: string;
    category: string;
    currentStock: number;
    minimum_stock_threshold?: number;
  };
  onSuccess: () => void;
}

// Limites padrão por categoria (em gramas)
const CATEGORY_THRESHOLDS = {
  'Ração': QuantityUtils.kgToGrams(100),
  'Probióticos': QuantityUtils.kgToGrams(10),
  'Fertilizantes': QuantityUtils.kgToGrams(50),
  'Outros': QuantityUtils.kgToGrams(20)
};

export function AlertConfigModal({ isOpen, onClose, item, onSuccess }: AlertConfigModalProps) {
  const [useCustomThreshold, setUseCustomThreshold] = useState(false);
  const [customThreshold, setCustomThreshold] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const defaultThreshold = CATEGORY_THRESHOLDS[item.category as keyof typeof CATEGORY_THRESHOLDS] || CATEGORY_THRESHOLDS['Outros'];
  const currentThreshold = item.minimum_stock_threshold || defaultThreshold;

  useEffect(() => {
    if (item.minimum_stock_threshold) {
      setUseCustomThreshold(true);
      setCustomThreshold(QuantityUtils.gramsToKg(item.minimum_stock_threshold).toString());
    } else {
      setUseCustomThreshold(false);
      setCustomThreshold('');
    }
  }, [item.minimum_stock_threshold]);

  const getAlertStatus = () => {
    const thresholdToUse = useCustomThreshold && customThreshold ? 
      QuantityUtils.kgToGrams(parseFloat(customThreshold)) : 
      defaultThreshold;
    
    if (item.currentStock <= thresholdToUse) {
      return {
        isAlert: true,
        severity: item.currentStock <= thresholdToUse * 0.5 ? 'high' : 
                 item.currentStock <= thresholdToUse * 0.75 ? 'medium' : 'low',
        message: `Estoque abaixo do limite (${QuantityUtils.formatKg(thresholdToUse)}kg)`
      };
    }
    return {
      isAlert: false,
      message: `Estoque OK (limite: ${QuantityUtils.formatKg(thresholdToUse)}kg)`
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (useCustomThreshold && customThreshold) {
      const thresholdKg = parseFloat(customThreshold);
      if (isNaN(thresholdKg) || thresholdKg <= 0) {
        toast({
          title: "Erro",
          description: "Limite deve ser um número positivo válido.",
          variant: "destructive",
        });
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const thresholdGrams = useCustomThreshold && customThreshold ? 
        QuantityUtils.kgToGrams(parseFloat(customThreshold)) : 
        null;

      const { error } = await supabase
        .from('inventory')
        .update({
          minimum_stock_threshold: thresholdGrams,
          updated_at: new Date().toISOString()
        })
        .eq('id', item.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: useCustomThreshold ? 
          `Limite personalizado definido: ${customThreshold}kg` :
          "Usando limite padrão da categoria",
      });

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Erro ao atualizar configuração de alerta:', error);
      toast({
        title: "Erro",
        description: "Erro ao salvar configuração. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const alertStatus = getAlertStatus();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Configurar Alertas</DialogTitle>
          <DialogDescription>
            Definir limite mínimo de estoque para {item.name}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="useCustom">Usar limite personalizado</Label>
              <Switch
                id="useCustom"
                checked={useCustomThreshold}
                onCheckedChange={setUseCustomThreshold}
              />
            </div>
            
            {useCustomThreshold && (
              <div>
                <Label htmlFor="customThreshold">Limite Mínimo (kg)</Label>
                <Input
                  id="customThreshold"
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={customThreshold}
                  onChange={(e) => setCustomThreshold(e.target.value)}
                  placeholder="Ex: 25.0"
                />
              </div>
            )}
            
            <div className="space-y-2">
              <Label>Limite atual</Label>
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-sm">
                  <strong>Categoria "{item.category}":</strong> {QuantityUtils.formatKg(defaultThreshold)}kg (padrão)
                </p>
                {useCustomThreshold && customThreshold && (
                  <p className="text-sm text-primary">
                    <strong>Personalizado:</strong> {customThreshold}kg
                  </p>
                )}
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Preview do Alerta</Label>
              <div className={`p-3 rounded-lg border ${
                alertStatus.isAlert ? 'bg-destructive/10 border-destructive' : 'bg-success/10 border-success'
              }`}>
                <div className="flex items-center gap-2">
                  {alertStatus.isAlert ? (
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                  ) : (
                    <CheckCircle className="h-4 w-4 text-success" />
                  )}
                  <p className="text-sm">
                    <strong>Estoque atual:</strong> {QuantityUtils.formatKg(item.currentStock)}kg
                  </p>
                </div>
                <p className="text-sm mt-1 text-muted-foreground">
                  {alertStatus.message}
                </p>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Salvando...' : 'Salvar Configuração'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}