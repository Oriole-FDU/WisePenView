import { TextSelection } from '@tiptap/pm/state';
import type { EditorView } from '@tiptap/pm/view';
import { useLatest, useMemoizedFn, useMount, useUnmount } from 'ahooks';
import { useEffect, useRef, useState } from 'react';

import { getRootDomSelection } from '@/components/Note/CustomBlockNote/engines/editor/dom';
import type { CustomBlockNoteEditor } from '@/components/Note/CustomBlockNote/registry/noteEditorComposition';

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

function getEditorDomSelectionRange(view: EditorView): Range | null {
  const selection = getRootDomSelection(view.root);
  if (!selection || selection.isCollapsed || selection.rangeCount === 0) return null;
  const range = selection.getRangeAt(0);
  const isInsideEditor = (node: Node) =>
    view.dom.contains(node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement);
  return isInsideEditor(range.startContainer) && isInsideEditor(range.endContainer) ? range : null;
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
  return {
    visible: true,
    left: rect.left,
    top: Math.max(8, rect.top - 10),
  };
}

function getSafeToolbarState(view: EditorView): FloatingToolbarGeometry {
  const { selection, doc } = view.state;
  if (selection.empty) {
    return getDomSelectionToolbarState(view);
  }
  if (selection instanceof TextSelection) {
    if (!getEditorDomSelectionRange(view)) {
      return { visible: false, left: 0, top: 0 };
    }
    if (doc.textBetween(selection.from, selection.to).length === 0) {
      return getDomSelectionToolbarState(view);
    }
  }

  try {
    const startRect = view.coordsAtPos(selection.from);
    return {
      visible: true,
      left: startRect.left,
      top: Math.max(8, startRect.top - 10),
    };
  } catch {
    return getDomSelectionToolbarState(view);
  }
}

export function useFloatingToolbarState(
  editor: CustomBlockNoteEditor,
  disabled: boolean
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
  const disabledLatest = useLatest(disabled);

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
      if (disabledLatest.current) {
        hideToolbar();
        return;
      }
      const next = getSafeToolbarState(view);
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
  }, [disabled, hideToolbar, syncToolbarState]);

  const handlePointerDown = (event: PointerEvent) => {
    if (event.button !== 0) return;
    const view = getMountedEditorView(editor);
    if (!view || !(event.target instanceof Node) || !view.dom.contains(event.target)) return;
    selectingPointerIdRef.current = event.pointerId;
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
    document.addEventListener('pointerup', handlePointerEnd, true);
    document.addEventListener('pointercancel', handlePointerEnd, true);
    document.addEventListener('keyup', syncToolbarStateIfNeeded, true);
    return () => {
      tiptapEditor.off('selectionUpdate', syncToolbarStateIfNeeded);
      tiptapEditor.off('update', syncToolbarStateIfNeeded);
      document.removeEventListener('selectionchange', syncToolbarStateIfNeeded);
      document.removeEventListener('pointerdown', handlePointerDown, true);
      document.removeEventListener('pointerup', handlePointerEnd, true);
      document.removeEventListener('pointercancel', handlePointerEnd, true);
      document.removeEventListener('keyup', syncToolbarStateIfNeeded, true);
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
