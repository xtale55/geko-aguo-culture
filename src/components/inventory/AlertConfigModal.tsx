import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { QuantityUtils } from "@/lib/quantityUtils";
import { AlertTriangle } from "lucide-react";

interface InventoryItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  minimum_stock_threshold: number | null;
}

interface AlertConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: InventoryItem | null;
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
  const [threshold, setThreshold] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (item) {
      if (item.minimum_stock_threshold) {
        // Se tem limite personalizado, mostrar em kg
        setThreshold(QuantityUtils.gramsToKg(item.minimum_stock_threshold).toString());
      } else {
        // Se não tem, mostrar o padrão da categoria
        const defaultThreshold = CATEGORY_THRESHOLDS[item.category as keyof typeof CATEGORY_THRESHOLDS] || CATEGORY_THRESHOLDS['Outros'];
        setThreshold(QuantityUtils.gramsToKg(defaultThreshold).toString());
      }
    }
  }, [item]);

  if (!item) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const thresholdGrams = QuantityUtils.kgToGrams(parseFloat(threshold));

      const { error } = await supabase
        .from('inventory')
        .update({
          minimum_stock_threshold: thresholdGrams
        } as any)
        .eq('id', item.id);

      if (error) throw error;

      toast({
        title: "Alerta configurado",
        description: `Limite mínimo definido para ${QuantityUtils.gramsToKg(thresholdGrams).toFixed(2)}kg`,
      });

      onSuccess();
      onClose();
    } catch (error: any) {
      toast({
        title: "Erro ao configurar alerta",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const currentStockKg = QuantityUtils.gramsToKg(item.quantity);
  const thresholdKg = threshold ? parseFloat(threshold) : 0;
  const isCurrentlyLow = currentStockKg <= thresholdKg;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            Configurar Alertas - {item.name}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Status atual */}
          <div className="bg-muted/50 p-3 rounded-lg">
            <div className="text-sm space-y-1">
              <p><strong>Categoria:</strong> {item.category}</p>
              <p><strong>Estoque atual:</strong> {currentStockKg.toFixed(2)}kg</p>
              <p><strong>Limite padrão da categoria:</strong> {QuantityUtils.gramsToKg(CATEGORY_THRESHOLDS[item.category as keyof typeof CATEGORY_THRESHOLDS] || CATEGORY_THRESHOLDS['Outros']).toFixed(2)}kg</p>
              {item.minimum_stock_threshold && (
                <p><strong>Limite personalizado atual:</strong> {QuantityUtils.gramsToKg(item.minimum_stock_threshold).toFixed(2)}kg</p>
              )}
            </div>
          </div>

          {/* Configuração do limite */}
          <div>
            <Label htmlFor="threshold">Limite Mínimo de Estoque (kg)</Label>
            <Input
              id="threshold"
              type="number"
              step="0.01"
              min="0"
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
              required
              placeholder="Ex: 50"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Você será alertado quando o estoque ficar abaixo deste valor
            </p>
          </div>

          {/* Preview do status */}
          {threshold && (
            <div className={`p-3 rounded-lg ${isCurrentlyLow ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
              <div className="flex items-center gap-2">
                <AlertTriangle className={`w-4 h-4 ${isCurrentlyLow ? 'text-red-500' : 'text-green-500'}`} />
                <span className={`text-sm font-medium ${isCurrentlyLow ? 'text-red-700' : 'text-green-700'}`}>
                  {isCurrentlyLow 
                    ? `⚠️ Estoque atual está abaixo do limite definido`
                    : `✅ Estoque atual está acima do limite definido`
                  }
                </span>
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Salvando..." : "Salvar Configuração"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}