import { TechnicianLayout } from '@/components/TechnicianLayout';
import { TechnicianDashboardContent } from '@/components/technician/TechnicianDashboardContent';
import { useAuth } from '@/hooks/useAuth';

const TechnicianDashboard = () => {
  const { loading } = useAuth();

  if (loading) {
    return <div>Carregando...</div>;
  }

  return (
    <TechnicianLayout>
      <TechnicianDashboardContent />
    </TechnicianLayout>
  );
};

export default TechnicianDashboard;