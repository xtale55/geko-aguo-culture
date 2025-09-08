import React, { memo } from 'react';
import { BiomassTable } from './BiomassTable';

interface MemoizedBiomassTableProps {
  farmId?: string;
}

export const MemoizedBiomassTable = memo(({ farmId }: MemoizedBiomassTableProps) => {
  return <BiomassTable farmId={farmId} />;
});

MemoizedBiomassTable.displayName = 'MemoizedBiomassTable';