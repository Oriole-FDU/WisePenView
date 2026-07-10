import { blockNoteSchema } from '@/components/Note/CustomBlockNote/blockNoteSchema';
import { ColorPaletteContent } from '@/components/Note/NoteEditorMenus/colorPalette';
import type { ColorKey } from '@/components/Note/NoteEditorMenus/colorPaletteData';
import { useTableRailSelectionState } from '@/components/Note/NoteTableHandles/railSelectionState';
import { getSafeTableCellSelection, getTableHandles } from '@/components/Note/tableHandlesSafe';
import { Popover } from '@/components/Overlay';
import {
  blockHasType,
  mapTableCell,
  type InlineContentSchema,
  type StyleSchema,
  type TableContent,
} from '@blocknote/core';
import { useBlockNoteEditor, useEditorState } from '@blocknote/react';
import { Button, ButtonGroup, ToggleButtonGroup } from '@heroui/react';
import { Paintbrush, PanelLeft, PanelTop, TableCellsMerge, TableCellsSplit } from 'lucide-react';
import { Fragment, useState } from 'react';
import styles from '../style.module.less';
import { getSelectedBlocks, stopToolbarMouseDown, toBlockUpdate } from '../utils';
import { ToolbarToggleButton } from './ToolbarButton';

type TableCellValue = TableContent<
  InlineContentSchema,
  StyleSchema
>['rows'][number]['cells'][number];
type SelectedTableCell = { cell: TableCellValue; col: number; row: number };
type SelectedTableCellIndices = Pick<SelectedTableCell, 'col' | 'row'>;

function getCellKey(cell: { col: number; row: number }) {
  return `${cell.row}:${cell.col}`;
}

function isMergedCell(cell: TableCellValue) {
  const props = mapTableCell(cell).props;
  return (props.colspan ?? 1) > 1 || (props.rowspan ?? 1) > 1;
}

