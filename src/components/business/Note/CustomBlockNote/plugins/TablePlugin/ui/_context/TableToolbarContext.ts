import { type InlineContentSchema, type StyleSchema, type TableContent } from '@blocknote/core';
import { createContext } from 'react';

import type { ColorKey } from '@/components/business/Note/CustomBlockNote/ui/editorMenus/colorPaletteData';
import type { getSelectedBlocks } from '@/components/business/Note/CustomBlockNote/ui/toolbar/utils';

import type { TableRailSelectionOrientation } from '../tableHandles/railSelectionState';

export type TableCellValue = TableContent<
  InlineContentSchema,
  StyleSchema
>['rows'][number]['cells'][number];
type TableBlock = ReturnType<typeof getSelectedBlocks>[number];
export type SelectedTableCell = { cell: TableCellValue; col: number; row: number };
export type SelectedCellPosition = Pick<SelectedTableCell, 'col' | 'row'>;

export interface TableToolbarState {
  backgroundColor: ColorKey;
  block: TableBlock;
  canToggleHeaderColumn: boolean;
  canToggleHeaderRow: boolean;
  isHeaderColumn: boolean;
  isHeaderRow: boolean;
  mergeAction: 'merge' | 'split' | null;
  railEndIndex: number | null;
  railOrientation: TableRailSelectionOrientation | null;
  railStartIndex: number | null;
  selectedCells: SelectedCellPosition[];
  splitCells: SelectedCellPosition[];
  tableContent: TableContent<InlineContentSchema, StyleSchema>;
}

export interface TableToolbarContextValue {
  applyBackgroundColor: (color: ColorKey) => void;
  deleteRailSelection: () => void;
  mergeOrSplit: () => void;
  setDeletePreview: (preview: boolean) => void;
  state: TableToolbarState | undefined;
  toggleHeader: (target: 'column' | 'row') => void;
}

export const TableToolbarContext = createContext<TableToolbarContextValue | null>(null);
