import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Settings, Save, RotateCcw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface FeedingSensitivityConfigProps {
  farmId: string;
}

interface SensitivityConfig {
  id?: string;
  farm_id: string;
  consumed_all_adjustment: number;
  left_little_adjustment: number;
  partial_consumption_adjustment: number;
  no_consumption_adjustment: number;
  excess_leftover_adjustment: number;
  suspension_threshold: number;
  suspension_duration_hours: number;
  evaluation_history_count: number;
  auto_adjustment_enabled: boolean;
}

const defaultConfig: Omit<SensitivityConfig, 'farm_id'> = {
  consumed_all_adjustment: 5.0,
  left_little_adjustment: 2.0,
  partial_consumption_adjustment: -10.0,
  no_consumption_adjustment: -25.0,
  excess_leftover_adjustment: -15.0,
  suspension_threshold: 2,
  suspension_duration_hours: 12,
  evaluation_history_count: 3,
  auto_adjustment_enabled: true,
};

export function FeedingSensitivityConfig({ farmId }: FeedingSensitivityConfigProps) {
  const [config, setConfig] = useState<SensitivityConfig>({
    farm_id: farmId,
    ...defaultConfig,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadConfig();
  }, [farmId]);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('feeding_sensitivity_config')
        .select('*')
        .eq('farm_id', farmId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setConfig(data);
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar configurações de sensibilidade',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      const configToSave = {
        ...config,
        created_by: config.id ? undefined : (await supabase.auth.getUser()).data.user?.id,
      };
      
      const { error } = await supabase
        .from('feeding_sensitivity_config')
        .upsert([configToSave], { onConflict: 'farm_id' });

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Configurações de sensibilidade salvas com sucesso',
      });
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao salvar configurações',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setConfig({
      farm_id: farmId,
      ...defaultConfig,
    });
  };

  const updateConfig = (field: keyof SensitivityConfig, value: any) => {
    setConfig(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center space-x-2">
          <Settings className="h-5 w-5 text-primary" />
          <CardTitle>Configurações de Sensibilidade da Alimentação</CardTitle>
        </div>
        <CardDescription>
          Configure como o sistema deve ajustar automaticamente as quantidades de ração baseado no comportamento de consumo dos animais.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-base">Ajustes Automáticos</Label>
            <p className="text-sm text-muted-foreground">
              Ativar ajustes automáticos baseados na avaliação de consumo
            </p>
          </div>
          <Switch
            checked={config.auto_adjustment_enabled}
            onCheckedChange={(checked) => updateConfig('auto_adjustment_enabled', checked)}
          />
        </div>

        <Separator />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-4">
            <h4 className="font-semibold text-sm">Ajustes por Comportamento (%)</h4>
            
            <div className="space-y-2">
              <Label htmlFor="consumed_all">Consumiu Tudo</Label>
              <Input
                id="consumed_all"
                type="number"
                step="0.1"
                value={config.consumed_all_adjustment}
                onChange={(e) => updateConfig('consumed_all_adjustment', parseFloat(e.target.value) || 0)}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">Aumentar quantidade quando consumir toda a ração</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="left_little">Sobrou Pouco</Label>
              <Input
                id="left_little"
                type="number"
                step="0.1"
                value={config.left_little_adjustment}
                onChange={(e) => updateConfig('left_little_adjustment', parseFloat(e.target.value) || 0)}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">Ajuste leve quando sobrar pouca ração</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="partial_consumption">Consumo Parcial</Label>
              <Input
                id="partial_consumption"
                type="number"
                step="0.1"
                value={config.partial_consumption_adjustment}
                onChange={(e) => updateConfig('partial_consumption_adjustment', parseFloat(e.target.value) || 0)}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">Reduzir quando o consumo for parcial</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="no_consumption">Não Consumiu</Label>
              <Input
                id="no_consumption"
                type="number"
                step="0.1"
                value={config.no_consumption_adjustment}
                onChange={(e) => updateConfig('no_consumption_adjustment', parseFloat(e.target.value) || 0)}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">Redução significativa quando não consumir</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="excess_leftover">Muita Sobra</Label>
              <Input
                id="excess_leftover"
                type="number"
                step="0.1"
                value={config.excess_leftover_adjustment}
                onChange={(e) => updateConfig('excess_leftover_adjustment', parseFloat(e.target.value) || 0)}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">Reduzir quando sobrar muita ração</p>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-semibold text-sm">Configurações Avançadas</h4>

            <div className="space-y-2">
              <Label htmlFor="suspension_threshold">Limite para Suspensão</Label>
              <Input
                id="suspension_threshold"
                type="number"
                min="1"
                value={config.suspension_threshold}
                onChange={(e) => updateConfig('suspension_threshold', parseInt(e.target.value) || 1)}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">Número de alimentações consecutivas sem consumo para suspender</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="suspension_duration">Duração da Suspensão (horas)</Label>
              <Input
                id="suspension_duration"
                type="number"
                min="1"
                value={config.suspension_duration_hours}
                onChange={(e) => updateConfig('suspension_duration_hours', parseInt(e.target.value) || 1)}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">Tempo de suspensão antes de retomar alimentação</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="history_count">Histórico para Análise</Label>
              <Input
                id="history_count"
                type="number"
                min="1"
                max="10"
                value={config.evaluation_history_count}
                onChange={(e) => updateConfig('evaluation_history_count', parseInt(e.target.value) || 1)}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">Número de alimentações anteriores a considerar</p>
            </div>
          </div>
        </div>

        <Separator />

        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={handleReset}
            className="flex items-center space-x-2"
          >
            <RotateCcw className="h-4 w-4" />
            <span>Restaurar Padrões</span>
          </Button>

          <Button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center space-x-2"
          >
            <Save className="h-4 w-4" />
            <span>{saving ? 'Salvando...' : 'Salvar Configurações'}</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}