import { createClientError, FRONTEND_CLIENT_ERROR } from '@/utils/error';
import { isRecord } from '@/utils/typeGuards';

import { addAiDiffDomListener } from '../../engines/aiDiff/domCleanup';
import type { NotePluginRegistry } from '../../registry/types';
import styles from './style.module.less';

interface TableCellLike {
  content: unknown[];
  props: Record<string, unknown>;
}

const TABLE_INTERACTIVE_SELECTOR = 'a, button, input, select, textarea, [tabindex]';
const TABLE_EDITOR_EVENTS = [
  'mousedown',
  'mouseup',
  'mousemove',
  'mouseover',
  'pointerdown',
  'pointerup',
  'pointermove',
] as const;

export interface TableContentLike {
  rows: Array<{ cells: unknown[] }>;
  columnWidths: Array<number | undefined>;
  headerRows?: number;
  headerCols?: number;
}

export function readTableContent(block: Record<string, unknown>): TableContentLike | null {
  if (!isRecord(block.content)) return null;
  const content = block.content;
  if (!Array.isArray(content.rows) || !Array.isArray(content.columnWidths)) return null;
  return content as unknown as TableContentLike;
}

function readCell(cell: unknown): TableCellLike {
  if (Array.isArray(cell)) return { content: cell, props: {} };
  if (!isRecord(cell)) return { content: [], props: {} };
  return {
    content: Array.isArray(cell.content) ? cell.content : [],
    props: isRecord(cell.props) ? cell.props : {},
  };
}

function readSpan(value: unknown): number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : 1;
}

function readHeaderCount(value: unknown): number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : 0;
}

function applyColorAttribute(
  element: HTMLElement,
  attribute: 'backgroundColor' | 'textColor',
  value: unknown
): void {
  if (typeof value !== 'string' || !value || value === 'default') return;
  element.dataset[attribute] = value;
}

function renderTableCellContent(
  element: HTMLTableCellElement,
  content: readonly unknown[],
  registry: NotePluginRegistry
): void {
  const paragraph = document.createElement('p');
  for (const inline of content) {
    if (!isRecord(inline) || typeof inline.type !== 'string') continue;
    const owner = registry.inlinePlugins.get(inline.type);
    if (!owner) {
      throw createClientError(FRONTEND_CLIENT_ERROR.INTERNAL_STATE, {
        reason: `AI Diff 表格候选缺少 inline owner：${inline.type}`,
      });
    }
    paragraph.appendChild(owner.aiDiff.renderAiContent(inline, registry));
  }
  element.appendChild(paragraph);
}

function createColumnGroup(columnWidths: readonly (number | undefined)[]): HTMLTableColElement {
  const columnGroup = document.createElement('colgroup');
  for (const width of columnWidths) {
    const column = document.createElement('col');
    if (typeof width === 'number' && width > 0) column.style.width = `${width}px`;
    columnGroup.appendChild(column);
  }
  return columnGroup;
}

/** AI Diff 表格只用于审阅；保留文字选择，但关闭编辑、拖拽、聚焦和内容内操作。 */
function makeTableReadOnly(root: HTMLElement): HTMLElement {
  root.contentEditable = 'false';
  root.draggable = false;
  root.dataset.readOnly = 'true';
  root.dataset.hoverEffects = 'disabled';
  root.setAttribute('aria-readonly', 'true');

  root.querySelectorAll<HTMLElement>('*').forEach((element) => {
    element.contentEditable = 'false';
    element.draggable = false;
    if (element.matches(TABLE_INTERACTIVE_SELECTOR)) {
      element.tabIndex = -1;
      element.setAttribute('aria-disabled', 'true');
    }
  });
  addAiDiffDomListener(root, 'click', (event) => {
    const target = event.target;
    if (!(target instanceof Element) || !target.closest(TABLE_INTERACTIVE_SELECTOR)) return;
    event.preventDefault();
    event.stopPropagation();
  });
  // 不拦截 mousedown/pointerdown：父级 review 需用其做「选中」；仅挡会触发编辑的移动类事件
  TABLE_EDITOR_EVENTS.forEach((eventName) => {
    if (eventName === 'mousedown' || eventName === 'pointerdown') return;
    addAiDiffDomListener(root, eventName, (event) => event.stopPropagation());
  });
  return root;
}

/** 使用表格原生结构渲染只读 AI 候选，并保留表头、合并单元格与列宽。 */
export function TableAiContentView(
  aiBlock: Record<string, unknown>,
  registry: NotePluginRegistry
): HTMLElement {
  const root = document.createElement('div');
  root.className = `bn-block-content ${styles.tableView}`;
  root.dataset.contentType = 'table';

  const blockProps = isRecord(aiBlock.props) ? aiBlock.props : {};
  applyColorAttribute(root, 'textColor', blockProps.textColor);

  const tableWrapper = document.createElement('div');
  tableWrapper.className = `tableWrapper ${styles.tableWrapper}`;
  const tableWrapperInner = document.createElement('div');
  tableWrapperInner.className = 'tableWrapper-inner';
  const table = document.createElement('table');
  table.className = styles.table;
  const content = readTableContent(aiBlock);
  if (!content) {
    tableWrapperInner.appendChild(table);
    tableWrapper.appendChild(tableWrapperInner);
    root.appendChild(tableWrapper);
    return makeTableReadOnly(root);
  }

  table.appendChild(createColumnGroup(content.columnWidths));
  const body = document.createElement('tbody');
  const occupiedUntilRow: number[] = [];
  const headerRows = readHeaderCount(content.headerRows);
  const headerCols = readHeaderCount(content.headerCols);

  content.rows.forEach((row, rowIndex) => {
    const tableRow = document.createElement('tr');
    let columnIndex = 0;
    row.cells.forEach((cell) => {
      while ((occupiedUntilRow[columnIndex] ?? 0) > rowIndex) columnIndex += 1;

      const { content: cellContent, props } = readCell(cell);
      const colspan = readSpan(props.colspan);
      const rowspan = readSpan(props.rowspan);
      const isHeader = rowIndex < headerRows || columnIndex < headerCols;
      const tableCell = document.createElement(isHeader ? 'th' : 'td');
      tableCell.colSpan = colspan;
      tableCell.rowSpan = rowspan;
      const columnWidth = content.columnWidths.slice(columnIndex, columnIndex + colspan);
      if (columnWidth.some((width) => typeof width === 'number' && width > 0)) {
        tableCell.setAttribute('colwidth', columnWidth.map((width) => width ?? '').join(','));
      }
      applyColorAttribute(tableCell, 'backgroundColor', props.backgroundColor);
      applyColorAttribute(tableCell, 'textColor', props.textColor);
      if (typeof props.textAlignment === 'string') {
        tableCell.dataset.textAlignment = props.textAlignment;
      }
      renderTableCellContent(tableCell, cellContent, registry);
      tableRow.appendChild(tableCell);

      if (rowspan > 1) {
        for (let index = columnIndex; index < columnIndex + colspan; index += 1) {
          occupiedUntilRow[index] = rowIndex + rowspan;
        }
      }
      columnIndex += colspan;
    });
    body.appendChild(tableRow);
  });

  table.appendChild(body);
  tableWrapperInner.appendChild(table);
  tableWrapper.appendChild(tableWrapperInner);
  root.appendChild(tableWrapper);
  return makeTableReadOnly(root);
}