export function TableCellButtons() {
  const editor = useBlockNoteEditor(blockNoteSchema);
  const railSelection = useTableRailSelectionState();
  const [colorOpen, setColorOpen] = useState(false);
  const state = useEditorState({
    editor,
    selector: ({ editor }) => {
      if (!editor.isEditable) {
        return undefined;
      }
      const selectedBlocks = getSelectedBlocks(editor);
      const tableBlock = selectedBlocks.find((block) => blockHasType(block, editor, 'table'));
      const tableHandles = getTableHandles(editor);
      if (!tableHandles || !tableBlock) {
        return undefined;
      }
      const cellSelection = getSafeTableCellSelection(editor);
      const tableContent = tableBlock?.content as
        TableContent<InlineContentSchema, StyleSchema> | undefined;
      if (!tableContent) {
        return undefined;
      }

      const selectedCells: SelectedTableCell[] = [];
      const selectedCellKeys = new Set<string>();
      const addCell = (cell: SelectedTableCell) => {
        const key = getCellKey(cell);
        if (selectedCellKeys.has(key)) {
          return;
        }
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
            addCell({
              cell: cell.cell as TableCellValue,
              col: cell.col,
              row: cell.row,
            });
          }
        }
      } else if (cellSelection) {
        for (const cell of cellSelection.cells) {
          const tableCell = tableContent.rows[cell.row]?.cells[cell.col];
          if (tableCell) {
            addCell({ cell: tableCell, col: cell.col, row: cell.row });
          }
        }
      }

      const railSelectionStart = hasMatchingRailSelection
        ? Math.min(railStartIndex, railEndIndex)
        : null;
      const railSelectionEnd = hasMatchingRailSelection
        ? Math.max(railStartIndex, railEndIndex)
        : null;
      const mergedCells = selectedCells.filter(({ cell }) => isMergedCell(cell));
      const canSplit = mergedCells.length > 0;
      const canMerge = !canSplit && selectedCells.length > 1;
      const canToggleHeaderRow =
        railOrientation === 'row' && railSelectionStart === 0 && railSelectionEnd === 0;
      const canToggleHeaderColumn =
        railOrientation === 'column' && railSelectionStart === 0 && railSelectionEnd === 0;

      if (!canMerge && !canSplit && !selectedCells.length) {
        return undefined;
      }

      return {
        backgroundColor: selectedCells[0]
          ? mapTableCell(selectedCells[0].cell).props.backgroundColor
          : 'default',
        block: tableBlock,
        canToggleHeaderColumn,
        canToggleHeaderRow,
        isHeaderColumn: Boolean(tableContent.headerCols),
        isHeaderRow: Boolean(tableContent.headerRows),
        mergeAction: canSplit ? ('split' as const) : canMerge ? ('merge' as const) : null,
        selectedCells: selectedCells.map(({ col, row }) => ({ col, row })),
        splitCells: mergedCells.map(({ col, row }) => ({ col, row })),
        tableContent,
      };
    },
  });

  if (!state) {
    return null;
  }

  const tableHandles = getTableHandles(editor);
  const isSplitAction = state.mergeAction === 'split';
  const selectedKeys = new Set<string>([
    ...(isSplitAction ? ['split-cell'] : []),
    ...(state.canToggleHeaderRow && state.isHeaderRow ? ['table-header-row'] : []),
    ...(state.canToggleHeaderColumn && state.isHeaderColumn ? ['table-header-column'] : []),
  ]);
  const toggleButtons: Array<'merge' | 'header-row' | 'header-column'> = [
    ...(state.mergeAction ? (['merge'] as const) : []),
    ...(state.canToggleHeaderRow ? (['header-row'] as const) : []),
    ...(state.canToggleHeaderColumn ? (['header-column'] as const) : []),
  ];

  const refocusEditor = () => {
    window.setTimeout(() => editor.focus());
  };

  const updateTableContent = (tableContent: TableContent<InlineContentSchema, StyleSchema>) => {
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
    updateTableContent({
      ...state.tableContent,
      type: 'tableContent',
      ...(target === 'row'
        ? { headerRows: state.isHeaderRow ? undefined : 1 }
        : { headerCols: state.isHeaderColumn ? undefined : 1 }),
    });
  };

  const applyBackgroundColor = (color: ColorKey) => {
    const rows = state.tableContent.rows.map((row) => ({
      ...row,
      cells: row.cells.map((cell) => mapTableCell(cell)),
    }));
    for (const cell of state.selectedCells as SelectedTableCellIndices[]) {
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

  return (
    <>
      {toggleButtons.length ? (
        <ToggleButtonGroup
          aria-label="表格单元格"
          selectionMode="multiple"
          selectedKeys={selectedKeys}
          orientation="horizontal"
          size="sm"
        >
          {toggleButtons.map((button, index) => (
            <Fragment key={button}>
              {index > 0 ? <ToggleButtonGroup.Separator /> : null}
              {button === 'merge' ? (
                <ToolbarToggleButton
                  id={isSplitAction ? 'split-cell' : 'merge-cells'}
                  label={isSplitAction ? '取消合并' : '合并单元格'}
                  icon={
                    isSplitAction ? <TableCellsSplit size={20} /> : <TableCellsMerge size={20} />
                  }
                  onPress={() => {
                    if (isSplitAction) {
                      const splitCells = [...state.splitCells].sort((a, b) => {
                        if (a.row !== b.row) {
                          return b.row - a.row;
                        }
                        return b.col - a.col;
                      });
                      for (const cell of splitCells) {
                        tableHandles?.splitCell(cell);
                      }
                    } else {
                      tableHandles?.mergeCells();
                    }
                    refocusEditor();
                  }}
                />
              ) : null}
              {button === 'header-row' ? (
                <ToolbarToggleButton
                  id="table-header-row"
                  label={state.isHeaderRow ? '取消标题行' : '设置为标题行'}
                  icon={<PanelTop size={20} />}
                  onPress={() => toggleHeader('row')}
                />
              ) : null}
              {button === 'header-column' ? (
                <ToolbarToggleButton
                  id="table-header-column"
                  label={state.isHeaderColumn ? '取消标题列' : '设置为标题列'}
                  icon={<PanelLeft size={20} />}
                  onPress={() => toggleHeader('column')}
                />
              ) : null}
            </Fragment>
          ))}
        </ToggleButtonGroup>
      ) : null}
      <ButtonGroup size="sm" variant="ghost" aria-label="表格颜色">
        <Popover isOpen={colorOpen} onOpenChange={setColorOpen} deferContent={false}>
          <Popover.Trigger>
            <Button
              variant="ghost"
              size="sm"
              isIconOnly
              className={colorOpen ? styles.toolbarButtonActive : undefined}
              aria-label="单元格背景色"
              onMouseDown={stopToolbarMouseDown}
            >
              <Paintbrush size={20} aria-hidden="true" />
            </Button>
          </Popover.Trigger>
          <Popover.Content className={styles.colorPopover} placement="bottom">
            <Popover.Dialog>
              <ColorPaletteContent
                background={{
                  color: state.backgroundColor,
                  onChange: applyBackgroundColor,
                }}
                onReset={() => applyBackgroundColor('default')}
              />
            </Popover.Dialog>
          </Popover.Content>
        </Popover>
      </ButtonGroup>
    </>
  );
}
