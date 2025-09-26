import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserProfile } from '@/hooks/useUserProfile';
import { LoadingScreen } from './LoadingScreen';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedUserTypes?: ('farm_owner' | 'technician')[];
}

export function ProtectedRoute({ 
  children, 
  allowedUserTypes = ['farm_owner'] 
}: ProtectedRouteProps) {
  const { data: profile, isLoading } = useUserProfile();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && profile) {
      if (!allowedUserTypes.includes(profile.user_type)) {
        // Se for técnico tentando acessar rota de proprietário, redireciona para dashboard
        if (profile.user_type === 'technician') {
          navigate('/', { replace: true });
        }
      }
    }
  }, [profile, isLoading, allowedUserTypes, navigate]);

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!profile || !allowedUserTypes.includes(profile.user_type)) {
    return null; // Não renderiza nada enquanto redireciona
  }

  return <>{children}</>;
}