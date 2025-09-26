import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Calendar, Ruler } from '@phosphor-icons/react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Farm {
  id: string;
  name: string;
  location?: string;
  total_area?: number;
  created_at: string;
}

interface TechnicianFarmHeaderProps {
  farm: Farm;
}

export function TechnicianFarmHeader({ farm }: TechnicianFarmHeaderProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold">{farm.name}</h1>
              <Badge variant="secondary">Técnico</Badge>
            </div>
            
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              {farm.location && (
                <div className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  <span>{farm.location}</span>
                </div>
              )}
              
              {farm.total_area && (
                <div className="flex items-center gap-1">
                  <Ruler className="h-4 w-4" />
                  <span>{farm.total_area} ha</span>
                </div>
              )}
              
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>Desde {format(new Date(farm.created_at), 'MMM yyyy', { locale: ptBR })}</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}