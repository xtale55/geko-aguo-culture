import React, { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangleIcon, FishIcon, UtensilsIcon, PackageIcon } from '@/components/OptimizedIcon';

interface StatsCardProps {
  title: string;
  value: string | number;
  type: 'alerts' | 'feeding' | 'growth' | 'inventory';
  onClick?: () => void;
}

export const OptimizedStatsCard = memo(({ title, value, type, onClick }: StatsCardProps) => {
  const IconComponent = {
    alerts: AlertTriangleIcon,
    feeding: UtensilsIcon,
    growth: FishIcon,
    inventory: PackageIcon,
  }[type];

  const cardClass = {
    alerts: 'border-destructive/20 bg-destructive/5',
    feeding: 'border-primary/20 bg-primary/5',
    growth: 'border-success/20 bg-success/5',
    inventory: 'border-warning/20 bg-warning/5',
  }[type];

  const textClass = {
    alerts: 'text-destructive',
    feeding: 'text-primary',
    growth: 'text-success',
    inventory: 'text-warning',
  }[type];

  return (
    <Card 
      className={`${cardClass} ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <IconComponent className={`h-4 w-4 ${textClass}`} />
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${textClass}`}>{value}</div>
      </CardContent>
    </Card>
  );
});

OptimizedStatsCard.displayName = 'OptimizedStatsCard';