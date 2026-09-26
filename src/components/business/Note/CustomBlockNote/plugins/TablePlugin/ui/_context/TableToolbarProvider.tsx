import {
  blockHasType,
  type InlineContentSchema,
  isTableCellSelection,
  mapTableCell,
  type StyleSchema,
  type TableContent,
} from '@blocknote/core';
import { useBlockNoteEditor, useEditorState } from '@blocknote/react';
import type { ReactNode } from 'react';

import { blockNoteSchema } from '@/components/business/Note/CustomBlockNote/registry/noteEditorComposition';
import type { ColorKey } from '@/components/business/Note/CustomBlockNote/ui/editorMenus/colorPaletteData';
import {
  getSelectedBlocks,
  toBlockUpdate,
} from '@/components/business/Note/CustomBlockNote/ui/toolbar/utils';

import {
  tableRailSelectionState,
  useTableRailSelectionState,
} from '../tableHandles/railSelectionState';
import { getSafeTableCellSelection, getTableHandles } from '../tableHandles/safe';
import {
  type SelectedCellPosition,
  type SelectedTableCell,
  type TableCellValue,
  TableToolbarContext,
  type TableToolbarState,
} from './TableToolbarContext';

function getCellKey(cell: SelectedCellPosition) {
  return `${cell.row}:${cell.col}`;
}

function isMergedCell(cell: TableCellValue) {
  const props = mapTableCell(cell).props;
  return (props.colspan ?? 1) > 1 || (props.rowspan ?? 1) > 1;
}

