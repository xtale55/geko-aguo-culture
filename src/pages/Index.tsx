import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useNavigate } from 'react-router-dom';
import Dashboard from './Dashboard';
import TechnicianDashboard from './TechnicianDashboard';
import { LoadingScreen } from '@/components/LoadingScreen';

const Index = () => {
  const { user, loading } = useAuth();
  const { data: profile, isLoading: profileLoading } = useUserProfile();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  if (loading || profileLoading) {
    return <LoadingScreen />;
  }

  if (!user || !profile) {
    return null;
  }

  // Direcionar baseado no tipo de usuário
  if (profile.user_type === 'technician') {
    return <TechnicianDashboard />;
  }

  return <Dashboard />;
};

export default Index;
