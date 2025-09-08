import React, { memo } from 'react';
import { WeatherCard } from './WeatherCard';

interface MemoizedWeatherCardProps {
  farmLocation?: string;
}

export const MemoizedWeatherCard = memo(({ farmLocation }: MemoizedWeatherCardProps) => {
  return <WeatherCard farmLocation={farmLocation} />;
});

MemoizedWeatherCard.displayName = 'MemoizedWeatherCard';