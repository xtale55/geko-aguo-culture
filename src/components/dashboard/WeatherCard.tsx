import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Cloud, CloudRain, Sun, CloudSnow, MapPin } from "lucide-react";
import { useWeatherData } from "@/hooks/useWeatherData";
import { Skeleton } from "@/components/ui/skeleton";

interface WeatherCardProps {
  farmLocation?: string;
}

export function WeatherCard({ farmLocation }: WeatherCardProps) {
  const [isLocationDialogOpen, setIsLocationDialogOpen] = useState(false);
  const [newLocation, setNewLocation] = useState(farmLocation || '');
  const { data: weather, isLoading } = useWeatherData(farmLocation);

  const getWeatherIcon = (description: string) => {
    const desc = description.toLowerCase();
    if (desc.includes('chuva') || desc.includes('rain')) return CloudRain;
    if (desc.includes('nublado') || desc.includes('cloud')) return Cloud;
    if (desc.includes('neve') || desc.includes('snow')) return CloudSnow;
    return Sun;
  };

  const handleSaveLocation = () => {
    // Here you could save to localStorage or update the farm location
    localStorage.setItem('weatherLocation', newLocation);
    setIsLocationDialogOpen(false);
  };

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardContent className="p-3">
          <div className="space-y-2">
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-2 w-20" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!weather) {
    return (
      <Card className="h-full cursor-pointer hover:shadow-md transition-shadow" onClick={() => setIsLocationDialogOpen(true)}>
        <CardContent className="p-3">
          <div className="text-center text-muted-foreground">
            <Cloud className="h-6 w-6 mx-auto mb-1" />
            <p className="text-xs">Configurar clima</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const WeatherIcon = getWeatherIcon(weather.description);

  return (
    <Dialog open={isLocationDialogOpen} onOpenChange={setIsLocationDialogOpen}>
      <DialogTrigger asChild>
        <Card className="h-full bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-800 cursor-pointer hover:shadow-md transition-shadow">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-medium text-blue-700 dark:text-blue-300">Clima</h3>
              <div className="flex items-center gap-1">
                <WeatherIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <MapPin className="h-3 w-3 text-blue-500 dark:text-blue-400" />
              </div>
            </div>
            
            <div className="space-y-1">
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-bold text-blue-900 dark:text-blue-100">
                  {weather.temperature}°C
                </span>
              </div>
              
              <p className="text-xs text-blue-600 dark:text-blue-300 capitalize">
                {weather.description}
              </p>
              
              <div className="flex gap-2 text-xs text-blue-600 dark:text-blue-300 mt-1">
                <span>{weather.humidity}%</span>
                <span>{weather.windSpeed}km/h</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Configurar Localização do Clima</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="location">Localização</Label>
            <Input
              id="location"
              value={newLocation}
              onChange={(e) => setNewLocation(e.target.value)}
              placeholder="Digite sua cidade..."
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button 
              variant="outline" 
              onClick={() => setIsLocationDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button onClick={handleSaveLocation}>
              Salvar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}