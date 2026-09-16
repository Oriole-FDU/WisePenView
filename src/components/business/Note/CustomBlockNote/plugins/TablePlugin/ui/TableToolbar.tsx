import {
  blockHasType,
  type InlineContentSchema,
  isTableCellSelection,
  mapTableCell,
  type StyleSchema,
  type TableContent,
} from '@blocknote/core';
import { useBlockNoteEditor, useEditorState } from '@blocknote/react';
import { ButtonGroup, ToggleButtonGroup } from '@heroui/react';
import { useUnmount } from 'ahooks';
import {
  Paintbrush,
  PanelLeft,
  PanelTop,
  TableCellsMerge,
  TableCellsSplit,
  Trash2,
} from 'lucide-react';
import { createContext, type ReactNode, useContext, useState } from 'react';
import { useTranslation } from 'react-i18next';

import AppPopover from '@/components/base/AppPopover';
import { blockNoteSchema } from '@/components/business/Note/CustomBlockNote/registry/noteEditorComposition';
import { ColorPaletteContent } from '@/components/business/Note/CustomBlockNote/ui/editorMenus/colorPalette';
import type { ColorKey } from '@/components/business/Note/CustomBlockNote/ui/editorMenus/colorPaletteData';
import {
  type ButtonGroupChildProps,
  ToolbarButton,
  ToolbarToggleButton,
} from '@/components/business/Note/CustomBlockNote/ui/toolbar/components/ToolbarButton';
import {
  getSelectedBlocks,
  toBlockUpdate,
} from '@/components/business/Note/CustomBlockNote/ui/toolbar/utils';
import { createClientError, FRONTEND_CLIENT_ERROR } from '@/utils/error';

import {
  type TableRailSelectionOrientation,
  tableRailSelectionState,
  useTableRailSelectionState,
} from './tableHandles/railSelectionState';
import { getSafeTableCellSelection, getTableHandles } from './tableHandles/safe';
import styles from './TableToolbar.module.less';

type TableCellValue = TableContent<
  InlineContentSchema,
  StyleSchema
>['rows'][number]['cells'][number];
type TableBlock = ReturnType<typeof getSelectedBlocks>[number];
type SelectedTableCell = { cell: TableCellValue; col: number; row: number };
type SelectedCellPosition = Pick<SelectedTableCell, 'col' | 'row'>;

interface TableToolbarState {
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

interface TableToolbarContextValue {
  applyBackgroundColor: (color: ColorKey) => void;
  deleteRailSelection: () => void;
  mergeOrSplit: () => void;
  setDeletePreview: (preview: boolean) => void;
  state: TableToolbarState | undefined;
  toggleHeader: (target: 'column' | 'row') => void;
}

const TableToolbarContext = createContext<TableToolbarContextValue | null>(null);

function getCellKey(cell: SelectedCellPosition) {
  return `${cell.row}:${cell.col}`;
}

function isMergedCell(cell: TableCellValue) {
  const props = mapTableCell(cell).props;
  return (props.colspan ?? 1) > 1 || (props.rowspan ?? 1) > 1;
}

function useTableToolbarContext() {
  const context = useContext(TableToolbarContext);
  if (!context) {
    throw createClientError(FRONTEND_CLIENT_ERROR.INTERNAL_STATE, {
      reason: 'Table toolbar action 缺少 TableToolbarProvider',
    });
  }
  return context;
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

export function TableStructureActions() {
  const { t } = useTranslation('note');
  const { mergeOrSplit, state, toggleHeader } = useTableToolbarContext();
  if (!state) return null;

  const isSplitAction = state.mergeAction === 'split';
  const selectedKeys = new Set<string>([
    ...(state.canToggleHeaderRow && state.isHeaderRow ? ['table-header-row'] : []),
    ...(state.canToggleHeaderColumn && state.isHeaderColumn ? ['table-header-column'] : []),
    ...(isSplitAction ? ['split-cell'] : []),
  ]);
  const actions: Array<'header-row' | 'header-column' | 'merge'> = [
    ...(state.canToggleHeaderRow ? (['header-row'] as const) : []),
    ...(state.canToggleHeaderColumn ? (['header-column'] as const) : []),
    ...(state.mergeAction ? (['merge'] as const) : []),
  ];
  if (!actions.length) return null;

  return (
    <ToggleButtonGroup
      aria-label={t('table.cells')}
      selectionMode="multiple"
      selectedKeys={selectedKeys}
      orientation="horizontal"
      size="sm"
    >
      {actions.map((action) => {
        if (action === 'header-row') {
          return (
            <ToolbarToggleButton
              key={action}
              id="table-header-row"
              label={t(state.isHeaderRow ? 'table.unsetHeaderRow' : 'table.setHeaderRow')}
              icon={<PanelTop size={20} />}
              onPress={() => toggleHeader('row')}
            />
          );
        }
        if (action === 'header-column') {
          return (
            <ToolbarToggleButton
              key={action}
              id="table-header-column"
              label={t(state.isHeaderColumn ? 'table.unsetHeaderColumn' : 'table.setHeaderColumn')}
              icon={<PanelLeft size={20} />}
              onPress={() => toggleHeader('column')}
            />
          );
        }
        return (
          <ToolbarToggleButton
            key={action}
            id={isSplitAction ? 'split-cell' : 'merge-cells'}
            label={t(isSplitAction ? 'table.unmerge' : 'table.merge')}
            icon={isSplitAction ? <TableCellsSplit size={20} /> : <TableCellsMerge size={20} />}
            onPress={mergeOrSplit}
          />
        );
      })}
    </ToggleButtonGroup>
  );
}

export function TableCellBackgroundAction(buttonGroupProps: ButtonGroupChildProps) {
  const { t } = useTranslation('note');
  const { applyBackgroundColor, state } = useTableToolbarContext();
  const [open, setOpen] = useState(false);
  if (!state) return null;

  return (
    <AppPopover isOpen={open} onOpenChange={setOpen} deferContent={false}>
      <AppPopover.Trigger>
        <ToolbarButton
          {...buttonGroupProps}
          icon={<Paintbrush size={20} aria-hidden="true" />}
          isActive={open}
          label={t('editor.color.cellBackground')}
        />
      </AppPopover.Trigger>
      <AppPopover.Content placement="bottom" bodyPadding="none">
        <ColorPaletteContent
          background={{
            color: state.backgroundColor,
            onChange: applyBackgroundColor,
          }}
          onReset={() => applyBackgroundColor('default')}
        />
      </AppPopover.Content>
    </AppPopover>
  );
}

export function TableDeleteAction() {
  const { t } = useTranslation('note');
  const { deleteRailSelection, setDeletePreview, state } = useTableToolbarContext();
  const orientation = state?.railOrientation;

  useUnmount(() => setDeletePreview(false));

  if (!orientation) return null;
  const label = t(orientation === 'row' ? 'table.deleteRow' : 'table.deleteColumn');

  return (
    <ButtonGroup size="sm" variant="ghost" aria-label={label}>
      <ToolbarButton
        className={styles.deleteButton}
        icon={<Trash2 size={20} aria-hidden="true" />}
        label={label}
        onHoverChange={setDeletePreview}
        onPress={deleteRailSelection}
      />
    </ButtonGroup>
  );
}
