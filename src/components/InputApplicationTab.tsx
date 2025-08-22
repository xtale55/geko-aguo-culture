import { useState, useEffect } from 'react';
import { QuantityUtils } from '@/lib/quantityUtils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, Calendar, Beaker, Trash2, Package } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getCurrentDateForInput, formatDateForDisplay } from '@/lib/utils';

interface PondBatch {
  id: string;
  pond: {
    id: string;
    name: string;
    area: number;
  };
  batch: {
    id: string;
    name: string;
  };
  stocking_date: string;
  current_population: number;
}

interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  unit_price: number;
  brand?: string;
}

interface InputApplication {
  id: string;
  pond_batch_id: string;
  input_item_id: string;
  input_item_name: string;
  application_date: string;
  application_time?: string;
  quantity_applied: number;
  unit_cost?: number;
  total_cost?: number;
  dosage_per_hectare?: number;
  purpose?: string;
  notes?: string;
  pond_batches: {
    pond: {
      name: string;
      area: number;
    };
    batch: {
      name: string;
    };
  };
}

const PURPOSE_OPTIONS = [
  { value: 'water_preparation', label: 'Preparação da Água' },
  { value: 'ph_correction', label: 'Correção de pH' },
  { value: 'fertilization', label: 'Fertilização' },
  { value: 'probiotic', label: 'Probiótico' },
  { value: 'lime_treatment', label: 'Tratamento com Cal' },
  { value: 'disinfection', label: 'Desinfecção' },
  { value: 'other', label: 'Outros' }
];

