import { useState, useEffect } from "react";
import { Plus, Search, Package, Trash2, Edit, ArrowLeft, Beaker, X } from "lucide-react";
import { QuantityUtils } from "@/lib/quantityUtils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Layout } from "@/components/Layout";
import { useNavigate } from "react-router-dom";
import { LoadingScreen } from "@/components/LoadingScreen";

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
}

interface Farm {
  id: string;
  name: string;
}

const CATEGORIES = [
  "Ração",
  "Probióticos",
  "Fertilizantes",
  "Misturas",
  "Outros"
];

export default function Inventory() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMixtureDialogOpen, setIsMixtureDialogOpen] = useState(false);
  const [selectedMixtureItems, setSelectedMixtureItems] = useState<{item: InventoryItem, quantity: number}[]>([]);
  const [mixtureFormData, setMixtureFormData] = useState({
    name: "",
    farm_id: ""
  });
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    category: "",
    brand: "",
    supplier: "",
    quantity: '',
    unit_price: '',
    entry_date: new Date().toISOString().split('T')[0],
    farm_id: ""
  });

  useEffect(() => {
    if (user) {
      fetchFarms();
      fetchInventoryItems();
    }
  }, [user]);

  const fetchFarms = async () => {
    const { data, error } = await supabase
      .from('farms')
      .select('id, name')
      .order('name');

    if (error) {
      toast({
        title: "Erro ao carregar fazendas",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setFarms(data || []);
      if (data && data.length > 0) {
        setFormData(prev => ({ ...prev, farm_id: data[0].id }));
      }
    }
  };

  const fetchInventoryItems = async () => {
    const { data, error } = await supabase
      .from('inventory')
      .select(`
        *,
        farms!inner(name)
      `)
      .order('entry_date', { ascending: false });

    if (error) {
      toast({
        title: "Erro ao carregar inventário",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setItems(data || []);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Anti-Drift: usar QuantityUtils para conversão precisa
    const quantity = QuantityUtils.parseInputToGrams(formData.quantity);
    const quantityKg = QuantityUtils.gramsToKg(quantity);
    const unit_price = parseFloat(formData.unit_price.toString()) || 0;
    const total_value = quantityKg * unit_price;
    const itemData = { ...formData, quantity, unit_price, total_value };

    try {
      if (editingItem) {
        const { error } = await supabase
          .from('inventory')
          .update(itemData)
          .eq('id', editingItem.id);

        if (error) throw error;
        
        toast({
          title: "Item atualizado",
          description: "Item do inventário atualizado com sucesso.",
        });
      } else {
        const { error } = await supabase
          .from('inventory')
          .insert([itemData]);

        if (error) throw error;
        
        toast({
          title: "Item adicionado",
          description: "Item adicionado ao inventário com sucesso.",
        });
      }

      fetchInventoryItems();
      resetForm();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este item?")) return;

    const { error } = await supabase
      .from('inventory')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: "Erro ao excluir",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Item excluído",
        description: "Item removido do inventário.",
      });
      fetchInventoryItems();
    }
  };

  const resetMixtureForm = () => {
    setSelectedMixtureItems([]);
    setMixtureFormData({
      name: "",
      farm_id: farms[0]?.id || ""
    });
    setIsMixtureDialogOpen(false);
  };

  const handleMixtureItemToggle = (item: InventoryItem) => {
    setSelectedMixtureItems(prev => {
      const existing = prev.find(selected => selected.item.id === item.id);
      if (existing) {
        return prev.filter(selected => selected.item.id !== item.id);
      } else {
        return [...prev, { item, quantity: 1 }];
      }
    });
  };

  const handleMixtureQuantityChange = (itemId: string, quantity: number) => {
    setSelectedMixtureItems(prev =>
      prev.map(selected =>
        selected.item.id === itemId
          ? { ...selected, quantity: Math.max(0.1, Math.min(quantity, QuantityUtils.gramsToKg(selected.item.quantity))) }
          : selected
      )
    );
  };

  const calculateMixtureStats = () => {
    const totalQuantity = selectedMixtureItems.reduce((sum, selected) => sum + selected.quantity, 0);
    const totalCost = selectedMixtureItems.reduce((sum, selected) => {
      return sum + (selected.quantity * selected.item.unit_price);
    }, 0);
    const avgCostPerKg = totalQuantity > 0 ? totalCost / totalQuantity : 0;
    
    return { totalQuantity, totalCost, avgCostPerKg };
  };

  const handleCreateMixture = async () => {
    if (selectedMixtureItems.length < 2) {
      toast({
        title: "Erro",
        description: "Selecione pelo menos 2 itens para criar uma mistura.",
        variant: "destructive",
      });
      return;
    }

    if (!mixtureFormData.name.trim()) {
      toast({
        title: "Erro",
        description: "Digite um nome para a mistura.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { totalQuantity, avgCostPerKg, totalCost } = calculateMixtureStats();
      
      // Verificar se há quantidade suficiente para todos os itens
      for (const selected of selectedMixtureItems) {
        const availableKg = QuantityUtils.gramsToKg(selected.item.quantity);
        if (selected.quantity > availableKg) {
          toast({
            title: "Erro",
            description: `Quantidade insuficiente de ${selected.item.name}. Disponível: ${availableKg}kg`,
            variant: "destructive",
          });
          return;
        }
      }

      // Atualizar estoque dos itens existentes
      for (const selected of selectedMixtureItems) {
        const newQuantityGrams = selected.item.quantity - QuantityUtils.kgToGrams(selected.quantity);
        const newQuantityKg = QuantityUtils.gramsToKg(newQuantityGrams);
        const newTotalValue = newQuantityKg * selected.item.unit_price;

        const { error: updateError } = await supabase
          .from('inventory')
          .update({ 
            quantity: newQuantityGrams,
            total_value: newTotalValue
          })
          .eq('id', selected.item.id);

        if (updateError) throw updateError;
      }

      // Criar item de mistura
      const mixtureQuantityGrams = QuantityUtils.kgToGrams(totalQuantity);
      const mixtureData = {
        name: mixtureFormData.name,
        category: "Misturas",
        brand: null,
        supplier: "Mistura Interna",
        quantity: mixtureQuantityGrams,
        unit_price: avgCostPerKg,
        total_value: totalCost,
        entry_date: new Date().toISOString().split('T')[0],
        farm_id: mixtureFormData.farm_id
      };

      const { error: insertError } = await supabase
        .from('inventory')
        .insert([mixtureData]);

      if (insertError) throw insertError;

      const mixtureComponents = selectedMixtureItems
        .map(selected => `${selected.item.name} (${selected.quantity}kg)`)
        .join(', ');

      toast({
        title: "Mistura criada",
        description: `Mistura "${mixtureFormData.name}" criada com sucesso usando: ${mixtureComponents}`,
      });

      fetchInventoryItems();
      resetMixtureForm();
    } catch (error: any) {
      toast({
        title: "Erro ao criar mistura",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const mixableItems = items.filter(item => 
    ["Ração", "Probióticos", "Fertilizantes"].includes(item.category) && 
    item.quantity > 0
  );

  const canCreateMixture = selectedMixtureItems.length >= 2 && 
                           mixtureFormData.name.trim() && 
                           mixtureFormData.farm_id;

  const resetForm = () => {
    setFormData({
      name: "",
      category: "",
      brand: "",
      supplier: "",
      quantity: '',
      unit_price: '',
      entry_date: new Date().toISOString().split('T')[0],
      farm_id: farms[0]?.id || ""
    });
    setEditingItem(null);
    setIsDialogOpen(false);
  };

  const startEdit = (item: InventoryItem) => {
    setEditingItem(item);
    // Anti-Drift: converter gramas para kg na interface
    const quantityKg = QuantityUtils.gramsToKg(item.quantity);
    setFormData({
      name: item.name,
      category: item.category,
      brand: item.brand || "",
      supplier: item.supplier || "",
      quantity: quantityKg.toString(),
      unit_price: item.unit_price.toString(),
      entry_date: item.entry_date,
      farm_id: item.farm_id
    });
    setIsDialogOpen(true);
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.supplier?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "all" || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const totalValue = filteredItems.reduce((sum, item) => {
    // Anti-Drift: usar quantidades em kg para cálculo de valor total
    const quantityKg = QuantityUtils.gramsToKg(item.quantity);
    return sum + (quantityKg * item.unit_price);
  }, 0);

  if (loading) {
    return <LoadingScreen message="Carregando estoque..." />;
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-emerald-50/20">
        <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate('/dashboard')}
              className="mb-2"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-primary to-emerald-600 bg-clip-text text-transparent mb-2">
              Controle de Estoque
            </h1>
          </div>
        <div className="flex gap-2">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditingItem(null)}>
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Item
              </Button>
            </DialogTrigger>
          </Dialog>
          
          <Dialog open={isMixtureDialogOpen} onOpenChange={setIsMixtureDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" onClick={() => {
                setMixtureFormData({
                  name: "",
                  farm_id: farms[0]?.id || ""
                });
                setSelectedMixtureItems([]);
              }}>
                <Beaker className="w-4 h-4 mr-2" />
                Mistura
              </Button>
            </DialogTrigger>
          </Dialog>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingItem ? "Editar Item" : "Adicionar Item"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="farm">Fazenda</Label>
                  <Select value={formData.farm_id} onValueChange={(value) => setFormData({...formData, farm_id: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {farms.map(farm => (
                        <SelectItem key={farm.id} value={farm.id}>{farm.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="category">Categoria</Label>
                  <Select value={formData.category} onValueChange={(value) => setFormData({...formData, category: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(category => (
                        <SelectItem key={category} value={category}>{category}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Nome do Item</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="brand">Marca</Label>
                  <Input
                    id="brand"
                    value={formData.brand}
                    onChange={(e) => setFormData({...formData, brand: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="supplier">Fornecedor</Label>
                <Input
                  id="supplier"
                  value={formData.supplier}
                  onChange={(e) => setFormData({...formData, supplier: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="quantity">Quantidade (kg)</Label>
                  <Input
                    id="quantity"
                    type="number"
                    step="0.01"
                    value={formData.quantity}
                    onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                    required
                    placeholder="Ex: 30 (para 1 saca de 30kg)"
                  />
                </div>
                <div>
                  <Label htmlFor="unit_price">Preço Unitário (R$)</Label>
                  <Input
                    id="unit_price"
                    type="number"
                    step="0.01"
                    value={formData.unit_price}
                    onChange={(e) => setFormData({...formData, unit_price: e.target.value})}
                    required
                    placeholder="Ex: 80.00"
                  />
                </div>
                <div>
                  <Label htmlFor="entry_date">Data de Entrada</Label>
                  <Input
                    id="entry_date"
                    type="date"
                    value={formData.entry_date}
                    onChange={(e) => setFormData({...formData, entry_date: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingItem ? "Atualizar" : "Adicionar"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Dialog de Mistura */}
        <Dialog open={isMixtureDialogOpen} onOpenChange={setIsMixtureDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Criar Mistura de Itens</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              {/* Configuração da Mistura */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
                <div>
                  <Label htmlFor="mixture-name">Nome da Mistura</Label>
                  <Input
                    id="mixture-name"
                    value={mixtureFormData.name}
                    onChange={(e) => setMixtureFormData({...mixtureFormData, name: e.target.value})}
                    placeholder="Ex: Ração Premium com Probióticos"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="mixture-farm">Fazenda</Label>
                  <Select value={mixtureFormData.farm_id} onValueChange={(value) => setMixtureFormData({...mixtureFormData, farm_id: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {farms.map(farm => (
                        <SelectItem key={farm.id} value={farm.id}>{farm.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Seleção de Itens */}
              <div>
                <h3 className="font-semibold mb-3">Selecione os itens para mistura:</h3>
                <div className="space-y-2 max-h-60 overflow-y-auto border rounded-lg p-2">
                  {mixableItems.map((item) => {
                    const selected = selectedMixtureItems.find(s => s.item.id === item.id);
                    const availableKg = QuantityUtils.gramsToKg(item.quantity);
                    
                    return (
                      <div key={item.id} className={`flex items-center space-x-3 p-3 rounded border ${selected ? 'bg-primary/10 border-primary' : 'hover:bg-muted/50'}`}>
                        <input
                          type="checkbox"
                          checked={!!selected}
                          onChange={() => handleMixtureItemToggle(item)}
                          className="w-4 h-4"
                        />
                        <div className="flex-1">
                          <div className="font-medium">{item.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {item.category} • Disponível: {QuantityUtils.formatKg(item.quantity)}kg • R$ {item.unit_price.toFixed(2)}/kg
                          </div>
                        </div>
                        {selected && (
                          <div className="flex items-center space-x-2">
                            <Label className="text-sm">Usar:</Label>
                            <Input
                              type="number"
                              step="0.1"
                              min="0.1"
                              max={availableKg}
                              value={selected.quantity}
                              onChange={(e) => handleMixtureQuantityChange(item.id, parseFloat(e.target.value) || 0.1)}
                              className="w-20"
                            />
                            <span className="text-sm text-muted-foreground">kg</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {mixableItems.length === 0 && (
                    <p className="text-muted-foreground text-center py-4">
                      Nenhum item disponível para mistura. Adicione itens de ração, probióticos ou fertilizantes ao estoque.
                    </p>
                  )}
                </div>
              </div>

              {/* Resumo da Mistura */}
              {selectedMixtureItems.length > 0 && (
                <div className="p-4 bg-primary/5 rounded-lg">
                  <h4 className="font-semibold mb-2">Resumo da Mistura:</h4>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Quantidade Total:</span>
                      <p className="font-medium">{calculateMixtureStats().totalQuantity.toFixed(1)} kg</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Custo Total:</span>
                      <p className="font-medium">R$ {calculateMixtureStats().totalCost.toFixed(2)}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Custo por kg:</span>
                      <p className="font-medium">R$ {calculateMixtureStats().avgCostPerKg.toFixed(2)}</p>
                    </div>
                  </div>
                  <div className="mt-2">
                    <span className="text-muted-foreground text-sm">Componentes:</span>
                    <p className="text-sm">
                      {selectedMixtureItems.map(s => `${s.item.name} (${s.quantity}kg)`).join(', ')}
                    </p>
                  </div>
                </div>
              )}

              {/* Botões */}
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={resetMixtureForm}>
                  Cancelar
                </Button>
                <Button 
                  onClick={handleCreateMixture}
                  disabled={!canCreateMixture}
                >
                  Criar Mistura
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filtros e Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="md:col-span-2">
          <CardContent className="p-4">
            <div className="flex gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Buscar por nome, marca ou fornecedor..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as categorias</SelectItem>
                  {CATEGORIES.map(category => (
                    <SelectItem key={category} value={category}>{category}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Total de Itens</p>
                <p className="text-2xl font-bold">{filteredItems.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div>
                <p className="text-sm text-muted-foreground">Valor Total</p>
                <p className="text-2xl font-bold">R$ {totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Itens por Categoria */}
      <div className="space-y-6">
        {(() => {
          const groupedItems = filteredItems.reduce((groups, item) => {
            const category = item.category;
            if (!groups[category]) {
              groups[category] = [];
            }
            groups[category].push(item);
            return groups;
          }, {} as Record<string, typeof filteredItems>);

          return Object.entries(groupedItems).map(([category, categoryItems]) => (
            <div key={category} className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b">
                <div className="h-2 w-2 rounded-full bg-primary"></div>
                <h3 className="text-lg font-semibold">{category}</h3>
                <Badge variant="outline" className="ml-auto">
                  {categoryItems.length} {categoryItems.length === 1 ? 'item' : 'itens'}
                </Badge>
              </div>
              
              <div className="grid gap-4">
                {categoryItems.map((item) => (
                  <Card key={item.id}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-5 gap-4">
                          <div>
                            <h3 className="font-semibold">{item.name}</h3>
                            <Badge variant="secondary" className="mt-1">
                              {item.category}
                            </Badge>
                          </div>
                          
                          <div>
                            <p className="text-sm text-muted-foreground">Marca</p>
                            <p className="font-medium">{item.brand || "N/A"}</p>
                          </div>
                          
                          <div>
                            <p className="text-sm text-muted-foreground">Quantidade</p>
                            <p className="font-medium">{QuantityUtils.formatKg(item.quantity)} kg</p>
                          </div>
                          
                          <div>
                            <p className="text-sm text-muted-foreground">Preço Unit.</p>
                            <p className="font-medium">R$ {item.unit_price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                          </div>
                          
                          <div>
                            <p className="text-sm text-muted-foreground">Valor Total</p>
                            <p className="font-bold text-primary">R$ {(QuantityUtils.gramsToKg(item.quantity) * item.unit_price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                          </div>
                        </div>
                        
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => startEdit(item)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(item.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="mt-3 pt-3 border-t grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-muted-foreground">
                        {item.supplier && (
                          <p><span className="font-medium">Fornecedor:</span> {item.supplier}</p>
                        )}
                        <p><span className="font-medium">Data de Entrada:</span> {new Date(item.entry_date).toLocaleDateString('pt-BR')}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ));
        })()}
      </div>

      {filteredItems.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum item encontrado</h3>
            <p className="text-muted-foreground">
              {searchTerm || selectedCategory !== "all" 
                ? "Tente ajustar os filtros de busca." 
                : "Adicione o primeiro item ao seu inventário."}
            </p>
          </CardContent>
        </Card>
        )}
        </div>
      </div>
    </Layout>
  );
}