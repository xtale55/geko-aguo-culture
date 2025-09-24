import { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StandardCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  subtitle?: string;
  colorClass?: string;
  className?: string;
  onClick?: () => void;
  children?: ReactNode;
}

export function StandardCard({
  title,
  value,
  icon,
  subtitle,
  colorClass = "text-primary",
  className,
  onClick,
  children
}: StandardCardProps) {
  return (
    <Card 
      className={cn(
        "h-full bg-[#faf8f5] border-border hover:shadow-lg transition-all duration-200",
        onClick && "cursor-pointer hover:border-muted-foreground/50",
        className
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-muted-foreground">
            {title}
          </h3>
          <div className={cn("h-5 w-5", colorClass)}>
            {icon}
          </div>
        </div>
        
        <div className="space-y-2">
          <span className={cn("text-2xl font-bold", colorClass)}>
            {value}
          </span>
          {subtitle && (
            <p className={cn("text-xs", colorClass)}>
              {subtitle}
            </p>
          )}
          {children}
        </div>
      </CardContent>
    </Card>
  );
}