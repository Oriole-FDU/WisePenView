import { tableCellStyles } from '../../styles';
import {
  joinClassNames,
  resolveCellContentHostClass,
  resolveColumnAlign,
  TableColumnAlignContext,
} from '../../TableBase/cellAlign';
import type { TableCellAlignProps } from './index.type';

function TableCellAlign({ align, stretch = false, children, className }: TableCellAlignProps) {
  const resolvedAlign = resolveColumnAlign(align);

  return (
    <TableColumnAlignContext.Provider value={resolvedAlign}>
      <div
        className={joinClassNames(
          resolveCellContentHostClass(resolvedAlign),
          stretch ? tableCellStyles.cellContentHostStretch : undefined,
          className
        )}
      >
        {children}
      </div>
    </TableColumnAlignContext.Provider>
  );
}

export default TableCellAlign;
