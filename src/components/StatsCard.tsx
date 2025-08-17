import { memo, ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  subtitle?: string;
  progress?: number;
  variant?: 'primary' | 'success' | 'accent' | 'secondary';
  className?: string;
}

export const StatsCard = memo(function StatsCard({
  title,
  value,
  icon,
  subtitle,
  progress,
  variant = 'primary',
  className
}: StatsCardProps) {
  const variants = {
    primary: 'bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20',
    success: 'bg-gradient-to-br from-success/10 to-success/5 border-success/20',
    accent: 'bg-gradient-to-br from-accent/10 to-accent/5 border-accent/20',
    secondary: 'bg-gradient-to-br from-secondary/10 to-secondary/5 border-secondary/20'
  };

  const iconColors = {
    primary: 'text-primary/70',
    success: 'text-success/70',
    accent: 'text-accent/70',
    secondary: 'text-secondary-foreground/70'
  };

  const valueColors = {
    primary: 'text-primary',
    success: 'text-success',
    accent: 'text-accent',
    secondary: 'text-secondary-foreground'
  };

  return (
    <Card className={cn(variants[variant], className)}>
      <CardContent className="p-4 md:p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1 md:space-y-2 flex-1">
            <p className="text-xs md:text-sm font-medium text-muted-foreground">{title}</p>
            <p className={cn("text-2xl md:text-3xl font-bold", valueColors[variant])}>{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
            {progress !== undefined && (
              <Progress value={progress} className="mt-2 h-1 md:h-2" />
            )}
          </div>
          <div className={cn("w-6 h-6 md:w-8 md:h-8", iconColors[variant])}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
});