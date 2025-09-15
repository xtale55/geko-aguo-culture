import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { QuantityUtils } from "@/lib/quantityUtils";
import { PurchaseConfirmModal } from "./PurchaseConfirmModal";
import { convertToGrams, calculatePricePerKg, formatQuantityWithUnit, PURCHASE_UNITS } from "@/lib/unitUtils";

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
  purchase_unit?: string;
  purchase_quantity?: number;
  purchase_unit_price?: number;
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
  const [selectedUnit, setSelectedUnit] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const { toast } = useToast();

  // Inicializar unidade selecionada quando o item mudar
  if (item && selectedUnit === '') {
    setSelectedUnit(item.purchase_unit || 'kg');
  }

  if (!item) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setConfirmModalOpen(true);
  };

  const handleConfirmSubmit = async () => {
    setLoading(true);

    try {
      const purchaseUnit = selectedUnit;
      const newQuantity = parseFloat(formData.quantity);
      const newUnitPrice = parseFloat(formData.unit_price);

      // Converter para gramas usando a unidade selecionada
      const newQuantityGrams = convertToGrams(newQuantity, purchaseUnit);
      
      // Quantidade atual em kg para cálculo
      const currentQuantityKg = QuantityUtils.gramsToKg(item.quantity);
      const newQuantityKg = newQuantityGrams / 1000;

      // Cálculos de somatório e média ponderada
      const totalQuantityKg = currentQuantityKg + newQuantityKg;
      const totalQuantityGrams = QuantityUtils.kgToGrams(totalQuantityKg);
      
      // Converter preço da unidade de compra para preço por kg
      const pricePerKg = calculatePricePerKg(newUnitPrice, purchaseUnit);
      
      // Média ponderada do preço
      const weightedAveragePrice = ((currentQuantityKg * item.unit_price) + (newQuantityKg * pricePerKg)) / totalQuantityKg;
      
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
          notes: `Compra: ${formatQuantityWithUnit(newQuantity, purchaseUnit)} a R$ ${newUnitPrice.toFixed(2)} por unidade`
        }]);

      toast({
        title: "Compra registrada",
        description: `${formatQuantityWithUnit(newQuantity, purchaseUnit)} adicionados ao estoque.`,
      });

      onSuccess();
      onClose();
      setConfirmModalOpen(false);
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
    setSelectedUnit('');
  };

  // Obter informações da unidade selecionada
  const selectedUnitInfo = PURCHASE_UNITS[selectedUnit] || PURCHASE_UNITS['kg'];
  const currentUnitInfo = PURCHASE_UNITS[item?.purchase_unit || 'kg'] || PURCHASE_UNITS['kg'];

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
              <p><strong>Unidade original:</strong> {currentUnitInfo.name}</p>
            </div>
          </div>

          {/* Campos editáveis */}
          <div>
            <Label htmlFor="purchase_unit">Unidade de Compra</Label>
            <Select value={selectedUnit} onValueChange={setSelectedUnit}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a unidade" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PURCHASE_UNITS).map(([key, unit]) => (
                  <SelectItem key={key} value={key}>
                    {unit.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="quantity">
              Quantidade ({selectedUnitInfo.name})
            </Label>
            <Input
              id="quantity"
              type="number"
              step="0.001"
              value={formData.quantity}
              onChange={(e) => setFormData({...formData, quantity: e.target.value})}
              required
              placeholder={selectedUnit === 'kg' ? "Ex: 30" : selectedUnit.includes('saca') || selectedUnit.includes('balde') ? "Ex: 2" : "Ex: 1"}
            />
          </div>

          <div>
            <Label htmlFor="unit_price">
              Preço por {selectedUnitInfo.name} (R$)
            </Label>
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

        <PurchaseConfirmModal
          isOpen={confirmModalOpen}
          onClose={() => setConfirmModalOpen(false)}
          onConfirm={handleConfirmSubmit}
          itemName={item.name}
          quantity={parseFloat(formData.quantity) || 0}
          unit={selectedUnit}
          unitPrice={parseFloat(formData.unit_price) || 0}
          isNewItem={false}
        />
      </DialogContent>
    </Dialog>
  );
}