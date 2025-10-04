import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useOperatorFarm } from '@/contexts/OperatorFarmContext';
import { Shrimp, Truck, Barn, Warning } from '@phosphor-icons/react';

export default function OperatorDashboard() {
  const navigate = useNavigate();
  const { farmId, farmName, hasAccess } = useOperatorFarm();

  const quickActions = [
    {
      title: 'Manejos',
      description: 'Registrar alimentação, biometria e mortalidade',
      icon: Shrimp,
      path: '/manejos',
      enabled: hasAccess('manejos')
    },
    {
      title: 'Despesca',
      description: 'Registrar despescas parciais e totais',
      icon: Truck,
      path: '/despesca',
      enabled: hasAccess('despesca')
    },
    {
      title: 'Estoque',
      description: 'Gerenciar estoque de ração e insumos',
      icon: Barn,
      path: '/inventory',
      enabled: hasAccess('estoque')
    }
  ];

  return (
    <Layout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Dashboard do Operador</h1>
          {farmName ? (
            <p className="text-muted-foreground">Fazenda: <span className="font-semibold">{farmName}</span></p>
          ) : (
            <p className="text-muted-foreground">Acesso rápido às suas funções</p>
          )}
        </div>

        {!farmId && (
          <Card className="border-warning">
            <CardContent className="p-6 flex items-start gap-3">
              <Warning className="w-6 h-6 text-warning flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-warning mb-1">Fazenda não vinculada</h3>
                <p className="text-sm text-muted-foreground">
                  Você ainda não está vinculado a nenhuma fazenda. Entre em contato com o administrador para receber um convite.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

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
