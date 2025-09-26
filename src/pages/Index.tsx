import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useUserProfile } from '@/hooks/useUserProfile';
import Dashboard from './Dashboard';
import TechnicianDashboard from './TechnicianDashboard';
import { LoadingScreen } from '@/components/LoadingScreen';

const Index = () => {
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading, isFarmOwner, isTechnician } = useUserProfile();
  const navigate = useNavigate();

  const loading = authLoading || profileLoading;

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!loading && user && profile) {
      // Redirecionar baseado no tipo de usuário
      if (isTechnician) {
        navigate('/tecnico');
      } else if (isFarmOwner) {
        navigate('/dashboard');
      }
    }
  }, [user, profile, loading, isTechnician, isFarmOwner, navigate]);

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user || !profile) {
    return null;
  }

  // Renderizar baseado no tipo de usuário
  if (isTechnician) {
    return <TechnicianDashboard />;
  }

  return <Dashboard />;
};

export default Index;
