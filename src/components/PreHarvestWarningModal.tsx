import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertTriangle, Clock, Calendar, DollarSign, Fish } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface PreHarvestWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  pondBatch: {
    pond_name: string;
    batch_name: string;
    latest_measurement_date?: string;
  };
}

export const PreHarvestWarningModal = ({ isOpen, onClose, onConfirm }: PreHarvestWarningModalProps) => {
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({
    biometry: false,
    feeding: false,
    inputs: false,
    mortality: false,
  });

  const checklist = [
    {
      id: 'biometry',
      label: 'Biometrias atualizadas (últimos 7 dias)',
      icon: <Fish className="w-4 h-4" />,
      description: 'Confirme que as medições de peso médio estão atualizadas',
    },
    {
      id: 'feeding',
      label: 'Alimentação registrada (últimos 7 dias)',
      icon: <Calendar className="w-4 h-4" />,
      description: 'Verifique se todas as alimentações foram registradas',
    },
    {
      id: 'inputs',
      label: 'Aplicação de insumos atualizada',
      icon: <DollarSign className="w-4 h-4" />,
      description: 'Confirme que todos os insumos aplicados foram registrados',
    },
    {
      id: 'mortality',
      label: 'Mortalidade registrada',
      icon: <Clock className="w-4 h-4" />,
      description: 'Verifique se a mortalidade foi registrada adequadamente',
    },
  ];

  const handleCheckChange = (id: string, checked: boolean) => {
    setCheckedItems(prev => ({ ...prev, [id]: checked }));
  };

  const handleConfirm = () => {
    onConfirm();
    // Reset form
    setCheckedItems({
      biometry: false,
      feeding: false,
      inputs: false,
      mortality: false,
    });
  };

  const allChecked = Object.values(checkedItems).every(Boolean);
  const checkedCount = Object.values(checkedItems).filter(Boolean).length;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Verificações Antes da Despesca
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-amber-50 p-3 rounded-lg border border-amber-200">
            <p className="text-sm text-amber-800">
              <strong>Importante:</strong> Verifique se todos os dados do cultivo estão atualizados. 
              Dados inseridos após a despesca não serão considerados nos cálculos de desempenho.
            </p>
          </div>

          <div className="space-y-3">
            {checklist.map((item) => (
              <div key={item.id} className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-slate-50 transition-colors">
                <Checkbox
                  id={item.id}
                  checked={checkedItems[item.id]}
                  onCheckedChange={(checked) => handleCheckChange(item.id, !!checked)}
                  className="mt-0.5"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {item.icon}
                    <label htmlFor={item.id} className="text-sm font-medium cursor-pointer">
                      {item.label}
                    </label>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-2">
            <Badge variant={allChecked ? "default" : "secondary"}>
              {checkedCount}/{checklist.length} verificações
            </Badge>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button onClick={handleConfirm}>
                {allChecked ? 'Prosseguir' : 'Prosseguir Mesmo Assim'}
              </Button>
            </div>
          </div>

          {!allChecked && (
            <div className="bg-orange-50 p-3 rounded-lg border border-orange-200">
              <p className="text-xs text-orange-700">
                Você pode prosseguir mesmo sem todas as verificações, mas isso pode afetar 
                a precisão dos cálculos de desempenho e reconciliação.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};