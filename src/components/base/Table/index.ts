import DataTableComponent from './DataTable';
import DataTableTabs from './DataTableTabs';
import FolderTableComponent from './FolderTable';
import TableMemberCell from './shared/cells/TableMemberCell';
import TableTextCell from './shared/cells/TableTextCell';
import { tableCellStyles } from './shared/styles';

export const DataTable = Object.assign(DataTableComponent, {
  Tabs: DataTableTabs,
  MemberCell: TableMemberCell,
  TextCell: TableTextCell,
  cellStyles: tableCellStyles,
});

export const FolderTable = FolderTableComponent;

/** DataTable — 只读表格 */
export type {
  DataTableColumn,
  DataTableLoadMore,
  DataTablePagination,
  DataTableProps,
  DataTableRowContext,
  DataTableTab,
  DataTableTabsProps,
} from './DataTable/index.type';

/** FolderTable — 文件夹列表 */
export type {
  FolderTableCheckboxSelection,
  FolderTableColumn,
  FolderTableLoadMore,
  FolderTableProps,
  FolderTableRow,
  FolderTableRowAction,
  FolderTableRowContext,
} from './FolderTable/index.type';
