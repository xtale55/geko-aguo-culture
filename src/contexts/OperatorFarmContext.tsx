import { createContext, useContext, ReactNode } from 'react';
import { useOperatorPermissions } from '@/hooks/useOperatorPermissions';
import { useUserProfile } from '@/hooks/useUserProfile';

interface OperatorFarmContextType {
  farmId: string | null;
  farmName: string | null;
  isOperator: boolean;
  hasAccess: (section: 'manejos' | 'despesca' | 'estoque') => boolean;
}

const OperatorFarmContext = createContext<OperatorFarmContextType | undefined>(undefined);

export function OperatorFarmProvider({ children }: { children: ReactNode }) {
  const { data: profile } = useUserProfile();
  const { data: permissions } = useOperatorPermissions();

  const value: OperatorFarmContextType = {
    farmId: permissions?.farm_id || null,
    farmName: permissions?.farm_name || null,
    isOperator: profile?.user_type === 'operator',
    hasAccess: (section) => {
      if (!permissions) return false;
      if (section === 'manejos') return permissions.can_access_manejos || false;
      if (section === 'despesca') return permissions.can_access_despesca || false;
      if (section === 'estoque') return permissions.can_access_estoque || false;
      return false;
    }
  };

  return (
    <OperatorFarmContext.Provider value={value}>
      {children}
    </OperatorFarmContext.Provider>
  );
}

export function useOperatorFarm() {
  const context = useContext(OperatorFarmContext);
  if (!context) {
    throw new Error('useOperatorFarm must be used within OperatorFarmProvider');
  }
  return context;
}
