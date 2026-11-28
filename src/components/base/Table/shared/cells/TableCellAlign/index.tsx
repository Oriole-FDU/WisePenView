import { tableCellStyles } from '../../styles';
import { TableColumnAlignProvider } from '../../TableBase/_context';
import {
  joinClassNames,
  resolveCellContentHostClass,
  resolveColumnAlign,
} from '../../TableBase/cellAlign';
import type { TableCellAlignProps } from './index.type';

function TableCellAlign({ align, stretch = false, children, className }: TableCellAlignProps) {
  const resolvedAlign = resolveColumnAlign(align);

  return (
    <TableColumnAlignProvider value={resolvedAlign}>
      <div
        className={joinClassNames(
          resolveCellContentHostClass(resolvedAlign),
          stretch ? tableCellStyles.cellContentHostStretch : undefined,
          className
        )}
      >
        {children}
      </div>
    </TableColumnAlignProvider>
  );
}

export default TableCellAlign;
