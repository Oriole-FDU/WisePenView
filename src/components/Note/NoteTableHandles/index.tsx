import { blockNoteSchema } from '@/components/Note/CustomBlockNote/blockNoteSchema';
import { useNoteEditorReadOnlyContext } from '@/components/Note/CustomBlockNote/editorReadOnly';
import {
  getSafeTableCellSelection,
  getTableHandles,
  hasMountedEditorView,
} from '@/components/Note/tableHandlesSafe';
import {
  isTableCellSelection,
  mapTableCell,
  type InlineContentSchema,
  type StyleSchema,
  type TableContent,
} from '@blocknote/core';
import { TableHandlesExtension } from '@blocknote/core/extensions';
import {
  TableCellButton,
  TableHandlesController,
  useBlockNoteEditor,
  useEditorState,
  useExtensionState,
  type TableCellButtonProps,
} from '@blocknote/react';
import { Button, Tooltip } from '@heroui/react';
import { useEventListener, useMount, useUnmount, useUpdateEffect } from 'ahooks';
import { Plus, Table2 } from 'lucide-react';
import { useRef, useState, type CSSProperties, type MouseEvent, type PointerEvent } from 'react';
import { createPortal } from 'react-dom';
import { tableRailSelectionState } from './railSelectionState';
import styles from './style.module.less';

type RowInsertTarget = { orientation: 'row'; index: number; side: 'above' | 'below' };
type ColumnInsertTarget = { orientation: 'column'; index: number; side: 'left' | 'right' };
type InsertTarget = RowInsertTarget | ColumnInsertTarget | null;
type SelectionTarget = { orientation: 'row' | 'column'; index: number };
type SelectionDragTarget = SelectionTarget | null;
type SelectionRange = { orientation: 'row' | 'column'; startIndex: number; endIndex: number };

function getTargetKey(target: Exclude<InsertTarget, null>) {
  return `${target.orientation}:${target.index}:${target.side}`;
}

function getSelectionTargetKey(target: SelectionTarget) {
  return `${target.orientation}:${target.index}`;
}

function NoteTableCellHandle(props: TableCellButtonProps) {
  return (
    <TableCellButton {...props}>
      <span className={styles.tableCellHandleIcon} aria-hidden="true">
        <Table2 size={14} />
      </span>
    </TableCellButton>
  );
}

function useEditorViewReady() {
  const editor = useBlockNoteEditor(blockNoteSchema);
  const [viewReady, setViewReady] = useState(() => hasMountedEditorView(editor));
  const animationFrameRef = useRef(0);
  const disposedRef = useRef(false);

  useMount(() => {
    disposedRef.current = false;
    const update = () => {
      if (disposedRef.current) {
        return;
      }

      const nextViewReady = hasMountedEditorView(editor);
      setViewReady(nextViewReady);
      if (!nextViewReady) {
        animationFrameRef.current = window.requestAnimationFrame(update);
      }
    };

    update();
  });

  useUnmount(() => {
    disposedRef.current = true;
    if (animationFrameRef.current) {
      window.cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = 0;
    }
  });

  return viewReady;
}

function TableInsertHandles() {
  const viewReady = useEditorViewReady();

  if (!viewReady) {
    return null;
  }

  return <MountedTableInsertHandles />;
}

