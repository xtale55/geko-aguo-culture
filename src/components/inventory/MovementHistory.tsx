import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useInventoryMovements } from '@/hooks/useInventoryMovements';
import { QuantityUtils } from '@/lib/quantityUtils';
import { useToast } from '@/hooks/use-toast';
import { History, TrendingUp, TrendingDown, Plus, RotateCcw } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface MovementHistoryProps {
  itemId: string;
  itemName: string;
  itemCategory: string;
  currentStock: number;
}

export function MovementHistory({ itemId, itemName, itemCategory, currentStock }: MovementHistoryProps) {
  const { movements, loading, createManualMovement, refreshMovements } = useInventoryMovements(itemId);
  const [isManualDialogOpen, setIsManualDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const [manualData, setManualData] = useState({
    type: 'entrada' as 'entrada' | 'ajuste',
    quantity: '',
    reason: '',
    notes: ''
  });

  const handleManualMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualData.quantity || !manualData.reason) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive"
      });
      return;
    }

    setSubmitting(true);
    try {
      const quantityGrams = QuantityUtils.parseInputToGrams(manualData.quantity);
      let quantityChange = quantityGrams;
      
      if (manualData.type === 'ajuste') {
        // For adjustments, calculate the difference from current stock
        quantityChange = quantityGrams - QuantityUtils.kgToGrams(currentStock);
      }

      const result = await createManualMovement(
        itemId,
        manualData.type,
        quantityChange,
        manualData.reason,
        manualData.notes
      );

      if (result.success) {
        toast({
          title: "Movimentação registrada",
          description: `${manualData.type === 'entrada' ? 'Entrada' : 'Ajuste'} de ${QuantityUtils.formatKg(quantityGrams)}kg registrada`
        });
        setManualData({
          type: 'entrada',
          quantity: '',
          reason: '',
          notes: ''
        });
        setIsManualDialogOpen(false);
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getMovementIcon = (type: string) => {
    switch (type) {
      case 'entrada':
        return <TrendingUp className="w-4 h-4 text-emerald-600" />;
      case 'saida':
        return <TrendingDown className="w-4 h-4 text-red-600" />;
      case 'ajuste':
        return <RotateCcw className="w-4 h-4 text-blue-600" />;
      default:
        return <History className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getMovementBadgeColor = (type: string) => {
    switch (type) {
      case 'entrada':
        return 'bg-emerald-100 text-emerald-800';
      case 'saida':
        return 'bg-red-100 text-red-800';
      case 'ajuste':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              Histórico de Movimentações
            </CardTitle>
            <CardDescription>
              {itemName} ({itemCategory}) - Estoque atual: {QuantityUtils.formatKg(QuantityUtils.kgToGrams(currentStock))}kg
            </CardDescription>
          </div>
          <Dialog open={isManualDialogOpen} onOpenChange={setIsManualDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Movimentação Manual
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Movimentação Manual - {itemName}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleManualMovement} className="space-y-4">
                <div>
                  <Label htmlFor="type">Tipo de Movimentação</Label>
                  <Select value={manualData.type} onValueChange={(value: 'entrada' | 'ajuste') => setManualData({...manualData, type: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="entrada">Entrada</SelectItem>
                      <SelectItem value="ajuste">Ajuste de Estoque</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="quantity">
                    {manualData.type === 'entrada' ? 'Quantidade a Adicionar (kg)' : 'Nova Quantidade Total (kg)'}
                  </Label>
                  <Input
                    id="quantity"
                    type="number"
                    step="0.01"
                    min="0"
                    value={manualData.quantity}
                    onChange={(e) => setManualData({...manualData, quantity: e.target.value})}
                    required
                  />
                  {manualData.type === 'ajuste' && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Estoque atual: {QuantityUtils.formatKg(QuantityUtils.kgToGrams(currentStock))}kg
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="reason">Motivo *</Label>
                  <Input
                    id="reason"
                    value={manualData.reason}
                    onChange={(e) => setManualData({...manualData, reason: e.target.value})}
                    placeholder="Ex: Compra, Correção de estoque, etc."
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="notes">Observações</Label>
                  <Textarea
                    id="notes"
                    value={manualData.notes}
                    onChange={(e) => setManualData({...manualData, notes: e.target.value})}
                    placeholder="Observações adicionais..."
                  />
                </div>

                <div className="flex gap-2">
                  <Button type="submit" disabled={submitting}>
                    {submitting ? 'Salvando...' : 'Registrar'}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsManualDialogOpen(false)}
                  >
                    Cancelar
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-4">Carregando movimentações...</div>
        ) : movements.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            Nenhuma movimentação encontrada
          </div>
        ) : (
          <div className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Quantidade</TableHead>
                  <TableHead>Estoque</TableHead>
                  <TableHead>Motivo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movements.map((movement) => (
                  <TableRow key={movement.id}>
                    <TableCell>
                      {format(new Date(movement.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getMovementIcon(movement.movement_type)}
                        <Badge className={getMovementBadgeColor(movement.movement_type)}>
                          {movement.movement_type.charAt(0).toUpperCase() + movement.movement_type.slice(1)}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={movement.quantity_change >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                        {movement.quantity_change >= 0 ? '+' : ''}{QuantityUtils.formatKg(Math.abs(movement.quantity_change))}kg
                      </span>
                    </TableCell>
                    <TableCell>
                      {QuantityUtils.formatKg(movement.new_quantity)}kg
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{movement.reason}</p>
                        {movement.notes && (
                          <p className="text-sm text-muted-foreground">{movement.notes}</p>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}