import { Cloud, CloudRain, Sun, CloudSnow } from "@phosphor-icons/react";
import { useWeatherData } from "@/hooks/useWeatherData";
import { Skeleton } from "@/components/ui/skeleton";
import { StandardCard } from "@/components/StandardCard";
import { Card, CardContent } from "@/components/ui/card";

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
      <StandardCard
        title="Clima"
        value="-"
        icon={<Cloud />}
        subtitle="Clima indisponível"
        colorClass="text-muted-foreground"
      />
    );
  }

  const WeatherIcon = getWeatherIcon(weather.description);

  return (
    <StandardCard
      title="Clima"
      value={`${weather.temperature}°C`}
      icon={<WeatherIcon />}
      colorClass="text-blue-600"
    >
      <p className="text-xs text-blue-600 capitalize mb-2">
        {weather.description}
      </p>
      
      <div className="flex gap-3 text-xs text-blue-600">
        <span>Umidade: {weather.humidity}%</span>
        <span>Vento: {weather.windSpeed} km/h</span>
      </div>
    </StandardCard>
  );
}