import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface OfflineOperation {
  id: string;
  type: 'feeding' | 'biometry' | 'water_quality' | 'mortality';
  data: any;
  timestamp: number;
}

const OFFLINE_STORAGE_KEY = 'aquahub_offline_operations';

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingOperations, setPendingOperations] = useState<OfflineOperation[]>([]);

  useEffect(() => {
    // Load pending operations from localStorage
    const stored = localStorage.getItem(OFFLINE_STORAGE_KEY);
    if (stored) {
      try {
        setPendingOperations(JSON.parse(stored));
      } catch (error) {
        console.error('Error loading offline operations:', error);
      }
    }

    const handleOnline = () => {
      setIsOnline(true);
      toast.success('Conexão restaurada! Sincronizando dados...');
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.info('Modo offline ativo. Dados serão sincronizados quando voltar online.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    // Sync when coming back online
    if (isOnline && pendingOperations.length > 0) {
      syncPendingOperations();
    }
  }, [isOnline, pendingOperations]);

  const addOfflineOperation = (operation: Omit<OfflineOperation, 'id' | 'timestamp'>) => {
    const newOperation: OfflineOperation = {
      ...operation,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    };

    const updated = [...pendingOperations, newOperation];
    setPendingOperations(updated);
    localStorage.setItem(OFFLINE_STORAGE_KEY, JSON.stringify(updated));

    if (!isOnline) {
      toast.info('Operação salva offline. Será sincronizada quando voltar online.');
    }
  };

  const syncPendingOperations = async () => {
    if (pendingOperations.length === 0) return;

    let successCount = 0;
    const failedOperations: OfflineOperation[] = [];

    for (const operation of pendingOperations) {
      try {
        await syncOperation(operation);
        successCount++;
      } catch (error) {
        console.error('Failed to sync operation:', operation, error);
        failedOperations.push(operation);
      }
    }

    // Update pending operations with only failed ones
    setPendingOperations(failedOperations);
    localStorage.setItem(OFFLINE_STORAGE_KEY, JSON.stringify(failedOperations));

    if (successCount > 0) {
      toast.success(`${successCount} operação(ões) sincronizada(s) com sucesso!`);
    }

    if (failedOperations.length > 0) {
      toast.error(`${failedOperations.length} operação(ões) falharam na sincronização.`);
    }
  };

  const syncOperation = async (operation: OfflineOperation) => {
    const { type, data } = operation;

    switch (type) {
      case 'feeding':
        return await supabase.from('feeding_records').insert(data);
      case 'biometry':
        return await supabase.from('biometrics').insert(data);
      case 'water_quality':
        return await supabase.from('water_quality').insert(data);
      case 'mortality':
        return await supabase.from('mortality_records').insert(data);
      default:
        throw new Error(`Unknown operation type: ${type}`);
    }
  };

  const clearPendingOperations = () => {
    setPendingOperations([]);
    localStorage.removeItem(OFFLINE_STORAGE_KEY);
    toast.success('Operações pendentes removidas.');
  };

  return {
    isOnline,
    pendingOperations,
    addOfflineOperation,
    syncPendingOperations,
    clearPendingOperations,
  };
}