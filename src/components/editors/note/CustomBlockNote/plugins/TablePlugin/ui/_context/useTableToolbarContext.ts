import { useRequiredContext } from '@/hooks/useRequiredContext';

import { TableToolbarContext } from './TableToolbarContext';

export function useTableToolbarContext() {
  return useRequiredContext(TableToolbarContext, 'TableToolbarProvider');
}
