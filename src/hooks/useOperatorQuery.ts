import { useOperatorFarm } from '@/contexts/OperatorFarmContext';

/**
 * Hook para proteger queries de operadores
 * Adiciona automaticamente o filtro por farm_id
 */
export function useOperatorQuery() {
  const { farmId, isOperator } = useOperatorFarm();

  /**
   * Retorna o farm_id para filtrar queries
   * Se não for operador, retorna undefined (sem filtro)
   */
  const getOperatorFarmId = (): string | undefined => {
    return isOperator ? farmId || undefined : undefined;
  };

  /**
   * Verifica se o operador tem acesso à fazenda especificada
   */
  const canAccessFarm = (targetFarmId: string): boolean => {
    if (!isOperator) return true; // Não-operadores têm acesso a todas as fazendas
    return farmId === targetFarmId;
  };

  return {
    operatorFarmId: getOperatorFarmId(),
    canAccessFarm,
    isOperator,
    farmId
  };
}
