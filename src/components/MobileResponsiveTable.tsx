import { memo, ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

interface Column<T> {
  key: keyof T | string;
  header: string;
  render?: (item: T) => ReactNode;
  className?: string;
  mobileHidden?: boolean;
}

interface MobileResponsiveTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (item: T) => string;
  className?: string;
  emptyMessage?: string;
  mobileCardRenderer?: (item: T) => ReactNode;
}

export const MobileResponsiveTable = memo(function MobileResponsiveTable<T>({
  data,
  columns,
  keyExtractor,
  className,
  emptyMessage = "Nenhum dado encontrado",
  mobileCardRenderer
}: MobileResponsiveTableProps<T>) {
  const isMobile = useIsMobile();

  if (data.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  // Mobile card view
  if (isMobile && mobileCardRenderer) {
    return (
      <div className="space-y-3">
        {data.map((item) => (
          <Card key={keyExtractor(item)} className="p-3">
            <CardContent className="p-0">
              {mobileCardRenderer(item)}
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Desktop table view
  return (
    <div className={cn("overflow-x-auto", className)}>
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((column, index) => (
              <TableHead 
                key={index}
                className={cn(
                  column.className,
                  isMobile && column.mobileHidden && "hidden"
                )}
              >
                {column.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item) => (
            <TableRow key={keyExtractor(item)}>
              {columns.map((column, index) => {
                const cellContent = column.render 
                  ? column.render(item)
                  : String((item as any)[column.key] || '');
                
                return (
                  <TableCell 
                    key={index}
                    className={cn(
                      column.className,
                      isMobile && column.mobileHidden && "hidden"
                    )}
                  >
                    {cellContent}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}) as <T>(props: MobileResponsiveTableProps<T>) => JSX.Element;