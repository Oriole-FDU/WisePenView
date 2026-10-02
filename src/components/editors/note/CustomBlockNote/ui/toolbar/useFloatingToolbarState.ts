import { TextSelection } from '@tiptap/pm/state';
import type { EditorView } from '@tiptap/pm/view';
import { useLatest, useMemoizedFn, useMount, useUnmount } from 'ahooks';
import { useEffect, useRef, useState } from 'react';

import { getRootDomSelection } from '@/components/editors/note/CustomBlockNote/engines/editor/dom';
import { getTableCellSelectionRect } from '@/components/editors/note/CustomBlockNote/plugins/TablePlugin/ui/selection';
import type { CustomBlockNoteEditor } from '@/components/editors/note/CustomBlockNote/registry/noteEditorComposition';

type FloatingToolbarGeometry = {
  visible: boolean;
  left: number;
  top: number;
};

type FloatingToolbarState = FloatingToolbarGeometry & { mounted: boolean };

const TOOLBAR_FADE_DURATION_MS = 120;
function getMountedEditorView(editor: CustomBlockNoteEditor): EditorView | null {
  try {
    const view = editor.prosemirrorView;
    return view.dom.isConnected ? view : null;
  } catch {
    return null;
  }
}

function isSideMenuEventTarget(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && target.closest('.bn-side-menu') !== null;
}

function getEditorDomSelectionRange(view: EditorView): Range | null {
  const selection = getRootDomSelection(view.root);
  if (!selection || selection.isCollapsed || selection.rangeCount === 0) return null;
  const range = selection.getRangeAt(0);
  const isInsideEditor = (node: Node) =>
    view.dom.contains(node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement);
  return isInsideEditor(range.startContainer) && isInsideEditor(range.endContainer) ? range : null;
}

function mapViewportRectToToolbarState(
  rect: Pick<DOMRect, 'left' | 'top'>
): FloatingToolbarGeometry {
  return {
    visible: true,
    left: rect.left,
    top: Math.max(8, rect.top - 10),
  };
}

function getDomSelectionToolbarState(view: EditorView): FloatingToolbarGeometry {
  const selectionRange = getEditorDomSelectionRange(view);
  if (!selectionRange) return { visible: false, left: 0, top: 0 };
  const startRange = selectionRange.cloneRange();
  startRange.collapse(true);
  const rect = startRange.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) {
    return { visible: false, left: 0, top: 0 };
  }
  return mapViewportRectToToolbarState(rect);
}

function getSafeToolbarState(
  view: EditorView,
  keepVisibleWithoutDomSelection: boolean
): FloatingToolbarGeometry {
  const { selection, doc } = view.state;
  if (selection.empty) {
    return getDomSelectionToolbarState(view);
  }
  const tableCellSelectionRect = getTableCellSelectionRect(view);
  if (tableCellSelectionRect) {
    return mapViewportRectToToolbarState(tableCellSelectionRect);
  }
  if (!(selection instanceof TextSelection)) {
    return { visible: false, left: 0, top: 0 };
  }
  if (!keepVisibleWithoutDomSelection && !getEditorDomSelectionRange(view)) {
    return { visible: false, left: 0, top: 0 };
  }
  if (doc.textBetween(selection.from, selection.to).length === 0) {
    return getDomSelectionToolbarState(view);
  }

  try {
    const startRect = view.coordsAtPos(selection.from);
    return mapViewportRectToToolbarState(startRect);
  } catch {
    return getDomSelectionToolbarState(view);
  }
}

