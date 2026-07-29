import type { FolderIconType } from '@/components/Icons/EntryIcon/index.type';
import type { ResourceIconType } from '@/domains/Resource';
import type { SortDescriptor } from '@heroui/react';
import type { DragEvent, ReactNode } from 'react';
import type { FolderColumnWidth } from '../shared/TableBase/columnWidth';
import type { TableColumnBase, TableLoadMore } from '../shared/TableBase/index.type';
import type { TableRowAction } from '../shared/TableRowActions/index.type';

export type FolderTableEntryType = 'root' | 'folder' | 'link' | 'resource' | 'loading';

export interface FolderTableRow {
  id: string;
  name: string;
  entryType: FolderTableEntryType;
  /** folder 类型时使用 EntryIcon 的细分图标 */
  folderIconType?: FolderIconType;
  /** resource 类型时使用 EntryIcon */
  resourceType?: string;
  /** resource 类型时使用 EntryIcon 的细分图标 */
  resourceIconType?: ResourceIconType;
  /** 展示用，如「—」「45 KB」 */
  sizeLabel?: string;
  typeLabel: string;
  /** 是否展示展开控件；适合懒加载 children 的目录行 */
  isExpandable?: boolean;
  /** 树形子节点；展开后插入当前层级下方 */
  children?: FolderTableRow[];
}

export interface FolderTableVisibleRow extends FolderTableRow {
  depth: number;
}

export interface FolderTableRowContext<T extends FolderTableRow> {
  row: T;
  rowId: string;
  depth: number;
}

export interface FolderTableColumn<T extends FolderTableRow> extends Omit<
  TableColumnBase<T, FolderTableRowContext<T>>,
  'renderCell' | 'width'
> {
  width?: FolderColumnWidth;
  /** 树形名称列：展开按钮 + EntryIcon + 名称 */
  isNameColumn?: boolean;
  /** 行操作列：渲染 ⋯ 菜单（需配合 rowActions） */
  isActionColumn?: boolean;
  renderCell?: (row: T, ctx: FolderTableRowContext<T>) => ReactNode;
}

export type FolderTableRowAction<T extends FolderTableRow> = TableRowAction<T>;

export type FolderTableLoadMore = TableLoadMore;

export interface FolderTableCheckboxSelection {
  selectedKeys: Iterable<string>;
  onSelectionChange: (keys: Set<string>) => void;
  disabledKeys?: Iterable<string>;
  /** 不展示复选框，且不参与全选、区间选择。 */
  hiddenKeys?: Iterable<string>;
}

export interface FolderTableBodyDragHandlers {
  onDragEnter?: (event: DragEvent<HTMLElement>) => void;
  onDragOver?: (event: DragEvent<HTMLElement>) => void;
  onDragLeave?: (event: DragEvent<HTMLElement>) => void;
  onDrop?: (event: DragEvent<HTMLElement>) => void;
}

export interface FolderTableProps<T extends FolderTableRow> {
  ariaLabel: string;
  items: T[];
  /**
   * 列定义；不传则使用默认「名称 · 大小 · 类型 · 操作」四列。
   * 中间数据列可用 `eq` 等分；名称列 `fill`、操作列 `folderAction`。
   */
  columns?: FolderTableColumn<T>[];
  loading?: boolean;
  /** 面包屑区（列标题上方） */
  breadcrumb?: ReactNode;
  /** 工具栏按钮组（上传 / 新建文件夹等） */
  toolbar?: ReactNode;
  /** 已展开的文件夹 id */
  expandedRowKeys?: string[];
  onExpandedChange?: (keys: string[]) => void;
  /** 浏览态选中的行 id。 */
  selectedRowKey?: string;
  /** 浏览态单击行，仅更新选中态。 */
  onRowSelect?: (row: T) => void;
  /** 浏览态双击行激活（例如进入文件夹 / 打开资源）。 */
  onRowActivate?: (row: T) => void;
  /** 包装名称列的图标与名称内容，用于在业务层扩展交互能力 */
  renderNameContent?: (content: ReactNode, row: T, ctx: FolderTableRowContext<T>) => ReactNode;
  /** 仅作用于行和其下方空白区域的原生拖放事件。 */
  bodyDragHandlers?: FolderTableBodyDragHandlers;
  /** 渲染在列头下方的 body 覆盖层，不遮挡面包屑和工具栏。 */
  bodyOverlay?: ReactNode;
  rowActions?: FolderTableRowAction<T>[] | ((row: T) => FolderTableRowAction<T>[]);
  /** 滚动加载更多；Folder 型不做分页 */
  loadMore?: FolderTableLoadMore;
  /** 统计总条数；不传则用 items.length */
  totalCount?: number;
  /** 表尾摘要；不传则自动生成「共 N 项」 */
  summary?: ReactNode;
  /** 滚动容器最大高度；不传则由外层布局决定 */
  maxBodyHeight?: number | string;
  emptyText?: string;
  emptyDescription?: string;
  emptyIcon?: ReactNode;
  loadingText?: string;
  skeletonRowCount?: number;
  className?: string;
  sortDescriptor?: SortDescriptor;
  onSortChange?: (descriptor: SortDescriptor) => void;
  /** 始终固定在同级排序最前方的行 */
  isPinnedFirst?: (row: T) => boolean;
  /** 是否进入编辑态；由父组件根据勾选状态派生，编辑态内仅允许勾选。 */
  isEditMode?: boolean;
  /** 编辑态内的多选勾选。 */
  checkboxSelection?: FolderTableCheckboxSelection;
  /** 选择后的操作区（通常配合 checkboxSelection）。 */
  selectionFooter?: ReactNode;
}

export type {
  FolderTableBreadcrumbItem,
  FolderTableBreadcrumbProps,
} from './parts/FolderBreadcrumb/index.type';
