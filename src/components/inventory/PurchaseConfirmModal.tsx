import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { CheckCircle, Warning } from "@phosphor-icons/react";
import { calculatePurchaseTotals, PURCHASE_UNITS, formatCurrency } from "@/lib/unitUtils";

interface PurchaseConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  itemName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  isNewItem?: boolean;
}

export function PurchaseConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  itemName,
  quantity,
  unit,
  unitPrice,
  isNewItem = false
}: PurchaseConfirmModalProps) {
  const totals = calculatePurchaseTotals(quantity, unit, unitPrice);
  const unitInfo = PURCHASE_UNITS[unit] || PURCHASE_UNITS['kg'];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Warning className="h-5 w-5 text-amber-500" />
            Confirmar {isNewItem ? 'Novo Item' : 'Compra'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-sm text-muted-foreground mb-2">Item</h4>
            <p className="font-semibold">{itemName}</p>
          </div>

          <Separator />

          <Card className="p-4 bg-muted/50">
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Quantidade:</span>
                <span className="font-medium">{totals.formattedQuantity}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Preço unitário:</span>
                <span className="font-medium">{formatCurrency(unitPrice)} por {unitInfo.name}</span>
              </div>

              <Separator />

              <div className="flex justify-between text-lg font-semibold">
                <span>Total em Kg:</span>
                <span className="text-primary">{totals.formattedTotalKg}</span>
              </div>

              <div className="flex justify-between text-lg font-semibold">
                <span>Valor Total:</span>
                <span className="text-primary">{totals.formattedTotalValue}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Preço por Kg:</span>
                <span className="font-medium text-green-600">{totals.formattedPricePerKg}</span>
              </div>
            </div>
          </Card>

          <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
            <Warning className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-amber-700 dark:text-amber-300">
              Verifique se os valores estão corretos antes de confirmar. 
              Esta ação atualizará o estoque automaticamente.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            Corrigir
          </Button>
          <Button onClick={onConfirm} className="gap-2">
            <CheckCircle className="h-4 w-4" />
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}