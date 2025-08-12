import { useEffect, useState } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Package, Plus, ArrowLeft, Trash2, ShoppingCart, TrendingDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface InventoryItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit_price: number;
  total_value: number;
  brand: string;
  supplier: string;
  entry_date: string;
  created_at: string;
}

export default function Inventory() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      loadInventory();
    }
  }, [user]);

  const loadInventory = async () => {
    try {
      // Load farms first
      const { data: farmsData, error: farmsError } = await supabase
        .from('farms')
        .select('id')
        .eq('user_id', user?.id);

      if (farmsError) throw farmsError;

      if (farmsData && farmsData.length > 0) {
        // Load inventory items
        const { data: inventoryData, error: inventoryError } = await supabase
          .from('inventory')
          .select('*')
          .eq('farm_id', farmsData[0].id)
          .order('created_at', { ascending: false });

        if (inventoryError) throw inventoryError;
        setItems(inventoryData || []);
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setSubmitting(true);

    try {
      // Get farm ID
      const { data: farmsData, error: farmsError } = await supabase
        .from('farms')
        .select('id')
        .eq('user_id', user?.id);

      if (farmsError) throw farmsError;

      const quantity = parseFloat(formData.get('quantity') as string);
      const unitPrice = parseFloat(formData.get('unit_price') as string);

      const { error } = await supabase
        .from('inventory')
        .insert([{
          farm_id: farmsData![0].id,
          name: formData.get('name') as string,
          category: formData.get('category') as string,
          quantity: quantity,
          unit_price: unitPrice,
          total_value: quantity * unitPrice,
          brand: formData.get('brand') as string,
          supplier: formData.get('supplier') as string,
          entry_date: formData.get('entry_date') as string
        }]);

      if (error) throw error;

      toast({
        title: "Item adicionado!",
        description: "O item foi adicionado ao estoque com sucesso."
      });

      setShowDialog(false);
      loadInventory();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('Tem certeza que deseja excluir este item?')) return;

    try {
      const { error } = await supabase
        .from('inventory')
        .delete()
        .eq('id', itemId);

      if (error) throw error;

      toast({
        title: "Item excluído",
        description: "O item foi removido do estoque."
      });

      loadInventory();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message
      });
    }
  };

  const getTotalValue = () => {
    return items.reduce((sum, item) => sum + item.total_value, 0);
  };

  const getItemsByCategory = (category: string) => {
    return items.filter(item => item.category === category);
  };

  if (loading) {
    return (
      <Layout>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  const categories = ['feed', 'inputs', 'others'];
  const categoryLabels = { feed: 'Ração', inputs: 'Insumos', others: 'Outros' };
  const categoryColors = { 
    feed: 'bg-success', 
    inputs: 'bg-primary', 
    others: 'bg-secondary' 
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
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
            <h1 className="text-3xl font-bold text-foreground">Controle de Estoque</h1>
            <p className="text-muted-foreground">
              Gerencie ração, insumos e outros materiais da fazenda
            </p>
          </div>
          <Dialog open={showDialog} onOpenChange={setShowDialog}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-primary to-accent">
                <Plus className="w-4 h-4 mr-2" />
                Novo Item
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar Item ao Estoque</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddItem} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome do Item</Label>
                  <Input
                    id="name"
                    name="name"
                    placeholder="Ex: Ração Premium 32%"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Categoria</Label>
                  <Select name="category" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="feed">Ração</SelectItem>
                      <SelectItem value="inputs">Insumos</SelectItem>
                      <SelectItem value="others">Outros</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="quantity">Quantidade (kg)</Label>
                    <Input
                      id="quantity"
                      name="quantity"
                      type="number"
                      step="0.01"
                      placeholder="Ex: 500"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="unit_price">Preço Unitário (R$/kg)</Label>
                    <Input
                      id="unit_price"
                      name="unit_price"
                      type="number"
                      step="0.01"
                      placeholder="Ex: 3.50"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="brand">Marca</Label>
                  <Input
                    id="brand"
                    name="brand"
                    placeholder="Ex: Guabi"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="supplier">Fornecedor</Label>
                  <Input
                    id="supplier"
                    name="supplier"
                    placeholder="Ex: Distribuidora ABC"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="entry_date">Data de Entrada</Label>
                  <Input
                    id="entry_date"
                    name="entry_date"
                    type="date"
                    defaultValue={new Date().toISOString().split('T')[0]}
                    required
                  />
                </div>
                <div className="flex gap-2 pt-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setShowDialog(false)}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={submitting}
                    className="flex-1"
                  >
                    {submitting ? 'Salvando...' : 'Adicionar Item'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Valor Total</p>
                  <p className="text-2xl font-bold text-primary">
                    R$ {getTotalValue().toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <Package className="w-8 h-8 text-primary/70" />
              </div>
            </CardContent>
          </Card>

          {categories.map((category) => {
            const categoryItems = getItemsByCategory(category);
            const categoryValue = categoryItems.reduce((sum, item) => sum + item.total_value, 0);
            
            return (
              <Card key={category} className="bg-gradient-to-br from-secondary/30 to-secondary/10 border-secondary/40">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        {categoryLabels[category]}
                      </p>
                      <p className="text-2xl font-bold text-secondary-foreground">
                        {categoryItems.length}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        R$ {categoryValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <ShoppingCart className="w-8 h-8 text-secondary-foreground/70" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Inventory Items */}
        {items.length === 0 ? (
          <Card className="p-12 text-center">
            <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Estoque vazio</h3>
            <p className="text-muted-foreground mb-6">
              Comece adicionando itens ao seu estoque.
            </p>
            <Button onClick={() => setShowDialog(true)} className="bg-gradient-to-r from-primary to-accent">
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Primeiro Item
            </Button>
          </Card>
        ) : (
          <div>
            <h2 className="text-2xl font-semibold mb-4">Itens em Estoque</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {items.map((item) => (
                <Card key={item.id} className="shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-ocean)] transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg line-clamp-1">{item.name}</CardTitle>
                      <Badge className={categoryColors[item.category]}>
                        {categoryLabels[item.category]}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Quantidade:</span>
                        <span className="font-medium">{item.quantity.toLocaleString()} kg</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Preço/kg:</span>
                        <span className="font-medium">
                          R$ {item.unit_price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Valor Total:</span>
                        <span className="font-medium text-primary">
                          R$ {item.total_value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      {item.brand && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Marca:</span>
                          <span className="font-medium">{item.brand}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Entrada:</span>
                        <span className="font-medium">
                          {new Date(item.entry_date).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-border">
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="flex-1"
                          disabled={item.quantity <= 0}
                        >
                          <TrendingDown className="w-4 h-4 mr-1" />
                          Usar
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleDeleteItem(item.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}