export function InputApplicationTab() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [pondBatches, setPondBatches] = useState<PondBatch[]>([]);
  const [fertilizers, setFertilizers] = useState<InventoryItem[]>([]);
  const [applications, setApplications] = useState<InputApplication[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    pond_batch_id: '',
    input_item_id: '',
    application_date: getCurrentDateForInput(),
    application_time: '',
    quantity_applied: '',
    purpose: '',
    notes: ''
  });

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchActivePondBatches(),
        fetchFertilizers(),
        fetchApplications()
      ]);
    } finally {
      setLoading(false);
    }
  };

  const fetchActivePondBatches = async () => {
    const { data, error } = await supabase
      .from('pond_batches')
      .select(`
        id,
        stocking_date,
        current_population,
        cycle_status,
        pond:ponds!inner(
          id,
          name,
          area,
          status,
          farm:farms!inner(user_id)
        ),
        batch:batches!inner(
          id,
          name,
          status
        )
      `)
      .eq('pond.farm.user_id', user?.id)
      .eq('batch.status', 'active')
      .eq('cycle_status', 'active')
      .eq('pond.status', 'in_use')
      .gt('current_population', 0);

    if (error) {
      console.error('Error fetching pond batches:', error);
      return;
    }

    setPondBatches(data || []);
  };

  const fetchFertilizers = async () => {
    const { data, error } = await supabase
      .from('inventory')
      .select(`
        id,
        name,
        quantity,
        unit_price,
        brand,
        farm:farms!inner(user_id)
      `)
      .eq('category', 'Fertilizantes')
      .eq('farm.user_id', user?.id)
      .gt('quantity', 0);

    if (error) {
      console.error('Error fetching fertilizers:', error);
      return;
    }

    setFertilizers(data || []);
  };

  const fetchApplications = async () => {
    // First get applications with pond_batch_id to filter by user
    const { data: userPondBatches } = await supabase
      .from('pond_batches')
      .select('id')
      .in('pond_id', (
        await supabase
          .from('ponds')
          .select('id')
          .in('farm_id', (
            await supabase
              .from('farms')
              .select('id')
              .eq('user_id', user?.id)
          ).data?.map(f => f.id) || [])
      ).data?.map(p => p.id) || []);

    if (!userPondBatches?.length) {
      setApplications([]);
      return;
    }

    const { data, error } = await supabase
      .from('input_applications')
      .select(`
        id,
        pond_batch_id,
        input_item_id,
        input_item_name,
        application_date,
        application_time,
        quantity_applied,
        unit_cost,
        total_cost,
        dosage_per_hectare,
        purpose,
        notes
      `)
      .in('pond_batch_id', userPondBatches.map(pb => pb.id))
      .order('application_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching applications:', error);
      return;
    }

    // Get pond batch details for each application
    const applicationsWithDetails = await Promise.all(
      (data || []).map(async (app) => {
        const { data: pondBatchData } = await supabase
          .from('pond_batches')
          .select(`
            pond:ponds(name, area),
            batch:batches(name)
          `)
          .eq('id', app.pond_batch_id)
          .single();

        return {
          ...app,
          pond_batches: pondBatchData || { pond: { name: '', area: 0 }, batch: { name: '' } }
        };
      })
    );

    setApplications(applicationsWithDetails);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.pond_batch_id || !formData.input_item_id || !formData.quantity_applied) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive"
      });
      return;
    }

    setSubmitting(true);
    try {
      // Get selected fertilizer details
      const selectedFertilizer = fertilizers.find(f => f.id === formData.input_item_id);
      if (!selectedFertilizer) {
        throw new Error('Fertilizante não encontrado');
      }

      // Check if quantity is available (Anti-Drift: usar QuantityUtils para conversão precisa)
      const quantityAppliedGrams = QuantityUtils.parseInputToGrams(formData.quantity_applied);
      const quantityApplied = QuantityUtils.gramsToKg(quantityAppliedGrams);
      if (quantityAppliedGrams > selectedFertilizer.quantity) {
        toast({
          title: "Erro",
          description: `Quantidade insuficiente em estoque. Disponível: ${QuantityUtils.formatKg(selectedFertilizer.quantity)}kg`,
          variant: "destructive"
        });
        return;
      }

      // Get pond area for dosage calculation
      const selectedPondBatch = pondBatches.find(pb => pb.id === formData.pond_batch_id);
      const dosagePerHectare = selectedPondBatch ? quantityApplied / selectedPondBatch.pond.area : null;

      // Calculate costs
      const unitCost = selectedFertilizer.unit_price;
      const totalCost = quantityApplied * unitCost;

      // Insert application record
      const { error: insertError } = await supabase
        .from('input_applications')
        .insert({
          pond_batch_id: formData.pond_batch_id,
          input_item_id: formData.input_item_id,
          input_item_name: selectedFertilizer.name,
          application_date: formData.application_date,
          application_time: formData.application_time || null,
          quantity_applied: quantityAppliedGrams,
          unit_cost: unitCost,
          total_cost: totalCost,
          dosage_per_hectare: dosagePerHectare,
          purpose: formData.purpose || null,
          notes: formData.notes || null
        });

      if (insertError) throw insertError;

      // Update inventory quantity (Anti-Drift: operação com inteiros)
      const newQuantity = selectedFertilizer.quantity - quantityAppliedGrams;
      const { error: updateError } = await supabase
        .from('inventory')
        .update({ quantity: newQuantity })
        .eq('id', formData.input_item_id);

      if (updateError) throw updateError;

      toast({
        title: "Sucesso",
        description: "Aplicação de insumo registrada com sucesso"
      });

      setFormData({
        pond_batch_id: '',
        input_item_id: '',
        application_date: getCurrentDateForInput(),
        application_time: '',
        quantity_applied: '',
        purpose: '',
        notes: ''
      });
      setIsDialogOpen(false);
      fetchData();
    } catch (error) {
      console.error('Error creating application:', error);
      toast({
        title: "Erro",
        description: "Erro ao registrar aplicação",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (applicationId: string, itemId: string, quantity: number) => {
    try {
      // Delete application record
      const { error: deleteError } = await supabase
        .from('input_applications')
        .delete()
        .eq('id', applicationId);

      if (deleteError) throw deleteError;

      // Restore inventory quantity
      const { data: currentItem } = await supabase
        .from('inventory')
        .select('quantity')
        .eq('id', itemId)
        .single();

      if (currentItem) {
        const { error: updateError } = await supabase
          .from('inventory')
          .update({ quantity: currentItem.quantity + quantity })
          .eq('id', itemId);

        if (updateError) throw updateError;
      }

      toast({
        title: "Sucesso",
        description: "Aplicação removida e estoque restaurado"
      });

      fetchData();
    } catch (error) {
      console.error('Error deleting application:', error);
      toast({
        title: "Erro",
        description: "Erro ao remover aplicação",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return <div className="flex justify-center p-8">Carregando...</div>;
  }

  const selectedFertilizer = fertilizers.find(f => f.id === formData.input_item_id);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Aplicação de Insumos</h2>
          <p className="text-muted-foreground">
            Registre o uso de fertilizantes, probióticos e outros insumos
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Nova Aplicação
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Registrar Aplicação de Insumo</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="pond_batch_id">Viveiro/Lote *</Label>
                <Select value={formData.pond_batch_id} onValueChange={(value) => setFormData({...formData, pond_batch_id: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o viveiro" />
                  </SelectTrigger>
                  <SelectContent>
                    {pondBatches.map((pb) => (
                      <SelectItem key={pb.id} value={pb.id}>
                        {pb.pond.name} - {pb.batch.name} ({pb.pond.area}ha)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="input_item_id">Insumo *</Label>
                <Select value={formData.input_item_id} onValueChange={(value) => setFormData({...formData, input_item_id: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o insumo" />
                  </SelectTrigger>
                  <SelectContent>
                    {fertilizers.map((fertilizer) => (
                      <SelectItem key={fertilizer.id} value={fertilizer.id}>
                        {fertilizer.name} {fertilizer.brand && `(${fertilizer.brand})`} - {QuantityUtils.formatKg(fertilizer.quantity)}kg disponível
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="application_date">Data *</Label>
                  <Input
                    id="application_date"
                    type="date"
                    value={formData.application_date}
                    onChange={(e) => setFormData({...formData, application_date: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="application_time">Horário</Label>
                  <Input
                    id="application_time"
                    type="time"
                    value={formData.application_time}
                    onChange={(e) => setFormData({...formData, application_time: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="quantity_applied">Quantidade Aplicada (kg) *</Label>
                <Input
                  id="quantity_applied"
                  type="number"
                  step="0.01"
                  min="0"
                  max={selectedFertilizer ? QuantityUtils.gramsToKg(selectedFertilizer.quantity) : 999999}
                  value={formData.quantity_applied}
                  onChange={(e) => setFormData({...formData, quantity_applied: e.target.value})}
                  required
                />
                {selectedFertilizer && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Disponível: {QuantityUtils.formatKg(selectedFertilizer.quantity)}kg - Custo: R$ {selectedFertilizer.unit_price}/kg
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="purpose">Finalidade</Label>
                <Select value={formData.purpose} onValueChange={(value) => setFormData({...formData, purpose: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a finalidade" />
                  </SelectTrigger>
                  <SelectContent>
                    {PURPOSE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="notes">Observações</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  placeholder="Observações sobre a aplicação..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Salvando...' : 'Salvar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Viveiros Ativos</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pondBatches.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Insumos Disponíveis</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fertilizers.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aplicações (30d)</CardTitle>
            <Beaker className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {applications.filter(app => {
                const appDate = new Date(app.application_date);
                const thirtyDaysAgo = new Date();
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                return appDate >= thirtyDaysAgo;
              }).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Applications History */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Aplicações</CardTitle>
          <CardDescription>
            Últimas aplicações de insumos registradas
          </CardDescription>
        </CardHeader>
        <CardContent>
          {applications.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Beaker className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma aplicação registrada</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Viveiro</TableHead>
                  <TableHead>Insumo</TableHead>
                  <TableHead>Quantidade</TableHead>
                  <TableHead>Finalidade</TableHead>
                  <TableHead>Custo</TableHead>
                  <TableHead className="w-[100px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {applications.map((application) => (
                  <TableRow key={application.id}>
                    <TableCell>
                      {format(new Date(application.application_date), 'dd/MM/yyyy', { locale: ptBR })}
                      {application.application_time && (
                        <div className="text-sm text-muted-foreground">
                          {application.application_time.slice(0, 5)}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{application.pond_batches.pond.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {application.pond_batches.batch.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{application.input_item_name}</div>
                      {application.dosage_per_hectare && (
                        <div className="text-sm text-muted-foreground">
                          {application.dosage_per_hectare.toFixed(2)} kg/ha
                        </div>
                      )}
                    </TableCell>
                    <TableCell>{QuantityUtils.formatKg(application.quantity_applied)} kg</TableCell>
                    <TableCell>
                      {application.purpose && (
                        <Badge variant="secondary">
                          {PURPOSE_OPTIONS.find(p => p.value === application.purpose)?.label || application.purpose}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {application.total_cost ? `R$ ${application.total_cost.toFixed(2)}` : '-'}
                    </TableCell>
                    <TableCell>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Confirmar remoção</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta ação irá remover o registro de aplicação e restaurar {QuantityUtils.formatKg(application.quantity_applied)}kg ao estoque. Esta ação não pode ser desfeita.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => handleDelete(application.id, application.input_item_id, application.quantity_applied)}
                            >
                              Remover
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}