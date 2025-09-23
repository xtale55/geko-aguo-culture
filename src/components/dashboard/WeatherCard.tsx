import { Card, CardContent } from "@/components/ui/card";
import { Cloud, CloudRain, Sun, CloudSnow } from "@phosphor-icons/react";
import { useWeatherData } from "@/hooks/useWeatherData";
import { Skeleton } from "@/components/ui/skeleton";

interface WeatherCardProps {
  farmLocation?: string;
}

export function WeatherCard({ farmLocation }: WeatherCardProps) {
  const { data: weather, isLoading } = useWeatherData(farmLocation);

  const getWeatherIcon = (description: string) => {
    const desc = description.toLowerCase();
    if (desc.includes('chuva') || desc.includes('rain')) return CloudRain;
    if (desc.includes('nublado') || desc.includes('cloud')) return Cloud;
    if (desc.includes('neve') || desc.includes('snow')) return CloudSnow;
    return Sun;
  };

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardContent className="p-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-3 w-24" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!weather) {
    return (
      <Card className="h-full">
        <CardContent className="p-4">
          <div className="text-center text-muted-foreground">
            <Cloud className="h-8 w-8 mx-auto mb-2" />
            <p className="text-sm">Clima indisponível</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const WeatherIcon = getWeatherIcon(weather.description);

  return (
    <Card className="h-full bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-800">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-blue-700 dark:text-blue-300">Clima</h3>
          <WeatherIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        </div>
        
        <div className="space-y-1">
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-blue-900 dark:text-blue-100">
              {weather.temperature}°C
            </span>
          </div>
          
          <p className="text-xs text-blue-600 dark:text-blue-300 capitalize">
            {weather.description}
          </p>
          
          <div className="flex gap-3 text-xs text-blue-600 dark:text-blue-300 mt-2">
            <span>Umidade: {weather.humidity}%</span>
            <span>Vento: {weather.windSpeed} km/h</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}