export function useFloatingToolbarState(
  editor: CustomBlockNoteEditor,
  disabled: boolean,
  keepVisibleWithoutDomSelection = false
): FloatingToolbarState {
  const [toolbarState, setToolbarState] = useState<FloatingToolbarState>({
    mounted: false,
    visible: false,
    left: 0,
    top: 0,
  });
  const frameRef = useRef<number | null>(null);
  const unmountTimerRef = useRef<number | null>(null);
  const toolbarStateRef = useRef(toolbarState);
  const selectingPointerIdRef = useRef<number | null>(null);
  const blockHandleDraggingRef = useRef(false);
  const suppressToolbarRef = useRef(false);
  const disabledLatest = useLatest(disabled);
  const keepVisibleWithoutDomSelectionLatest = useLatest(keepVisibleWithoutDomSelection);

  const cancelToolbarUnmount = () => {
    if (unmountTimerRef.current === null) return;
    window.clearTimeout(unmountTimerRef.current);
    unmountTimerRef.current = null;
  };

  const hideToolbar = useMemoizedFn(() => {
    if (frameRef.current !== null) {
      window.cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
    const current = toolbarStateRef.current;
    if (!current.mounted) return;
    if (current.visible) {
      cancelToolbarUnmount();
      const hiddenState = { ...current, visible: false };
      toolbarStateRef.current = hiddenState;
      setToolbarState(hiddenState);
    }
    if (unmountTimerRef.current !== null) return;
    unmountTimerRef.current = window.setTimeout(() => {
      unmountTimerRef.current = null;
      if (toolbarStateRef.current.visible) return;
      const unmountedState = { ...toolbarStateRef.current, mounted: false };
      toolbarStateRef.current = unmountedState;
      setToolbarState(unmountedState);
    }, TOOLBAR_FADE_DURATION_MS);
  });

  const syncToolbarState = useMemoizedFn(() => {
    if (frameRef.current !== null) {
      return;
    }
    frameRef.current = window.requestAnimationFrame(() => {
      frameRef.current = null;
      const view = getMountedEditorView(editor);
      if (!view) return;
      if (
        disabledLatest.current ||
        blockHandleDraggingRef.current ||
        suppressToolbarRef.current ||
        view.dragging
      ) {
        hideToolbar();
        return;
      }
      const next = getSafeToolbarState(view, keepVisibleWithoutDomSelectionLatest.current);
      if (!next.visible) {
        hideToolbar();
        return;
      }
      cancelToolbarUnmount();
      setToolbarState((prev) => {
        const resolved =
          prev.mounted &&
          prev.visible === next.visible &&
          prev.left === next.left &&
          prev.top === next.top
            ? prev
            : { ...next, mounted: true };
        toolbarStateRef.current = resolved;
        return resolved;
      });
    });
  });

  const syncToolbarStateIfNeeded = () => {
    if (blockHandleDraggingRef.current || suppressToolbarRef.current) return;
    if (selectingPointerIdRef.current !== null) return;
    const view = getMountedEditorView(editor);
    if (!view) return;
    if (!toolbarStateRef.current.visible && view.state.selection.empty) {
      const selection = getRootDomSelection(view.root);
      if (!selection || selection.isCollapsed) return;
    }
    syncToolbarState();
  };

  /**
   * @wisepen-manual-effect
   * 执行时机：工具栏禁用状态变化时隐藏或重新读取编辑器选区位置。
   * 不可替代原因：位置来自 ProseMirror view 与 DOM Selection 的外部可变状态。
   * cleanup：帧和卸载延时由 hook 统一卸载清理；本轮没有独立订阅。
   */
  useEffect(() => {
    if (disabled) {
      hideToolbar();
      return;
    }
    syncToolbarState();
  }, [disabled, hideToolbar, keepVisibleWithoutDomSelection, syncToolbarState]);

  const handlePointerDown = (event: PointerEvent) => {
    const view = getMountedEditorView(editor);
    if (!view || !(event.target instanceof Node) || !view.dom.contains(event.target)) return;
    if (event.button !== 0) {
      suppressToolbarRef.current = true;
      hideToolbar();
      return;
    }
    suppressToolbarRef.current = false;
    selectingPointerIdRef.current = event.pointerId;
    hideToolbar();
  };

  const handleContextMenu = (event: MouseEvent) => {
    const view = getMountedEditorView(editor);
    if (!view || !(event.target instanceof Node) || !view.dom.contains(event.target)) return;
    suppressToolbarRef.current = true;
    hideToolbar();
  };

  const handleDragStart = (event: DragEvent) => {
    if (!isSideMenuEventTarget(event.target)) return;
    blockHandleDraggingRef.current = true;
    window.requestAnimationFrame(() => {
      if (!blockHandleDraggingRef.current) return;
      hideToolbar();
    });
  };

  const handleDragEnd = () => {
    if (!blockHandleDraggingRef.current) return;
    blockHandleDraggingRef.current = false;
    hideToolbar();
  };

  const handlePointerEnd = (event: PointerEvent) => {
    if (selectingPointerIdRef.current !== event.pointerId) return;
    selectingPointerIdRef.current = null;
    syncToolbarState();
  };

  useMount(() => {
    const tiptapEditor = editor._tiptapEditor;
    tiptapEditor.on('selectionUpdate', syncToolbarStateIfNeeded);
    tiptapEditor.on('update', syncToolbarStateIfNeeded);
    document.addEventListener('selectionchange', syncToolbarStateIfNeeded);
    document.addEventListener('pointerdown', handlePointerDown, true);
    document.addEventListener('contextmenu', handleContextMenu, true);
    document.addEventListener('pointerup', handlePointerEnd, true);
    document.addEventListener('pointercancel', handlePointerEnd, true);
    document.addEventListener('dragstart', handleDragStart, true);
    document.addEventListener('dragend', handleDragEnd, true);
    document.addEventListener('drop', handleDragEnd, true);
    document.addEventListener('keyup', syncToolbarStateIfNeeded, true);
    window.addEventListener('pointermove', syncToolbarStateIfNeeded, true);
    return () => {
      tiptapEditor.off('selectionUpdate', syncToolbarStateIfNeeded);
      tiptapEditor.off('update', syncToolbarStateIfNeeded);
      document.removeEventListener('selectionchange', syncToolbarStateIfNeeded);
      document.removeEventListener('pointerdown', handlePointerDown, true);
      document.removeEventListener('contextmenu', handleContextMenu, true);
      document.removeEventListener('pointerup', handlePointerEnd, true);
      document.removeEventListener('pointercancel', handlePointerEnd, true);
      document.removeEventListener('dragstart', handleDragStart, true);
      document.removeEventListener('dragend', handleDragEnd, true);
      document.removeEventListener('drop', handleDragEnd, true);
      document.removeEventListener('keyup', syncToolbarStateIfNeeded, true);
      window.removeEventListener('pointermove', syncToolbarStateIfNeeded, true);
    };
  });

  useUnmount(() => {
    cancelToolbarUnmount();
    if (frameRef.current !== null) {
      window.cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
  });

  return toolbarState;
}
