import { useState, useEffect } from "react";
import { Plus, Search, Package, Trash2, Edit, ArrowLeft, Calendar, Clock, TrendingDown, MoreVertical, ShoppingCart, AlertTriangle } from "lucide-react";
import { QuantityUtils } from "@/lib/quantityUtils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Layout } from "@/components/Layout";
import { useNavigate } from "react-router-dom";
import { LoadingScreen } from "@/components/LoadingScreen";
import { StockAlerts } from "@/components/inventory/StockAlerts";
import { MovementHistory } from "@/components/inventory/MovementHistory";
import { NewPurchaseModal } from "@/components/inventory/NewPurchaseModal";
import { AlertConfigModal } from "@/components/inventory/AlertConfigModal";
import { PurchaseConfirmModal } from "@/components/inventory/PurchaseConfirmModal";
import { MixtureModal } from "@/components/inventory/MixtureModal";
import { useConsumptionForecast } from "@/hooks/useConsumptionForecast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PURCHASE_UNITS, convertToGrams, calculatePricePerKg } from "@/lib/unitUtils";

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
  minimum_stock_threshold: number | null;
  purchase_unit?: string;
  purchase_quantity?: number;
  purchase_unit_price?: number;
}

interface Farm {
  id: string;
  name: string;
}

const CATEGORIES = [
  "Ração",
  "Probióticos",
  "Fertilizantes",
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
  const [feedingRecords, setFeedingRecords] = useState([]);
  const [inputApplications, setInputApplications] = useState([]);
  const [selectedItemForHistory, setSelectedItemForHistory] = useState<InventoryItem | null>(null);
  const [newPurchaseModalOpen, setNewPurchaseModalOpen] = useState(false);
  const [alertConfigModalOpen, setAlertConfigModalOpen] = useState(false);
  const [selectedItemForPurchase, setSelectedItemForPurchase] = useState<InventoryItem | null>(null);
  const [selectedItemForAlert, setSelectedItemForAlert] = useState<InventoryItem | null>(null);
  const [mixtureModalOpen, setMixtureModalOpen] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    category: "",
    brand: "",
    supplier: "",
    purchase_unit: "kg",
    purchase_quantity: '',
    purchase_unit_price: '',
    entry_date: new Date().toISOString().split('T')[0],
    farm_id: "",
    minimum_stock_threshold: ''
  });

  const [confirmModalOpen, setConfirmModalOpen] = useState(false);

  useEffect(() => {
    if (user) {
      fetchFarms();
      fetchInventoryItems();
      fetchFeedingData();
      fetchInputApplicationsData();
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
        id,
        name,
        category,
        brand,
        supplier,
        quantity,
        unit_price,
        total_value,
        entry_date,
        farm_id,
        minimum_stock_threshold,
        farms!inner(name)
      `)
      .order('entry_date', { ascending: false });

    if (error) {
      console.error('Error fetching inventory:', error);
      toast({
        title: "Erro ao carregar inventário",
        description: error.message,
        variant: "destructive",
      });
      setItems([]);
    } else {
      setItems(data || []);
    }
    setLoading(false);
  };

  const fetchFeedingData = async () => {
    const { data } = await supabase
      .from('feeding_records')
      .select('*')
      .gte('feeding_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    setFeedingRecords(data || []);
  };

  const fetchInputApplicationsData = async () => {
    const { data } = await supabase
      .from('input_applications')
      .select('*')
      .gte('application_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    setInputApplications(data || []);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setConfirmModalOpen(true);
  };

  const handleConfirmSubmit = async () => {
    try {
      // Converte unidade de compra para gramas
      const purchaseQuantity = parseFloat(formData.purchase_quantity) || 0;
      const purchaseUnitPrice = parseFloat(formData.purchase_unit_price) || 0;
      const quantity = convertToGrams(purchaseQuantity, formData.purchase_unit);
      const unit_price = calculatePricePerKg(purchaseUnitPrice, formData.purchase_unit);
      const total_value = (quantity / 1000) * unit_price;
      const minimum_stock_threshold = formData.minimum_stock_threshold ? parseInt(formData.minimum_stock_threshold) : null;

      const itemData = {
        name: formData.name,
        category: formData.category,
        brand: formData.brand || null,
        supplier: formData.supplier || null,
        quantity,
        unit_price,
        total_value,
        entry_date: formData.entry_date,
        farm_id: formData.farm_id,
        minimum_stock_threshold,
        purchase_unit: formData.purchase_unit,
        purchase_quantity: purchaseQuantity,
        purchase_unit_price: purchaseUnitPrice
      };

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
      setConfirmModalOpen(false);
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

  const resetForm = () => {
    setFormData({
      name: "",
      category: "",
      brand: "",
      supplier: "",
      purchase_unit: "kg",
      purchase_quantity: '',
      purchase_unit_price: '',
      entry_date: new Date().toISOString().split('T')[0],
      farm_id: farms[0]?.id || "",
      minimum_stock_threshold: ''
    });
    setEditingItem(null);
    setIsDialogOpen(false);
  };

  const startEdit = (item: InventoryItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      category: item.category,
      brand: item.brand || "",
      supplier: item.supplier || "",
      purchase_unit: item.purchase_unit || "kg",
      purchase_quantity: item.purchase_quantity?.toString() || '',
      purchase_unit_price: item.purchase_unit_price?.toString() || '',
      entry_date: item.entry_date,
      farm_id: item.farm_id,
      minimum_stock_threshold: item.minimum_stock_threshold?.toString() || ''
    });
    setIsDialogOpen(true);
  };

  const handleNewPurchase = (item: InventoryItem) => {
    setSelectedItemForPurchase(item);
    setNewPurchaseModalOpen(true);
  };

  const handleConfigureAlerts = (item: InventoryItem) => {
    setSelectedItemForAlert(item);
    setAlertConfigModalOpen(true);
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

  // Get consumption forecasts
  const forecasts = useConsumptionForecast(items, feedingRecords, inputApplications);
  
  // Helper functions for forecast display
  const getForecastForItem = (itemId: string) => {
    return forecasts.find(f => f.itemId === itemId);
  };

  const getProgressValue = (daysRemaining: number) => {
    const maxDays = 30;
    return Math.min(100, Math.max(0, (daysRemaining / maxDays) * 100));
  };

  const getUrgencyColor = (daysRemaining: number) => {
    if (daysRemaining <= 3) return 'text-red-600';
    if (daysRemaining <= 7) return 'text-orange-600';
    if (daysRemaining <= 14) return 'text-yellow-600';
    return 'text-green-600';
  };

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
                    Adicionar Novo Item
                  </Button>
                </DialogTrigger>
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

                     <div className="grid grid-cols-2 gap-4">
                       <div>
                         <Label htmlFor="purchase_unit">Unidade de Compra</Label>
                         <Select value={formData.purchase_unit} onValueChange={(value) => setFormData({...formData, purchase_unit: value})}>
                           <SelectTrigger>
                             <SelectValue />
                           </SelectTrigger>
                           <SelectContent>
                             {Object.entries(PURCHASE_UNITS).map(([key, unit]) => (
                               <SelectItem key={key} value={key}>{unit.name}</SelectItem>
                             ))}
                           </SelectContent>
                         </Select>
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

                     <div className="grid grid-cols-3 gap-4">
                       <div>
                         <Label htmlFor="purchase_quantity">
                           Quantidade ({PURCHASE_UNITS[formData.purchase_unit]?.name || 'unidade'})
                         </Label>
                         <Input
                           id="purchase_quantity"
                           type="number"
                           step="0.001"
                           value={formData.purchase_quantity}
                           onChange={(e) => setFormData({...formData, purchase_quantity: e.target.value})}
                           required
                           placeholder="Ex: 2 (para 2 sacas)"
                         />
                       </div>
                       <div>
                         <Label htmlFor="purchase_unit_price">
                           Preço por {PURCHASE_UNITS[formData.purchase_unit]?.name || 'unidade'} (R$)
                         </Label>
                         <Input
                           id="purchase_unit_price"
                           type="number"
                           step="0.01"
                           value={formData.purchase_unit_price}
                           onChange={(e) => setFormData({...formData, purchase_unit_price: e.target.value})}
                           required
                           placeholder="Ex: 80.00"
                         />
                       </div>
                       <div>
                         <Label htmlFor="minimum_stock_threshold">Limite Mínimo (kg)</Label>
                         <Input
                           id="minimum_stock_threshold"
                           type="number"
                           value={formData.minimum_stock_threshold}
                           onChange={(e) => setFormData({...formData, minimum_stock_threshold: e.target.value})}
                           placeholder="Ex: 50"
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

               <PurchaseConfirmModal
                 isOpen={confirmModalOpen}
                 onClose={() => setConfirmModalOpen(false)}
                 onConfirm={handleConfirmSubmit}
                 itemName={formData.name}
                 quantity={parseFloat(formData.purchase_quantity) || 0}
                 unit={formData.purchase_unit}
                 unitPrice={parseFloat(formData.purchase_unit_price) || 0}
                 isNewItem={!editingItem}
               />
              
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setMixtureModalOpen(true)}
              >
                Mistura
              </Button>
            </div>
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

          {/* Stock Alerts */}
          <StockAlerts 
            inventoryData={items} 
            onItemClick={(itemId) => {
              const item = items.find(i => i.id === itemId);
              if (item) setSelectedItemForHistory(item);
            }}
          />

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
                     {categoryItems.map((item) => {
                       const forecast = getForecastForItem(item.id);
                       
                       return (
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
                                     onClick={() => handleNewPurchase(item)}
                                     className="text-green-600 hover:text-green-700"
                                   >
                                     <ShoppingCart className="w-4 h-4 mr-1" />
                                     Nova Compra
                                   </Button>
                                  
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                      >
                                        <MoreVertical className="w-4 h-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                       <DropdownMenuItem 
                                         onClick={() => handleConfigureAlerts(item)}
                                       >
                                         <AlertTriangle className="w-4 h-4 mr-2" />
                                         Configurar Alertas
                                       </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => startEdit(item)}>
                                        <Edit className="w-4 h-4 mr-2" />
                                        Editar Item
                                      </DropdownMenuItem>
                                      <DropdownMenuItem 
                                        onClick={() => handleDelete(item.id)}
                                        className="text-destructive focus:text-destructive"
                                      >
                                        <Trash2 className="w-4 h-4 mr-2" />
                                        Excluir Item
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                             </div>
                             
                             {/* Consumption Forecast Info */}
                             {forecast && (
                               <div className="mt-4 pt-4 border-t space-y-3">
                                 <div className="flex items-center justify-between">
                                   <div className="flex items-center gap-2">
                                     <TrendingDown className="w-4 h-4 text-muted-foreground" />
                                     <span className="text-sm font-medium">Previsão de Consumo</span>
                                   </div>
                                   <div className={`flex items-center gap-1 text-sm font-semibold ${getUrgencyColor(forecast.estimatedDaysRemaining)}`}>
                                     {forecast.estimatedDaysRemaining <= 7 ? (
                                       <Clock className="w-4 h-4" />
                                     ) : (
                                       <Calendar className="w-4 h-4" />
                                     )}
                                     {forecast.estimatedDaysRemaining > 999 ? '999+' : forecast.estimatedDaysRemaining} dias
                                   </div>
                                 </div>
                                 
                                 <div className="space-y-2">
                                   <div className="flex justify-between text-xs text-muted-foreground">
                                     <span>Duração estimada</span>
                                     <span>{forecast.estimatedDaysRemaining > 999 ? 'Sem previsão' : `${forecast.estimatedDaysRemaining} dias restantes`}</span>
                                   </div>
                                   <Progress 
                                     value={getProgressValue(forecast.estimatedDaysRemaining)} 
                                     className="h-1.5"
                                   />
                                 </div>
                                 
                                 <div className="grid grid-cols-2 gap-4 text-xs">
                                   <div>
                                     <span className="text-muted-foreground">Consumo diário:</span>
                                     <p className="font-medium">
                                       {forecast.averageDailyConsumption > 0 
                                         ? `${QuantityUtils.formatKg(QuantityUtils.kgToGrams(forecast.averageDailyConsumption))}kg/dia`
                                         : 'Sem uso recente'
                                       }
                                     </p>
                                   </div>
                                   <div>
                                     <span className="text-muted-foreground">Último uso:</span>
                                     <p className="font-medium">
                                       {forecast.lastUsageDate 
                                         ? format(new Date(forecast.lastUsageDate), 'dd/MM/yy', { locale: ptBR })
                                         : 'Nunca usado'
                                       }
                                     </p>
                                   </div>
                                 </div>
                               </div>
                             )}
                           </CardContent>
                         </Card>
                       );
                     })}
                  </div>
                </div>
              ));
            })()}
          </div>

          {filteredItems.length === 0 && (
            <div className="text-center py-12">
              <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-2xl font-semibold mb-2">
                {searchTerm || selectedCategory !== "all" ? "Nenhum item encontrado" : "Estoque vazio"}
              </h2>
              <p className="text-muted-foreground mb-6">
                {searchTerm || selectedCategory !== "all" 
                  ? "Tente ajustar os filtros de busca." 
                  : "Comece adicionando itens ao seu estoque."
                }
              </p>
            </div>
          )}

          {/* Movement History - Last component */}
          {selectedItemForHistory && (
            <MovementHistory
              itemId={selectedItemForHistory.id}
              itemName={selectedItemForHistory.name}
              itemCategory={selectedItemForHistory.category}
              currentStock={QuantityUtils.gramsToKg(selectedItemForHistory.quantity)}
            />
          )}
        </div>
      </div>

      {/* Modals */}
      <NewPurchaseModal
        isOpen={newPurchaseModalOpen}
        onClose={() => setNewPurchaseModalOpen(false)}
        item={selectedItemForPurchase}
        onSuccess={fetchInventoryItems}
      />

      <AlertConfigModal
        isOpen={alertConfigModalOpen}
        onClose={() => setAlertConfigModalOpen(false)}
        item={selectedItemForAlert}
        onSuccess={fetchInventoryItems}
      />

      <MixtureModal
        isOpen={mixtureModalOpen}
        onClose={() => setMixtureModalOpen(false)}
        farmId={farms[0]?.id || ''}
        onSuccess={fetchInventoryItems}
      />
    </Layout>
  );
}