import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useBiomassByWeight } from "@/hooks/useBiomassByWeight";
import { Badge } from "@/components/ui/badge";
import { StandardCard } from "@/components/StandardCard";
import { Fish } from "@phosphor-icons/react";

interface BiomassTableProps {
  farmId?: string;
}

export function BiomassTable({ farmId }: BiomassTableProps) {
  const biomassRanges = useBiomassByWeight(farmId);

  if (biomassRanges.length === 0) {
    return (
      <StandardCard
        title="Biomassa por Faixa de Peso"
        value="-"
        icon={<Fish />}
        subtitle="Nenhum dado de biomassa disponível"
        colorClass="text-muted-foreground"
      >
        <p className="text-sm mt-1 text-muted-foreground">Adicione biometrias aos seus viveiros para ver esta informação</p>
      </StandardCard>
    );
  }

  const totalBiomass = biomassRanges.reduce((sum, range) => sum + range.biomass, 0);

  return (
    <Card className="bg-[#f5f3f0]">
      <CardHeader>
        <CardTitle className="text-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Fish className="h-5 w-5 text-primary" />
            Biomassa por Faixa de Peso
          </div>
          <Badge variant="outline" className="text-base font-medium">
            Total: {totalBiomass.toFixed(1)} kg
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[140px]">Faixa de Peso</TableHead>
                <TableHead className="text-right">Biomassa (kg)</TableHead>
                <TableHead className="text-right">Viveiros</TableHead>
                <TableHead className="text-right">% do Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {biomassRanges.map((range) => {
                const percentage = totalBiomass > 0 ? (range.biomass / totalBiomass) * 100 : 0;
                return (
                  <TableRow key={range.range}>
                    <TableCell className="font-medium">
                      <Badge variant="secondary" className="text-xs">
                        {range.range}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {range.biomass.toLocaleString('pt-BR', {
                        minimumFractionDigits: 1,
                        maximumFractionDigits: 1
                      })}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline" className="text-xs">
                        {range.pondCount}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {percentage.toFixed(1)}%
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        
        {biomassRanges.length > 0 && (
          <div className="mt-4 text-xs text-muted-foreground">
            <p>* Biomassa calculada com base na última biometria de cada viveiro</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}