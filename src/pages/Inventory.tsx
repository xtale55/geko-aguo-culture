import { useState, useEffect } from "react";
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  MoreVertical,
  Settings
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { LoadingScreen } from '@/components/LoadingScreen';
import { MovementHistory } from '@/components/inventory/MovementHistory';
import { NewPurchaseModal } from '@/components/inventory/NewPurchaseModal';
import { AlertConfigModal } from '@/components/inventory/AlertConfigModal';
import { StockAdjustmentModal } from '@/components/inventory/StockAdjustmentModal';
import { QuantityUtils } from '@/lib/quantityUtils';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface InventoryItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit_price: number;
  total_value: number;
  entry_date: string;
  supplier?: string;
  brand?: string;
  farm_id: string;
  minimum_stock_threshold?: number;
}

interface Farm {
  id: string;
  name: string;
}

const CATEGORIES = [
  'Ração',
  'Probióticos', 
  'Fertilizantes',
  'Outros'
];

export default function Inventory() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [selectedFarm, setSelectedFarm] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [selectedItemForHistory, setSelectedItemForHistory] = useState<InventoryItem | null>(null);
  const [newPurchaseItem, setNewPurchaseItem] = useState<InventoryItem | null>(null);
  const [alertConfigItem, setAlertConfigItem] = useState<InventoryItem | null>(null);
  const [stockAdjustmentItem, setStockAdjustmentItem] = useState<InventoryItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    brand: '',
    supplier: '',
    quantity: '',
    unit_price: '',
    entry_date: new Date().toISOString().split('T')[0]
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchFarms();
  }, []);

  useEffect(() => {
    if (selectedFarm) {
      fetchInventory();
    }
  }, [selectedFarm]);

  const fetchFarms = async () => {
    try {
      const { data, error } = await supabase
        .from('farms')
        .select('id, name')
        .order('name');

      if (error) throw error;

      setFarms(data || []);
      if (data && data.length > 0) {
        setSelectedFarm(data[0].id);
      }
    } catch (error: any) {
      console.error('Erro ao carregar fazendas:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar fazendas.',
        variant: 'destructive',
      });
    }
  };

  const fetchInventory = async () => {
    if (!selectedFarm) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('inventory')
        .select('*')
        .eq('farm_id', selectedFarm)
        .order('name');

      if (error) throw error;

      setInventory(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar inventário:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar inventário.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedFarm) {
      toast({
        title: 'Erro',
        description: 'Selecione uma fazenda primeiro.',
        variant: 'destructive',
      });
      return;
    }

    const quantityGrams = QuantityUtils.parseInputToGrams(formData.quantity);
    const unitPrice = parseFloat(formData.unit_price);

    if (!QuantityUtils.isValidKg(formData.quantity) || unitPrice < 0) {
      toast({
        title: 'Erro',
        description: 'Verifique os valores inseridos.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const itemData = {
        name: formData.name,
        category: formData.category,
        brand: formData.brand || null,
        supplier: formData.supplier || null,
        quantity: quantityGrams,
        unit_price: unitPrice,
        total_value: QuantityUtils.gramsToKg(quantityGrams) * unitPrice,
        entry_date: formData.entry_date,
        farm_id: selectedFarm,
      };

      if (editingItem) {
        const { error } = await supabase
          .from('inventory')
          .update(itemData)
          .eq('id', editingItem.id);

        if (error) throw error;

        toast({
          title: 'Sucesso',
          description: 'Item atualizado com sucesso!',
        });
      } else {
        const { error } = await supabase
          .from('inventory')
          .insert([itemData]);

        if (error) throw error;

        toast({
          title: 'Sucesso',
          description: 'Item adicionado com sucesso!',
        });
      }

      setIsDialogOpen(false);
      setEditingItem(null);
      resetForm();
      fetchInventory();
    } catch (error: any) {
      console.error('Erro ao salvar item:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao salvar item.',
        variant: 'destructive',
      });
    }
  };

  const deleteItem = async (itemId: string) => {
    try {
      const { error } = await supabase
        .from('inventory')
        .delete()
        .eq('id', itemId);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Item excluído com sucesso!',
      });

      fetchInventory();
    } catch (error: any) {
      console.error('Erro ao excluir item:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao excluir item.',
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      category: '',
      brand: '',
      supplier: '',
      quantity: '',
      unit_price: '',
      entry_date: new Date().toISOString().split('T')[0]
    });
  };

  const openEditDialog = (item: InventoryItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      category: item.category,
      brand: item.brand || '',
      supplier: item.supplier || '',
      quantity: QuantityUtils.gramsToKg(item.quantity).toString(),
      unit_price: item.unit_price.toString(),
      entry_date: item.entry_date
    });
    setIsDialogOpen(true);
  };

  const filteredInventory = inventory.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (item.brand && item.brand.toLowerCase().includes(searchTerm.toLowerCase())) ||
                          (item.supplier && item.supplier.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const groupedInventory = filteredInventory.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, InventoryItem[]>);

  const totalItems = inventory.length;
  const totalValue = inventory.reduce((sum, item) => sum + item.total_value, 0);


  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventário</h1>
          <p className="text-muted-foreground">
            Gerencie os itens do seu inventário
          </p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Item
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex gap-4 flex-wrap">
        <Select value={selectedFarm} onValueChange={setSelectedFarm}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Selecione a fazenda" />
          </SelectTrigger>
          <SelectContent>
            {farms.map((farm) => (
              <SelectItem key={farm.id} value={farm.id}>
                {farm.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar itens..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>

        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Todas as categorias" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as categorias</SelectItem>
            {CATEGORIES.map((category) => (
              <SelectItem key={category} value={category}>
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Resumo */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Itens</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalItems}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Itens por Categoria */}
      {Object.entries(groupedInventory).map(([category, items]) => (
        <Card key={category}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {category}
              <Badge variant="secondary">{items.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {items.map((item) => (
              <div key={item.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <h3 className="font-semibold">{item.name}</h3>
                    {item.brand && (
                      <p className="text-sm text-muted-foreground">Marca: {item.brand}</p>
                    )}
                    {item.supplier && (
                      <p className="text-sm text-muted-foreground">Fornecedor: {item.supplier}</p>
                    )}
                  </div>
                  <div className="text-right space-y-1">
                    <p className="font-medium">
                      {QuantityUtils.formatKg(item.quantity)}kg
                    </p>
                    <p className="text-sm text-muted-foreground">
                      R$ {item.unit_price.toFixed(2)}/kg
                    </p>
                    <p className="text-sm font-medium">
                      Total: R$ {item.total_value.toFixed(2)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t">
                  <p className="text-xs text-muted-foreground">
                    Adicionado em {format(new Date(item.entry_date), 'dd/MM/yyyy', { locale: ptBR })}
                  </p>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setNewPurchaseItem(item)}
                      className="bg-success/10 hover:bg-success/20 border-success/20"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Nova Compra
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setAlertConfigItem(item)}>
                          <Settings className="h-4 w-4 mr-2" />
                          Configurar Alertas
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setStockAdjustmentItem(item)}>
                          <Edit2 className="h-4 w-4 mr-2" />
                          Ajustar Estoque
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => deleteItem(item.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Excluir Item
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  </div>
                </div>
              )
            )}
          </CardContent>
        </Card>
      ))}

      {filteredInventory.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <p className="text-muted-foreground">Nenhum item encontrado</p>
          </CardContent>
        </Card>
      )}

      {/* Dialog para Adicionar/Editar Item */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? 'Editar Item' : 'Adicionar Novo Item'}
            </DialogTitle>
            <DialogDescription>
              {editingItem ? 'Edite as informações do item.' : 'Adicione um novo item ao inventário.'}
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4">
              <div>
                <Label htmlFor="name">Nome do Item *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Ração comercial extrusada"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="category">Categoria *</Label>
                <Select 
                  value={formData.category} 
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="brand">Marca</Label>
                  <Input
                    id="brand"
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    placeholder="Ex: Guabi"
                  />
                </div>
                
                <div>
                  <Label htmlFor="supplier">Fornecedor</Label>
                  <Input
                    id="supplier"
                    value={formData.supplier}
                    onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                    placeholder="Ex: Agropecuária XYZ"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="quantity">Quantidade (kg) *</Label>
                  <Input
                    id="quantity"
                    type="number"
                    step="0.1"
                    min="0"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    placeholder="Ex: 25.5"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="unit_price">Preço Unitário (R$/kg) *</Label>
                  <Input
                    id="unit_price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.unit_price}
                    onChange={(e) => setFormData({ ...formData, unit_price: e.target.value })}
                    placeholder="Ex: 12.50"
                    required
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="entry_date">Data de Entrada *</Label>
                <Input
                  id="entry_date"
                  type="date"
                  value={formData.entry_date}
                  onChange={(e) => setFormData({ ...formData, entry_date: e.target.value })}
                  required
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setIsDialogOpen(false);
                  setEditingItem(null);
                  resetForm();
                }}
              >
                Cancelar
              </Button>
              <Button type="submit">
                {editingItem ? 'Salvar Alterações' : 'Adicionar Item'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Histórico de Movimentações */}
      {selectedItemForHistory && (
        <MovementHistory
          itemId={selectedItemForHistory.id}
          itemName={selectedItemForHistory.name}
          itemCategory={selectedItemForHistory.category}
          currentStock={selectedItemForHistory.quantity}
        />
      )}

      {/* Modal de Nova Compra */}
      {newPurchaseItem && (
        <NewPurchaseModal
          isOpen={!!newPurchaseItem}
          onClose={() => setNewPurchaseItem(null)}
          item={{
            id: newPurchaseItem.id,
            name: newPurchaseItem.name,
            category: newPurchaseItem.category,
            currentStock: newPurchaseItem.quantity
          }}
          onSuccess={fetchInventory}
        />
      )}

      {/* Modal de Configuração de Alertas */}
      {alertConfigItem && (
        <AlertConfigModal
          isOpen={!!alertConfigItem}
          onClose={() => setAlertConfigItem(null)}
          item={{
            id: alertConfigItem.id,
            name: alertConfigItem.name,
            category: alertConfigItem.category,
            currentStock: alertConfigItem.quantity,
            minimum_stock_threshold: alertConfigItem.minimum_stock_threshold
          }}
          onSuccess={fetchInventory}
        />
      )}

      {/* Modal de Ajuste de Estoque */}
      {stockAdjustmentItem && (
        <StockAdjustmentModal
          isOpen={!!stockAdjustmentItem}
          onClose={() => setStockAdjustmentItem(null)}
          item={{
            id: stockAdjustmentItem.id,
            name: stockAdjustmentItem.name,
            category: stockAdjustmentItem.category,
            currentStock: stockAdjustmentItem.quantity
          }}
          onSuccess={fetchInventory}
        />
      )}
    </div>
  );
}