export function TableToolbarProvider({ children }: { children: ReactNode }) {
  const editor = useBlockNoteEditor(blockNoteSchema);
  const railSelection = useTableRailSelectionState();
  const state = useEditorState({
    editor,
    selector: ({ editor }) => {
      if (!editor.isEditable || !isTableCellSelection(editor.prosemirrorState.selection)) {
        return undefined;
      }

      const selectedBlocks = getSelectedBlocks(editor);
      const tableBlock = selectedBlocks.find((block) => blockHasType(block, editor, 'table'));
      const tableHandles = getTableHandles(editor);
      if (!tableHandles || !tableBlock) {
        return undefined;
      }

      const cellSelection = getSafeTableCellSelection(editor);
      const tableContent = tableBlock.content as
        TableContent<InlineContentSchema, StyleSchema> | undefined;
      if (!cellSelection || !tableContent) {
        return undefined;
      }

      const selectedCells: SelectedTableCell[] = [];
      const selectedCellKeys = new Set<string>();
      const addCell = (cell: SelectedTableCell) => {
        const key = getCellKey(cell);
        if (selectedCellKeys.has(key)) return;
        selectedCellKeys.add(key);
        selectedCells.push(cell);
      };
      const railEndIndex = railSelection.endIndex;
      const railOrientation = railSelection.orientation;
      const railStartIndex = railSelection.startIndex;
      const hasMatchingRailSelection =
        railOrientation !== null &&
        railSelection.blockId === tableBlock.id &&
        railStartIndex !== null &&
        railEndIndex !== null;

      if (hasMatchingRailSelection) {
        const startIndex = Math.min(railStartIndex, railEndIndex);
        const endIndex = Math.max(railStartIndex, railEndIndex);
        const tableBlockForHandles = tableBlock as unknown as Parameters<
          typeof tableHandles.getCellsAtRowHandle
        >[0];

        for (let index = startIndex; index <= endIndex; index += 1) {
          const cells =
            railOrientation === 'row'
              ? tableHandles.getCellsAtRowHandle(tableBlockForHandles, index)
              : tableHandles.getCellsAtColumnHandle(tableBlockForHandles, index);
          for (const cell of cells) {
            addCell({ cell: cell.cell as TableCellValue, col: cell.col, row: cell.row });
          }
        }
      } else {
        for (const cell of cellSelection.cells) {
          const tableCell = tableContent.rows[cell.row]?.cells[cell.col];
          if (tableCell) {
            addCell({ cell: tableCell, col: cell.col, row: cell.row });
          }
        }
      }

      if (!selectedCells.length) {
        return undefined;
      }

      const normalizedRailStart = hasMatchingRailSelection
        ? Math.min(railStartIndex, railEndIndex)
        : null;
      const normalizedRailEnd = hasMatchingRailSelection
        ? Math.max(railStartIndex, railEndIndex)
        : null;
      const mergedCells = selectedCells.filter(({ cell }) => isMergedCell(cell));
      const canSplit = mergedCells.length > 0;
      const canMerge = !canSplit && selectedCells.length > 1;

      return {
        backgroundColor: (mapTableCell(selectedCells[0].cell).props.backgroundColor ??
          'default') as ColorKey,
        block: tableBlock,
        canToggleHeaderColumn:
          railOrientation === 'column' && normalizedRailStart === 0 && normalizedRailEnd === 0,
        canToggleHeaderRow:
          railOrientation === 'row' && normalizedRailStart === 0 && normalizedRailEnd === 0,
        isHeaderColumn: Boolean(tableContent.headerCols),
        isHeaderRow: Boolean(tableContent.headerRows),
        mergeAction: canSplit ? ('split' as const) : canMerge ? ('merge' as const) : null,
        railEndIndex: normalizedRailEnd,
        railOrientation: hasMatchingRailSelection ? railOrientation : null,
        railStartIndex: normalizedRailStart,
        selectedCells: selectedCells.map(({ col, row }) => ({ col, row })),
        splitCells: mergedCells.map(({ col, row }) => ({ col, row })),
        tableContent,
      } satisfies TableToolbarState;
    },
  });

  const refocusEditor = () => {
    window.setTimeout(() => editor.focus());
  };

  const updateTableContent = (tableContent: TableContent<InlineContentSchema, StyleSchema>) => {
    if (!state) return;
    editor.updateBlock(
      state.block,
      toBlockUpdate({
        type: 'table',
        content: tableContent,
      })
    );
    refocusEditor();
  };

  const toggleHeader = (target: 'column' | 'row') => {
    if (!state) return;
    updateTableContent({
      ...state.tableContent,
      type: 'tableContent',
      ...(target === 'row'
        ? { headerRows: state.isHeaderRow ? undefined : 1 }
        : { headerCols: state.isHeaderColumn ? undefined : 1 }),
    });
  };

  const applyBackgroundColor = (color: ColorKey) => {
    if (!state) return;
    const rows = state.tableContent.rows.map((row) => ({
      ...row,
      cells: row.cells.map((cell) => mapTableCell(cell)),
    }));
    for (const cell of state.selectedCells) {
      const targetCell = rows[cell.row]?.cells[cell.col];
      if (targetCell) {
        targetCell.props.backgroundColor = color;
      }
    }
    updateTableContent({
      ...state.tableContent,
      type: 'tableContent',
      rows,
    });
  };

  const mergeOrSplit = () => {
    if (!state?.mergeAction) return;
    const tableHandles = getTableHandles(editor);
    if (state.mergeAction === 'split') {
      const splitCells = [...state.splitCells].sort((a, b) =>
        a.row === b.row ? b.col - a.col : b.row - a.row
      );
      for (const cell of splitCells) {
        tableHandles?.splitCell(cell);
      }
    } else {
      tableHandles?.mergeCells();
    }
    refocusEditor();
  };

  const setDeletePreview = (preview: boolean) => {
    tableRailSelectionState.setDeletePreview(preview);
  };

  const deleteRailSelection = () => {
    if (!state?.railOrientation || state.railStartIndex === null || state.railEndIndex === null) {
      return;
    }
    const tableHandles = getTableHandles(editor);
    const indexes = Array.from(
      { length: state.railEndIndex - state.railStartIndex + 1 },
      (_, offset) => state.railStartIndex! + offset
    ).reverse();
    setDeletePreview(false);
    for (const index of indexes) {
      tableHandles?.removeRowOrColumn(index, state.railOrientation);
    }
    tableRailSelectionState.clear();
    refocusEditor();
  };

  return (
    <TableToolbarContext.Provider
      value={{
        applyBackgroundColor,
        deleteRailSelection,
        mergeOrSplit,
        setDeletePreview,
        state,
        toggleHeader,
      }}
    >
      {children}
    </TableToolbarContext.Provider>
  );
}
