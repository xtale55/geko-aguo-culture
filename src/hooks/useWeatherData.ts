import { useQuery } from '@tanstack/react-query';

interface WeatherData {
  location: string;
  temperature: number;
  description: string;
  humidity: number;
  windSpeed: number;
  icon: string;
}

// Mock weather data for now - in production, you'd use a real weather API
const mockWeatherData: WeatherData = {
  location: 'Fazenda',
  temperature: 28,
  description: 'Parcialmente nublado',
  humidity: 65,
  windSpeed: 12,
  icon: 'partly-cloudy'
};

export function useWeatherData(farmLocation?: string) {
  return useQuery({
    queryKey: ['weather', farmLocation],
    queryFn: async () => {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      return mockWeatherData;
    },
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
  });
}