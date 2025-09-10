import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Scale, Save, X } from 'lucide-react';

interface PondWithBatch {
  id: string;
  name: string;
  area: number;
  current_batch?: {
    id: string;
    batch_name: string;
    stocking_date: string;
    current_population: number;
    latest_biometry?: {
      average_weight: number;
      measurement_date: string;
      uniformity: number;
    };
  };
}

interface BatchBiometryData {
  pond_batch_id: string;
  pond_name: string;
  average_weight: string;
  uniformity: string;
  sample_size: string;
}

interface BatchBiometryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ponds: PondWithBatch[];
  onSuccess: () => void;
}

export function BatchBiometryModal({ open, onOpenChange, ponds, onSuccess }: BatchBiometryModalProps) {
  console.log('BatchBiometryModal component loading...');
  
  const getCurrentDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
  const [measurementDate, setMeasurementDate] = useState(getCurrentDate());
  const [biometryData, setBiometryData] = useState<BatchBiometryData[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      // Initialize biometry data for all ponds
      const initialData = ponds.map(pond => ({
        pond_batch_id: pond.current_batch?.id || '',
        pond_name: pond.name,
        average_weight: '',
        uniformity: '',
        sample_size: ''
      }));
      setBiometryData(initialData);
      setMeasurementDate(getCurrentDate());
      setProgress(0);
    }
  }, [open, ponds]);

  const calculateDOC = (stockingDate: string) => {
    const today = new Date();
    const stocking = new Date(stockingDate);
    const diffTime = Math.abs(today.getTime() - stocking.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const updateBiometryData = (index: number, field: keyof BatchBiometryData, value: string) => {
    setBiometryData(prev => prev.map((item, i) => 
      i === index ? { ...item, [field]: value } : item
    ));
  };

  const fillAllWeights = () => {
    const weightValue = prompt('Digite o peso médio para aplicar a todos os viveiros (em gramas):');
    if (weightValue && !isNaN(Number(weightValue))) {
      setBiometryData(prev => prev.map(item => ({ ...item, average_weight: weightValue })));
    }
  };

  const fillAllUniformity = () => {
    const uniformityValue = prompt('Digite a uniformidade para aplicar a todos os viveiros (%):');
    if (uniformityValue && !isNaN(Number(uniformityValue))) {
      setBiometryData(prev => prev.map(item => ({ ...item, uniformity: uniformityValue })));
    }
  };

  const fillAllSampleSize = () => {
    const sampleValue = prompt('Digite o tamanho da amostra para aplicar a todos os viveiros:');
    if (sampleValue && !isNaN(Number(sampleValue))) {
      setBiometryData(prev => prev.map(item => ({ ...item, sample_size: sampleValue })));
    }
  };

  const handleSubmit = async () => {
    // Validate required fields
    const validEntries = biometryData.filter(item => 
      item.average_weight && 
      !isNaN(Number(item.average_weight)) && 
      Number(item.average_weight) > 0
    );

    if (validEntries.length === 0) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "É necessário preencher pelo menos um peso médio válido."
      });
      return;
    }

    setSubmitting(true);
    setProgress(0);

    try {
      const biometryRecords = validEntries.map(item => ({
        pond_batch_id: item.pond_batch_id,
        measurement_date: measurementDate,
        average_weight: parseFloat(item.average_weight),
        uniformity: item.uniformity ? parseFloat(item.uniformity) : 0,
        sample_size: item.sample_size ? parseInt(item.sample_size) : 0
      }));

      let completed = 0;
      const total = biometryRecords.length;

      // Insert records one by one with progress tracking
      for (const record of biometryRecords) {
        const { error } = await supabase
          .from('biometrics')
          .insert([record]);

        if (error) throw error;

        completed++;
        setProgress((completed / total) * 100);
      }

      toast({
        title: "Biometrias registradas!",
        description: `${validEntries.length} biometrias foram registradas com sucesso.`
      });

      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message
      });
    } finally {
      setSubmitting(false);
      setProgress(0);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Scale className="w-5 h-5" />
            Biometria em Lote
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto space-y-6">
          {/* Date Selection */}
          <div className="space-y-2">
            <Label htmlFor="batch_measurement_date">Data da Medição</Label>
            <Input
              id="batch_measurement_date"
              type="date"
              value={measurementDate}
              onChange={(e) => setMeasurementDate(e.target.value)}
              className="w-48"
            />
          </div>

          {/* Quick Fill Buttons */}
          <div className="flex gap-2 flex-wrap">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={fillAllWeights}
              disabled={submitting}
            >
              Preencher Todos os Pesos
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={fillAllUniformity}
              disabled={submitting}
            >
              Preencher Todas as Uniformidades
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={fillAllSampleSize}
              disabled={submitting}
            >
              Preencher Todas as Amostras
            </Button>
          </div>

          {/* Progress Bar */}
          {submitting && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Salvando biometrias...</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="w-full" />
            </div>
          )}

          {/* Biometry Table */}
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Viveiro</TableHead>
                  <TableHead>DOC</TableHead>
                  <TableHead>População</TableHead>
                  <TableHead>Peso Atual</TableHead>
                  <TableHead className="bg-primary/5">
                    Novo Peso (g) *
                  </TableHead>
                  <TableHead className="bg-accent/5">
                    Uniformidade (%)
                  </TableHead>
                  <TableHead className="bg-accent/5">
                    Amostra
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ponds.map((pond, index) => {
                  const batch = pond.current_batch!;
                  const doc = calculateDOC(batch.stocking_date);
                  const currentWeight = batch.latest_biometry?.average_weight || 0;
                  
                  return (
                    <TableRow key={pond.id}>
                      <TableCell className="font-medium">{pond.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{doc} dias</Badge>
                      </TableCell>
                      <TableCell>
                        {batch.current_population.toLocaleString()} PL
                      </TableCell>
                      <TableCell>
                        {currentWeight > 0 ? (
                          <span className="text-muted-foreground">{currentWeight}g</span>
                        ) : (
                          <span className="text-muted-foreground italic">Sem dados</span>
                        )}
                      </TableCell>
                      <TableCell className="bg-primary/5">
                        <Input
                          type="number"
                          placeholder="Ex: 12.5"
                          step="0.1"
                          min="0"
                          value={biometryData[index]?.average_weight || ''}
                          onChange={(e) => updateBiometryData(index, 'average_weight', e.target.value)}
                          disabled={submitting}
                          className="w-24"
                        />
                      </TableCell>
                      <TableCell className="bg-accent/5">
                        <Input
                          type="number"
                          placeholder="Ex: 85"
                          min="0"
                          max="100"
                          value={biometryData[index]?.uniformity || ''}
                          onChange={(e) => updateBiometryData(index, 'uniformity', e.target.value)}
                          disabled={submitting}
                          className="w-20"
                        />
                      </TableCell>
                      <TableCell className="bg-accent/5">
                        <Input
                          type="number"
                          placeholder="Ex: 50"
                          min="0"
                          value={biometryData[index]?.sample_size || ''}
                          onChange={(e) => updateBiometryData(index, 'sample_size', e.target.value)}
                          disabled={submitting}
                          className="w-20"
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
            <p className="mb-1">
              <strong>Instruções:</strong>
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li>Campos com * são obrigatórios</li>
              <li>Você pode deixar viveiros em branco para não registrar biometria</li>
              <li>Use os botões "Preencher Todos" para aplicar o mesmo valor a todos os viveiros</li>
              <li>Peso deve ser informado em gramas (ex: 12.5)</li>
              <li>Uniformidade é opcional e deve ser informada em % (ex: 85)</li>
            </ul>
          </div>
        </div>

        <div className="flex-shrink-0 flex justify-end gap-2 pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            <X className="w-4 h-4 mr-2" />
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting}
          >
            <Save className="w-4 h-4 mr-2" />
            {submitting ? 'Salvando...' : 'Salvar Todas'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}