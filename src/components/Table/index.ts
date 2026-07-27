import DataTableComponent from './DataTable';
import DataTableTabs from './DataTable/parts/UnderlineTabs';
import FolderTableComponent from './FolderTable';
import FolderBreadcrumb from './FolderTable/parts/FolderBreadcrumb';
import ManageTableComponent from './ManageTable';
import TableMemberCell from './shared/cells/MemberCell';
import TableTextCell from './shared/cells/TextCell';
import { tableCellStyles, tableStyles } from './shared/styles';

export const ManageTable = Object.assign(ManageTableComponent, {
  MemberCell: TableMemberCell,
  TextCell: TableTextCell,
  styles: tableStyles,
  cellStyles: tableCellStyles,
});

export const DataTable = Object.assign(DataTableComponent, {
  Tabs: DataTableTabs,
  MemberCell: TableMemberCell,
  TextCell: TableTextCell,
  cellStyles: tableCellStyles,
});

export const FolderTable = Object.assign(FolderTableComponent, {
  Breadcrumb: FolderBreadcrumb,
});

/** ManageTable — 可编辑表格 */
export type {
  ManageTableBatchSelection,
  ManageTableColumn,
  ManageTableInlineEdit,
  ManageTablePagination,
  ManageTableProps,
  ManageTableRowAction,
  ManageTableRowContext,
  ManageTableRowState,
} from './ManageTable/index.type';

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
  FolderTableBreadcrumbItem,
  FolderTableBreadcrumbProps,
  FolderTableCheckboxSelection,
  FolderTableColumn,
  FolderTableLoadMore,
  FolderTableProps,
  FolderTableRow,
  FolderTableRowAction,
  FolderTableRowContext,
} from './FolderTable/index.type';
