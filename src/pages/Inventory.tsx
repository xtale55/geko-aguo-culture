import { useState, useEffect } from "react";
import { Plus, Search, Package, Trash2, Edit, ArrowLeft } from "lucide-react";
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
  "Medicamentos", 
  "Equipamentos",
  "Fertilizantes",
  "Pós-Larvas",
  "Combustível",
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
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    category: "",
    brand: "",
    supplier: "",
    quantity: 0,
    unit_price: 0,
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
    
    const total_value = formData.quantity * formData.unit_price;
    const itemData = { ...formData, total_value };

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

  const resetForm = () => {
    setFormData({
      name: "",
      category: "",
      brand: "",
      supplier: "",
      quantity: 0,
      unit_price: 0,
      entry_date: new Date().toISOString().split('T')[0],
      farm_id: farms[0]?.id || ""
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
      quantity: item.quantity,
      unit_price: item.unit_price,
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

  const totalValue = filteredItems.reduce((sum, item) => sum + item.total_value, 0);

  if (loading) {
    return <div className="flex justify-center items-center h-64">Carregando...</div>;
  }

  return (
    <Layout>
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
            <h1 className="text-3xl font-bold">Controle de Estoque</h1>
          </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingItem(null)}>
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Item
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

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="quantity">Quantidade (kg)</Label>
                  <Input
                    id="quantity"
                    type="number"
                    step="0.01"
                    value={formData.quantity}
                    onChange={(e) => setFormData({...formData, quantity: parseFloat(e.target.value) || 0})}
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
                    onChange={(e) => setFormData({...formData, unit_price: parseFloat(e.target.value) || 0})}
                    required
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

      {/* Lista de Itens */}
      <div className="grid gap-4">
        {filteredItems.map((item) => (
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
                    <p className="font-medium">{item.quantity.toLocaleString('pt-BR')}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-muted-foreground">Preço Unit.</p>
                    <p className="font-medium">R$ {item.unit_price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-muted-foreground">Valor Total</p>
                    <p className="font-bold text-primary">R$ {item.total_value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
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
    </Layout>
  );
}