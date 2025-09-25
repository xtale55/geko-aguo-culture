import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Scale, Skull, Droplets, Utensils, FlaskConical, DollarSign } from "lucide-react";

interface CycleManagementHistoryProps {
  cycleId: string;
}

interface BiometryRecord {
  measurement_date: string;
  average_weight: number;
  uniformity: number;
  sample_size: number;
}

interface MortalityRecord {
  record_date: string;
  dead_count: number;
  notes: string;
}

interface WaterQualityRecord {
  measurement_date: string;
  oxygen_level: number;
  temperature: number;
  ph_level: number;
  ammonia: number;
  nitrite: number;
  alkalinity: number;
  hardness: number;
  turbidity: number;
  notes: string;
}

interface FeedingRecord {
  feeding_date: string;
  feeding_time: string;
  actual_amount: number;
  unit_cost: number;
  feed_type_name: string;
  notes: string;
}

interface InputRecord {
  application_date: string;
  input_item_name: string;
  quantity_applied: number;
  total_cost: number;
  purpose: string;
  notes: string;
}

interface OperationalCostRecord {
  cost_date: string;
  category: string;
  description: string;
  amount: number;
}

export function CycleManagementHistory({ cycleId }: CycleManagementHistoryProps) {
  const [biometryRecords, setBiometryRecords] = useState<BiometryRecord[]>([]);
  const [mortalityRecords, setMortalityRecords] = useState<MortalityRecord[]>([]);
  const [waterQualityRecords, setWaterQualityRecords] = useState<WaterQualityRecord[]>([]);
  const [feedingRecords, setFeedingRecords] = useState<FeedingRecord[]>([]);
  const [inputRecords, setInputRecords] = useState<InputRecord[]>([]);
  const [operationalCostRecords, setOperationalCostRecords] = useState<OperationalCostRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadManagementHistory();
  }, [cycleId]);

  const loadManagementHistory = async () => {
    try {
      setLoading(true);

      // Load biometry records
      const { data: biometryData } = await supabase
        .from('biometrics')
        .select('*')
        .eq('pond_batch_id', cycleId)
        .order('measurement_date', { ascending: false });

      // Load mortality records
      const { data: mortalityData } = await supabase
        .from('mortality_records')
        .select('*')
        .eq('pond_batch_id', cycleId)
        .order('record_date', { ascending: false });

      // Load water quality records
      const { data: waterQualityData } = await supabase
        .from('water_quality')
        .select(`
          *,
          ponds!inner(
            pond_batches!inner(id)
          )
        `)
        .eq('ponds.pond_batches.id', cycleId)
        .order('measurement_date', { ascending: false });

      // Load feeding records
      const { data: feedingData } = await supabase
        .from('feeding_records')
        .select('*')
        .eq('pond_batch_id', cycleId)
        .order('feeding_date', { ascending: false });

      // Load input application records
      const { data: inputData } = await supabase
        .from('input_applications')
        .select('*')
        .eq('pond_batch_id', cycleId)
        .order('application_date', { ascending: false });

      // Load operational cost records
      const { data: operationalCostData } = await supabase
        .from('operational_costs')
        .select('*')
        .eq('pond_batch_id', cycleId)
        .order('cost_date', { ascending: false });

      setBiometryRecords(biometryData || []);
      setMortalityRecords(mortalityData || []);
      setWaterQualityRecords(waterQualityData || []);
      setFeedingRecords(feedingData || []);
      setInputRecords(inputData || []);
      setOperationalCostRecords(operationalCostData || []);

    } catch (error) {
      console.error('Erro ao carregar histórico de manejos:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'dd/MM/yyyy', { locale: ptBR });
  };

  const formatDateTime = (dateString: string, timeString?: string) => {
    const date = format(new Date(dateString), 'dd/MM/yyyy', { locale: ptBR });
    return timeString ? `${date} ${timeString}` : date;
  };

  if (loading) {
    return <div className="text-center py-4">Carregando histórico...</div>;
  }

  return (
    <div className="space-y-4 pt-4">
      <Tabs defaultValue="biometry" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="biometry" className="flex items-center gap-1">
            <Scale className="w-3 h-3" />
            Biometria
          </TabsTrigger>
          <TabsTrigger value="mortality" className="flex items-center gap-1">
            <Skull className="w-3 h-3" />
            Mortalidade
          </TabsTrigger>
          <TabsTrigger value="water" className="flex items-center gap-1">
            <Droplets className="w-3 h-3" />
            Água
          </TabsTrigger>
          <TabsTrigger value="feeding" className="flex items-center gap-1">
            <Utensils className="w-3 h-3" />
            Ração
          </TabsTrigger>
          <TabsTrigger value="inputs" className="flex items-center gap-1">
            <FlaskConical className="w-3 h-3" />
            Insumos
          </TabsTrigger>
          <TabsTrigger value="costs" className="flex items-center gap-1">
            <DollarSign className="w-3 h-3" />
            Custos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="biometry" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Histórico de Biometria</CardTitle>
            </CardHeader>
            <CardContent>
              {biometryRecords.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Peso Médio</TableHead>
                      <TableHead>Uniformidade</TableHead>
                      <TableHead>Amostra</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {biometryRecords.map((record, index) => (
                      <TableRow key={index}>
                        <TableCell>{formatDate(record.measurement_date)}</TableCell>
                        <TableCell>{record.average_weight.toFixed(1)}g</TableCell>
                        <TableCell>{record.uniformity ? `${record.uniformity.toFixed(1)}%` : '-'}</TableCell>
                        <TableCell>{record.sample_size || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-muted-foreground text-center py-4">Nenhum registro de biometria encontrado.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mortality" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Histórico de Mortalidade</CardTitle>
            </CardHeader>
            <CardContent>
              {mortalityRecords.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Quantidade</TableHead>
                      <TableHead>Observações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mortalityRecords.map((record, index) => (
                      <TableRow key={index}>
                        <TableCell>{formatDate(record.record_date)}</TableCell>
                        <TableCell>{record.dead_count.toLocaleString('pt-BR')}</TableCell>
                        <TableCell>{record.notes || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-muted-foreground text-center py-4">Nenhum registro de mortalidade encontrado.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="water" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Histórico de Qualidade da Água</CardTitle>
            </CardHeader>
            <CardContent>
              {waterQualityRecords.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>O₂</TableHead>
                      <TableHead>Temp.</TableHead>
                      <TableHead>pH</TableHead>
                      <TableHead>Amônia</TableHead>
                      <TableHead>Nitrito</TableHead>
                      <TableHead>Observações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {waterQualityRecords.map((record, index) => (
                      <TableRow key={index}>
                        <TableCell>{formatDate(record.measurement_date)}</TableCell>
                        <TableCell>{record.oxygen_level ? `${record.oxygen_level.toFixed(1)} mg/L` : '-'}</TableCell>
                        <TableCell>{record.temperature ? `${record.temperature.toFixed(1)}°C` : '-'}</TableCell>
                        <TableCell>{record.ph_level ? record.ph_level.toFixed(1) : '-'}</TableCell>
                        <TableCell>{record.ammonia ? `${record.ammonia.toFixed(2)} mg/L` : '-'}</TableCell>
                        <TableCell>{record.nitrite ? `${record.nitrite.toFixed(2)} mg/L` : '-'}</TableCell>
                        <TableCell>{record.notes || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-muted-foreground text-center py-4">Nenhum registro de qualidade da água encontrado.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="feeding" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Histórico de Alimentação</CardTitle>
            </CardHeader>
            <CardContent>
              {feedingRecords.length > 0 ? (
                <div className="space-y-4">
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-sm text-muted-foreground">
                      Total consumido: <span className="font-medium">{(feedingRecords.reduce((sum, r) => sum + r.actual_amount, 0) / 1000).toFixed(1)} kg</span>
                    </p>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Horário</TableHead>
                        <TableHead>Quantidade</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Custo Unit.</TableHead>
                        <TableHead>Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {feedingRecords.map((record, index) => (
                        <TableRow key={index}>
                          <TableCell>{formatDate(record.feeding_date)}</TableCell>
                          <TableCell>{record.feeding_time}</TableCell>
                          <TableCell>{(record.actual_amount / 1000).toFixed(2)} kg</TableCell>
                          <TableCell>{record.feed_type_name}</TableCell>
                          <TableCell>R$ {record.unit_cost.toFixed(2)}</TableCell>
                          <TableCell>R$ {((record.actual_amount / 1000) * record.unit_cost).toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">Nenhum registro de alimentação encontrado.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inputs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Histórico de Aplicação de Insumos</CardTitle>
            </CardHeader>
            <CardContent>
              {inputRecords.length > 0 ? (
                <div className="space-y-4">
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-sm text-muted-foreground">
                      Custo total em insumos: <span className="font-medium">R$ {inputRecords.reduce((sum, r) => sum + r.total_cost, 0).toFixed(2)}</span>
                    </p>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Produto</TableHead>
                        <TableHead>Quantidade</TableHead>
                        <TableHead>Finalidade</TableHead>
                        <TableHead>Custo</TableHead>
                        <TableHead>Observações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {inputRecords.map((record, index) => (
                        <TableRow key={index}>
                          <TableCell>{formatDate(record.application_date)}</TableCell>
                          <TableCell>{record.input_item_name}</TableCell>
                          <TableCell>{record.quantity_applied} kg</TableCell>
                          <TableCell>{record.purpose || '-'}</TableCell>
                          <TableCell>R$ {record.total_cost.toFixed(2)}</TableCell>
                          <TableCell>{record.notes || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">Nenhuma aplicação de insumos encontrada.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="costs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Histórico de Custos Operacionais</CardTitle>
            </CardHeader>
            <CardContent>
              {operationalCostRecords.length > 0 ? (
                <div className="space-y-4">
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-sm text-muted-foreground">
                      Total em custos operacionais: <span className="font-medium">R$ {operationalCostRecords.reduce((sum, r) => sum + r.amount, 0).toFixed(2)}</span>
                    </p>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Categoria</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead>Valor</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {operationalCostRecords.map((record, index) => (
                        <TableRow key={index}>
                          <TableCell>{formatDate(record.cost_date)}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{record.category}</Badge>
                          </TableCell>
                          <TableCell>{record.description}</TableCell>
                          <TableCell>R$ {record.amount.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">Nenhum custo operacional encontrado.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}