function MountedTableInsertHandles() {
  const editor = useBlockNoteEditor(blockNoteSchema);
  const tableHandles = getTableHandles(editor);
  const state = useExtensionState(TableHandlesExtension, { editor });
  const isSelectingTableCells = useEditorState({
    editor,
    selector: ({ editor }) => isTableCellSelection(editor.prosemirrorState.selection),
  });
  const [activeTarget, setActiveTarget] = useState<InsertTarget>(null);
  const [railSelectionRange, setRailSelectionRange] = useState<SelectionRange | null>(null);
  const activeInsertKeyRef = useRef<string | null>(null);
  const isPressingInsertRef = useRef(false);
  const hoveredSelectionKeyRef = useRef<string | null>(null);
  const dragSelectionRef = useRef<SelectionDragTarget>(null);
  const didDragSelectionRef = useRef(false);

  useUnmount(() => {
    dragSelectionRef.current = null;
    isPressingInsertRef.current = false;
    tableRailSelectionState.clear();
    tableHandles?.unfreezeHandles();
  });

  useUpdateEffect(() => {
    if (isSelectingTableCells) {
      return;
    }
    dragSelectionRef.current = null;
    setRailSelectionRange(null);
    tableRailSelectionState.clear();
  }, [isSelectingTableCells]);

  useEventListener('pointerup', () => {
    if (isPressingInsertRef.current) {
      window.setTimeout(() => {
        if (!isPressingInsertRef.current) {
          return;
        }
        isPressingInsertRef.current = false;
        activeInsertKeyRef.current = null;
        setActiveTarget(null);
        tableHandles?.unfreezeHandles();
      });
      return;
    }
    dragSelectionRef.current = null;
    tableHandles?.unfreezeHandles();
  });

  if (!state?.show || !state.referencePosTable || !tableHandles || !editor.isEditable) {
    return null;
  }

  const tableElement = state.widgetContainer?.closest('.tableWrapper')?.querySelector('table');
  const tableWrapper = state.widgetContainer?.closest('.tableWrapper');
  const portalContainer = tableWrapper?.closest<HTMLElement>('.bn-block-content');
  const rows = tableElement
    ? Array.from(tableElement.querySelectorAll<HTMLTableRowElement>('tbody > tr'))
    : [];
  const tableContent = state.block.content as TableContent<InlineContentSchema, StyleSchema>;
  const tableRect = tableElement?.getBoundingClientRect();
  const containerRect = portalContainer?.getBoundingClientRect();

  if (!tableWrapper || !portalContainer || !tableRect || !containerRect) {
    return null;
  }

  const insert = (target: Exclude<InsertTarget, null>) => {
    setActiveTarget(null);
    setRailSelectionRange(null);
    tableRailSelectionState.clear();
    tableHandles.addRowOrColumn(
      target.index,
      target.orientation === 'row'
        ? { orientation: 'row', side: target.side }
        : { orientation: 'column', side: target.side }
    );
    window.setTimeout(() => editor.focus());
  };
  const tableLeft = tableRect.left - containerRect.left;
  const tableTop = tableRect.top - containerRect.top;
  const tableRight = tableRect.right - containerRect.left;
  const tableBottom = tableRect.bottom - containerRect.top;
  const tableWidth = tableRect.width;
  const tableHeight = tableRect.height;
  const blockStyle = window.getComputedStyle(portalContainer);
  const selectionRailSize =
    Number.parseFloat(blockStyle.getPropertyValue('--note-table-select-rail-size')) || 8;
  const logicalColumnCount = Math.max(
    0,
    ...tableContent.rows.map((row) =>
      row.cells.reduce((count, cell) => count + (mapTableCell(cell).props.colspan ?? 1), 0)
    )
  );
  const getActualCellIndexForLogicalColumn = (rowIndex: number, logicalColumnIndex: number) => {
    const row = tableContent.rows[rowIndex];
    if (!row) {
      return 0;
    }
    let startColumn = 0;
    for (let cellIndex = 0; cellIndex < row.cells.length; cellIndex += 1) {
      const colspan = mapTableCell(row.cells[cellIndex]).props.colspan ?? 1;
      if (logicalColumnIndex >= startColumn && logicalColumnIndex < startColumn + colspan) {
        return cellIndex;
      }
      startColumn += colspan;
    }
    return Math.max(row.cells.length - 1, 0);
  };
  const getLastActualCellIndexForRow = (rowIndex: number) =>
    Math.max((tableContent.rows[rowIndex]?.cells.length ?? 1) - 1, 0);
  const getColumnBoundaries = () => {
    if (!logicalColumnCount) {
      return [];
    }

    const boundaries = [tableLeft, tableRight];
    for (const row of rows) {
      for (const cell of Array.from(row.children)) {
        if (!(cell instanceof HTMLElement)) {
          continue;
        }
        const rect = cell.getBoundingClientRect();
        boundaries.push(rect.left - containerRect.left, rect.right - containerRect.left);
      }
    }

    const mergedBoundaries = boundaries
      .sort((a, b) => a - b)
      .reduce<number[]>((result, value) => {
        const previous = result.at(-1);
        if (previous == null || Math.abs(previous - value) > 1) {
          result.push(value);
        }
        return result;
      }, []);

    if (mergedBoundaries.length === logicalColumnCount + 1) {
      return mergedBoundaries;
    }

    const fallbackColumnWidth = tableWidth / logicalColumnCount;
    return Array.from(
      { length: logicalColumnCount + 1 },
      (_, index) => tableLeft + fallbackColumnWidth * index
    );
  };
  const columnBoundaryPositions = getColumnBoundaries();
  const columnMetrics = columnBoundaryPositions.slice(0, -1).map((left, index) => ({
    key: `column-${index}`,
    target: { orientation: 'column', index } satisfies SelectionTarget,
    left,
    width: columnBoundaryPositions[index + 1] - left,
  }));
  const activeTargetKey = activeTarget ? getTargetKey(activeTarget) : null;
  const cellSelection = getSafeTableCellSelection(editor);
  const selectedRailKeysFromCellSelection =
    cellSelection && cellSelection.cells.length > 0
      ? (() => {
          const selectedRows = new Set(cellSelection.cells.map((cell) => cell.row));
          const selectedColumns = new Set(cellSelection.cells.map((cell) => cell.col));
          const railKeys = new Set<string>();
          for (const row of selectedRows) {
            if (selectedColumns.size === (tableContent.rows[row]?.cells.length ?? 0)) {
              railKeys.add(getSelectionTargetKey({ orientation: 'row', index: row }));
            }
          }
          if (selectedColumns.size === 1 && selectedRows.size === rows.length) {
            const [actualColumnIndex] = [...selectedColumns];
            const logicalColumnIndex = columnMetrics.find((column) =>
              rows.some(
                (_, rowIndex) =>
                  getActualCellIndexForLogicalColumn(rowIndex, column.target.index) ===
                  actualColumnIndex
              )
            )?.target.index;
            if (logicalColumnIndex != null) {
              railKeys.add(
                getSelectionTargetKey({ orientation: 'column', index: logicalColumnIndex })
              );
            }
          }
          return railKeys;
        })()
      : new Set<string>();
  const selectedRailKeys = railSelectionRange
    ? (() => {
        const keys = new Set<string>(selectedRailKeysFromCellSelection);
        const start = Math.min(railSelectionRange.startIndex, railSelectionRange.endIndex);
        const end = Math.max(railSelectionRange.startIndex, railSelectionRange.endIndex);
        for (let index = start; index <= end; index += 1) {
          keys.add(getSelectionTargetKey({ orientation: railSelectionRange.orientation, index }));
        }
        return keys;
      })()
    : selectedRailKeysFromCellSelection;

  const rowBoundaries = rows.length
    ? [
        {
          key: 'row-before-0',
          top: tableTop,
          target: { orientation: 'row', index: 0, side: 'above' } satisfies RowInsertTarget,
        },
        ...rows.map((row, index) => ({
          key: `row-after-${index}`,
          top: row.getBoundingClientRect().bottom - containerRect.top,
          target: { orientation: 'row', index, side: 'below' } satisfies RowInsertTarget,
        })),
      ]
    : [];

  const columnBoundaries = columnBoundaryPositions.length
    ? [
        {
          key: 'column-before-0',
          left: columnBoundaryPositions[0],
          target: {
            orientation: 'column',
            index: 0,
            side: 'left',
          } satisfies ColumnInsertTarget,
        },
        ...columnBoundaryPositions.slice(1).map((left, index) => ({
          key: `column-after-${index}`,
          left,
          target: {
            orientation: 'column',
            index,
            side: 'right',
          } satisfies ColumnInsertTarget,
        })),
      ]
    : [];

  const rowRails = rows.map((row, index) => ({
    key: `select-row-${index}`,
    target: { orientation: 'row', index } satisfies SelectionTarget,
    top: row.getBoundingClientRect().top - containerRect.top,
    height: row.getBoundingClientRect().height,
  }));

  const columnRails = columnMetrics.map((column) => ({
    key: `select-${column.key}`,
    target: column.target,
    left: column.left,
    width: column.width,
  }));

  const getSelectionRange = (target: SelectionTarget, endIndex = target.index) => {
    if (target.orientation === 'row') {
      const startRow = Math.min(target.index, endIndex);
      const endRow = Math.max(target.index, endIndex);
      return {
        from: { row: startRow, col: 0 },
        to: {
          row: endRow,
          col: getLastActualCellIndexForRow(endRow),
        },
      };
    }

    const startColumn = Math.min(target.index, endIndex);
    const endColumn = Math.max(target.index, endIndex);
    const rowRange = {
      start: 0,
      end: Math.max(rows.length - 1, 0),
    };

    return {
      from: {
        row: rowRange.start,
        col: getActualCellIndexForLogicalColumn(rowRange.start, startColumn),
      },
      to: {
        row: rowRange.end,
        col: getActualCellIndexForLogicalColumn(rowRange.end, endColumn),
      },
    };
  };

  const selectCells = (target: SelectionTarget, endIndex = target.index) => {
    const railReferenceRect = getRailReferenceRect(target, endIndex);
    setRailSelectionRange({
      orientation: target.orientation,
      startIndex: target.index,
      endIndex,
    });
    if (railReferenceRect) {
      tableRailSelectionState.setSelection(target.orientation, railReferenceRect, {
        blockId: state.block.id,
        endIndex,
        startIndex: target.index,
      });
    }
    const range = getSelectionRange(target, endIndex);
    editor.exec((beforeState, dispatch) => {
      const nextState = tableHandles.setCellSelection(beforeState, range.from, range.to);
      dispatch?.(beforeState.tr.setSelection(nextState.selection));
      return true;
    });
  };

  const holdSelectionHandles = () => {
    tableHandles.freezeHandles();
  };

  const getRailReferenceRect = (target: SelectionTarget, endIndex = target.index) => {
    const startIndex = Math.min(target.index, endIndex);
    const lastIndex = Math.max(target.index, endIndex);

    if (target.orientation === 'row') {
      const firstRow = rows[startIndex];
      const lastRow = rows[lastIndex];
      if (!firstRow || !lastRow) {
        return undefined;
      }
      const firstRowRect = firstRow.getBoundingClientRect();
      const lastRowRect = lastRow.getBoundingClientRect();
      return {
        x: tableRect.left - selectionRailSize,
        y: firstRowRect.top,
        width: selectionRailSize,
        height: lastRowRect.bottom - firstRowRect.top,
      };
    }

    const left = columnBoundaryPositions[startIndex];
    const right = columnBoundaryPositions[lastIndex + 1];
    if (left == null || right == null) {
      return undefined;
    }

    return {
      x: containerRect.left + left,
      y: tableRect.top - selectionRailSize,
      width: right - left,
      height: selectionRailSize,
    };
  };

  const handleSelectionPointerEnter = (target: SelectionTarget) => {
    if (activeInsertKeyRef.current) {
      return;
    }
    hoveredSelectionKeyRef.current = getSelectionTargetKey(target);
    holdSelectionHandles();
    const dragTarget = dragSelectionRef.current;
    if (dragTarget?.orientation === target.orientation) {
      if (dragTarget.index !== target.index) {
        didDragSelectionRef.current = true;
      }
      selectCells(dragTarget, target.index);
    }
  };

  const handleSelectionPointerLeave = (target: SelectionTarget) => {
    const key = getSelectionTargetKey(target);
    if (hoveredSelectionKeyRef.current === key) {
      hoveredSelectionKeyRef.current = null;
    }
    tableHandles.unfreezeHandles();
  };

  const handleInsertPointerEnter = (target: Exclude<InsertTarget, null>) => {
    activeInsertKeyRef.current = getTargetKey(target);
    setActiveTarget(target);
    tableHandles.freezeHandles();
  };

  const handleInsertPointerLeave = (target: Exclude<InsertTarget, null>) => {
    const key = getTargetKey(target);
    if (activeInsertKeyRef.current === key) {
      activeInsertKeyRef.current = null;
    }
    setActiveTarget((current) => (current && getTargetKey(current) === key ? null : current));
    if (!hoveredSelectionKeyRef.current && !isPressingInsertRef.current) {
      tableHandles.unfreezeHandles();
    }
  };

  const handleSelectionPointerDown = (
    event: PointerEvent<HTMLButtonElement>,
    target: SelectionTarget
  ) => {
    event.preventDefault();
    event.stopPropagation();
    if (activeInsertKeyRef.current) {
      return;
    }
    dragSelectionRef.current = target;
    didDragSelectionRef.current = false;
    tableHandles.freezeHandles();
    selectCells(target);
  };

  const handleSelectionClick = (event: MouseEvent<HTMLButtonElement>, target: SelectionTarget) => {
    event.preventDefault();
    event.stopPropagation();
    if (didDragSelectionRef.current) {
      didDragSelectionRef.current = false;
      return;
    }
    if (!activeInsertKeyRef.current) {
      selectCells(target);
    }
  };

  const handleInsertPointerDown = (
    event: PointerEvent<Element>,
    target: Exclude<InsertTarget, null>
  ) => {
    event.preventDefault();
    event.stopPropagation();
    isPressingInsertRef.current = true;
    handleInsertPointerEnter(target);
  };

  const handleInsertClick = (event: MouseEvent<Element>, target: Exclude<InsertTarget, null>) => {
    event.preventDefault();
    event.stopPropagation();
    isPressingInsertRef.current = false;
    activeInsertKeyRef.current = null;
    insert(target);
    tableHandles.unfreezeHandles();
  };
  return createPortal(
    <>
      <div
        className={styles.selectionLayer}
        contentEditable={false}
        data-inserting={activeTargetKey ? 'true' : undefined}
      >
        {rowRails.map(({ key, target, top, height }) => (
          <button
            key={key}
            type="button"
            className={styles.selectionRail}
            data-orientation="row"
            data-selected={selectedRailKeys.has(getSelectionTargetKey(target)) ? 'true' : undefined}
            style={
              {
                left: tableLeft,
                top,
                height,
                '--selection-highlight-width': `${tableWidth}px`,
              } as CSSProperties
            }
            aria-label={`选择第 ${target.index + 1} 行`}
            onPointerDown={(event) => handleSelectionPointerDown(event, target)}
            onPointerEnter={() => handleSelectionPointerEnter(target)}
            onPointerLeave={() => handleSelectionPointerLeave(target)}
            onClick={(event) => handleSelectionClick(event, target)}
          />
        ))}
        {columnRails.map(({ key, target, left, width }) => (
          <button
            key={key}
            type="button"
            className={styles.selectionRail}
            data-orientation="column"
            data-selected={selectedRailKeys.has(getSelectionTargetKey(target)) ? 'true' : undefined}
            style={
              {
                left,
                top: tableTop,
                width,
                '--selection-highlight-height': `${tableHeight}px`,
              } as CSSProperties
            }
            aria-label={`选择第 ${target.index + 1} 列`}
            onPointerDown={(event) => handleSelectionPointerDown(event, target)}
            onPointerEnter={() => handleSelectionPointerEnter(target)}
            onPointerLeave={() => handleSelectionPointerLeave(target)}
            onClick={(event) => handleSelectionClick(event, target)}
          />
        ))}
      </div>
      <div className={styles.insertLayer} contentEditable={false}>
        {rowBoundaries.map(({ key, top, target }) => {
          const isActive = activeTargetKey === getTargetKey(target);

          return (
            <div
              key={key}
              className={styles.insertHandle}
              data-orientation="row"
              data-active={isActive ? 'true' : undefined}
              style={
                {
                  left: 0,
                  top,
                  width: tableRight,
                  '--table-edge': `${tableLeft}px`,
                } as CSSProperties
              }
            >
              <Tooltip>
                <Tooltip.Trigger className={styles.insertButtonTrigger}>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    isIconOnly
                    className={styles.insertButton}
                    aria-label="插入行"
                    onPointerEnter={() => handleInsertPointerEnter(target)}
                    onPointerLeave={() => handleInsertPointerLeave(target)}
                    onPointerDown={(event) => handleInsertPointerDown(event, target)}
                    onClick={(event) => handleInsertClick(event, target)}
                  >
                    <Plus size={16} strokeWidth={2.25} aria-hidden="true" />
                  </Button>
                </Tooltip.Trigger>
                <Tooltip.Content showArrow placement="left" offset={8}>
                  <Tooltip.Arrow />
                  插入行
                </Tooltip.Content>
              </Tooltip>
            </div>
          );
        })}
        {columnBoundaries.map(({ key, left, target }) => {
          const isActive = activeTargetKey === getTargetKey(target);

          return (
            <div
              key={key}
              className={styles.insertHandle}
              data-orientation="column"
              data-active={isActive ? 'true' : undefined}
              style={
                {
                  left,
                  top: 0,
                  height: tableBottom,
                  '--table-edge': `${tableTop}px`,
                } as CSSProperties
              }
            >
              <Tooltip>
                <Tooltip.Trigger className={styles.insertButtonTrigger}>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    isIconOnly
                    className={styles.insertButton}
                    aria-label="插入列"
                    onPointerEnter={() => handleInsertPointerEnter(target)}
                    onPointerLeave={() => handleInsertPointerLeave(target)}
                    onPointerDown={(event) => handleInsertPointerDown(event, target)}
                    onClick={(event) => handleInsertClick(event, target)}
                  >
                    <Plus size={16} strokeWidth={2.25} aria-hidden="true" />
                  </Button>
                </Tooltip.Trigger>
                <Tooltip.Content showArrow placement="top" offset={8}>
                  <Tooltip.Arrow />
                  插入列
                </Tooltip.Content>
              </Tooltip>
            </div>
          );
        })}
      </div>
    </>,
    portalContainer
  );
}

export default function NoteTableHandles() {
  const readOnly = useNoteEditorReadOnlyContext();
  const viewReady = useEditorViewReady();

  if (readOnly || !viewReady) {
    return null;
  }

  return (
    <div className={styles.host}>
      <TableHandlesController
        tableHandle={() => null}
        tableCellHandle={NoteTableCellHandle}
        extendButton={() => null}
      />
      <TableInsertHandles />
    </div>
  );
}
