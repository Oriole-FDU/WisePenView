import { isTableCellSelection } from '@blocknote/core';
import type { EditorView } from '@tiptap/pm/view';

/** 返回普通单元格选区的视口矩形；行列轨道选区由其专用 reference 定位。 */
export function getTableCellSelectionRect(view: EditorView): DOMRect | null {
  if (!isTableCellSelection(view.state.selection)) return null;

  const cells = Array.from(
    view.dom.querySelectorAll<HTMLTableCellElement>('td.selectedCell, th.selectedCell')
  );
  if (!cells.length) return null;

  const rects = cells.map((cell) => cell.getBoundingClientRect());
  const left = Math.min(...rects.map((rect) => rect.left));
  const top = Math.min(...rects.map((rect) => rect.top));
  const right = Math.max(...rects.map((rect) => rect.right));
  const bottom = Math.max(...rects.map((rect) => rect.bottom));

  return new DOMRect(left, top, right - left, bottom - top);
}
