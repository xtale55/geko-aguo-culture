import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ClockCounterClockwise, Shrimp, Calendar, MapPin, PencilSimple, Trash } from '@phosphor-icons/react';
import { BatchEditModal } from './BatchEditModal';
import { BatchDeleteModal } from './BatchDeleteModal';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface StockingRecord {
  id: string;
  batch_name: string;
  arrival_date: string;
  total_pl_quantity: number;
  pl_size: number;
  pl_cost: number;
  survival_rate: number;
  status: string;
  pond_allocations: {
    pond_name: string;
    pl_quantity: number;
    preparation_cost: number;
    current_population: number;
    cycle_status: string;
  }[];
  farm_name: string;
}

export function StockingHistory() {
  const { user } = useAuth();
  const [stockingRecords, setStockingRecords] = useState<StockingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<any>(null);

  useEffect(() => {
    if (user) {
      loadStockingHistory();
    }
  }, [user]);

  const loadStockingHistory = async () => {
    try {
      setLoading(true);

      const { data: batchesData, error: batchesError } = await supabase
        .from('batches')
        .select(`
          id,
          name,
          arrival_date,
          total_pl_quantity,
          pl_size,
          pl_cost,
          survival_rate,
          status,
          farms!inner (
            name,
            user_id
          ),
          pond_batches (
            pl_quantity,
            preparation_cost,
            current_population,
            cycle_status,
            ponds (
              name
            )
          )
        `)
        .eq('farms.user_id', user?.id)
        .order('arrival_date', { ascending: false })
        .limit(10);

      if (batchesError) throw batchesError;

      const formattedRecords: StockingRecord[] = batchesData?.map((batch: any) => ({
        id: batch.id,
        batch_name: batch.name,
        arrival_date: batch.arrival_date,
        total_pl_quantity: batch.total_pl_quantity,
        pl_size: batch.pl_size,
        pl_cost: batch.pl_cost,
        survival_rate: batch.survival_rate,
        status: batch.status,
        farm_name: batch.farms.name,
        pond_allocations: batch.pond_batches?.map((pb: any) => ({
          pond_name: pb.ponds.name,
          pl_quantity: pb.pl_quantity,
          preparation_cost: pb.preparation_cost,
          current_population: pb.current_population,
          cycle_status: pb.cycle_status
        })) || []
      })) || [];

      setStockingRecords(formattedRecords);

    } catch (error: any) {
      console.error('Error loading stocking history:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string, cycleStatus?: string) => {
    if (cycleStatus === 'completed' || status === 'completed') return 'bg-green-100 text-green-800';
    if (status === 'active') return 'bg-blue-100 text-blue-800';
    return 'bg-gray-100 text-gray-800';
  };

  const getStatusText = (status: string, cycleStatus?: string) => {
    if (cycleStatus === 'completed' || status === 'completed') return 'Finalizado';
    if (status === 'active') return 'Ativo';
    return 'Inativo';
  };

  const handleEditBatch = (record: StockingRecord) => {
    setSelectedBatch({
      id: record.id,
      name: record.batch_name,
      arrival_date: record.arrival_date,
      total_pl_quantity: record.total_pl_quantity,
      pl_size: record.pl_size,
      pl_cost: record.pl_cost,
      survival_rate: record.survival_rate
    });
    setEditModalOpen(true);
  };

  const handleDeleteBatch = (record: StockingRecord) => {
    setSelectedBatch({
      id: record.id,
      name: record.batch_name,
      pond_allocations: record.pond_allocations
    });
    setDeleteModalOpen(true);
  };

  const handleModalSuccess = () => {
    loadStockingHistory();
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClockCounterClockwise className="h-5 w-5" />
            Histórico de Povoamentos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClockCounterClockwise className="h-5 w-5" />
          Histórico de Povoamentos
        </CardTitle>
        <CardDescription>
          Últimos povoamentos realizados na fazenda
        </CardDescription>
      </CardHeader>
      <CardContent>
        {stockingRecords.length === 0 ? (
          <div className="text-center py-8">
            <Shrimp className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum povoamento encontrado</h3>
            <p className="text-muted-foreground">
              Os povoamentos realizados aparecerão aqui
            </p>
          </div>
        ) : (
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {stockingRecords.map((record) => (
              <Card key={record.id} className="border-l-4 border-l-primary">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Shrimp className="h-4 w-4" />
                        {record.batch_name}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-2 mt-1">
                        <MapPin className="h-3 w-3" />
                        {record.farm_name}
                        <Calendar className="h-3 w-3 ml-2" />
                        {format(new Date(record.arrival_date), 'dd/MM/yyyy', { locale: ptBR })}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditBatch(record)}
                        >
                          <PencilSimple className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteBatch(record)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash className="h-3 w-3" />
                        </Button>
                      </div>
                      <Badge className={getStatusColor(record.status)}>
                        {getStatusText(record.status)}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Batch Summary */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Quantidade Total</p>
                      <p className="font-medium">{record.total_pl_quantity.toLocaleString()} PLs</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">PL/g</p>
                      <p className="font-medium">{record.pl_size}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Custo/Milheiro</p>
                      <p className="font-medium">R$ {record.pl_cost.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Taxa Sobrevivência</p>
                      <p className="font-medium">{record.survival_rate}%</p>
                    </div>
                  </div>

                  {/* Pond Allocations */}
                  {record.pond_allocations.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">Distribuição por Viveiro:</h4>
                      <div className="grid gap-2 md:grid-cols-2">
                        {record.pond_allocations.map((allocation, index) => (
                          <div key={index} className="bg-muted rounded-lg p-3">
                            <div className="flex items-center justify-between mb-2">
                              <h5 className="font-medium">{allocation.pond_name}</h5>
                              <Badge 
                                className={getStatusColor('', allocation.cycle_status)}
                              >
                                {getStatusText('', allocation.cycle_status)}
                              </Badge>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div>
                                <p className="text-muted-foreground">PLs Estocados</p>
                                <p className="font-medium">{allocation.pl_quantity.toLocaleString()}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">População Atual</p>
                                <p className="font-medium">{allocation.current_population.toLocaleString()}</p>
                              </div>
                              <div className="col-span-2">
                                <p className="text-muted-foreground">Custo Preparação</p>
                                <p className="font-medium">R$ {allocation.preparation_cost.toFixed(2)}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>

      <BatchEditModal
        isOpen={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setSelectedBatch(null);
        }}
        onSuccess={handleModalSuccess}
        batch={selectedBatch}
      />

      <BatchDeleteModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setSelectedBatch(null);
        }}
        onSuccess={handleModalSuccess}
        batch={selectedBatch}
      />
    </Card>
  );
}