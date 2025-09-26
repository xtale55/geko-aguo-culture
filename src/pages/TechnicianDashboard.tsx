import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Building, MapPin, Calendar } from '@phosphor-icons/react';
import { useTechnicianFarms } from '@/hooks/useTechnicianFarms';
import { LoadingScreen } from '@/components/LoadingScreen';
import { TechnicianLayout } from '@/components/TechnicianLayout';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function TechnicianDashboard() {
  const { data: technicianFarms, isLoading } = useTechnicianFarms();
  const navigate = useNavigate();

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <TechnicianLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard Técnico</h1>
          <p className="text-muted-foreground">
            Gerencie as fazendas onde você atua como técnico
          </p>
        </div>

        {technicianFarms?.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Building className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhuma fazenda encontrada</h3>
              <p className="text-muted-foreground text-center mb-4">
                Você ainda não foi cadastrado como técnico em nenhuma fazenda.
                Entre em contato com o proprietário da fazenda para ser adicionado.
              </p>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {technicianFarms?.map((farmEmployee) => {
            const farm = farmEmployee.farms;
            if (!farm) return null;

            return (
              <Card key={farm.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="line-clamp-1">{farm.name}</CardTitle>
                      <CardDescription className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {farm.location || 'Localização não informada'}
                      </CardDescription>
                    </div>
                    <Badge variant="secondary">Técnico</Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="space-y-2 text-sm">
                    {farm.total_area && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Área total:</span>
                        <span>{farm.total_area} ha</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Desde:</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(farm.created_at), 'MMM yyyy', { locale: ptBR })}
                      </span>
                    </div>
                  </div>

                  <Button
                    onClick={() => navigate(`/technician/farm/${farm.id}`)}
                    className="w-full"
                  >
                    Acessar Fazenda
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </TechnicianLayout>
  );
}