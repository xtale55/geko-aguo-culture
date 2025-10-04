import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useOperatorPermissions } from '@/hooks/useOperatorPermissions';
import { Shrimp, Truck, Barn } from '@phosphor-icons/react';

export default function OperatorDashboard() {
  const navigate = useNavigate();
  const { data: permissions } = useOperatorPermissions();

  const quickActions = [
    {
      title: 'Manejos',
      description: 'Registrar alimentação, biometria e mortalidade',
      icon: Shrimp,
      path: '/manejos',
      enabled: permissions?.can_access_manejos
    },
    {
      title: 'Despesca',
      description: 'Registrar despescas parciais e totais',
      icon: Truck,
      path: '/despesca',
      enabled: permissions?.can_access_despesca
    },
    {
      title: 'Estoque',
      description: 'Gerenciar estoque de ração e insumos',
      icon: Barn,
      path: '/inventory',
      enabled: permissions?.can_access_estoque
    }
  ];

  return (
    <Layout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Dashboard do Operador</h1>
          <p className="text-muted-foreground">Acesso rápido às suas funções</p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {quickActions.filter(action => action.enabled).map((action) => (
            <Card key={action.path} className="cursor-pointer hover:shadow-lg transition-shadow">
              <CardHeader>
                <action.icon className="w-8 h-8 mb-2" />
                <CardTitle>{action.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">{action.description}</p>
                <Button onClick={() => navigate(action.path)} className="w-full">
                  Acessar
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {quickActions.filter(action => action.enabled).length === 0 && (
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-muted-foreground">
                Você não possui permissões atribuídas. Entre em contato com o administrador da fazenda.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
