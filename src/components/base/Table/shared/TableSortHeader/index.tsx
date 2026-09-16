import { Table } from '@heroui/react';

import type { TableSortColumnLabelProps } from './index.type';

function TableSortColumnLabel({ label, sortDirection, align }: TableSortColumnLabelProps) {
  return (
    <Table.SortableColumnHeader sortDirection={sortDirection} data-align={align}>
      {label}
    </Table.SortableColumnHeader>
  );
}

export { TableSortColumnLabel };
