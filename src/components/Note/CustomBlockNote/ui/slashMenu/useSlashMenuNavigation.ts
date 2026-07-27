import type { DefaultReactSuggestionItem } from '@blocknote/react';
import { useMemoizedFn } from 'ahooks';
import { useEffect, useRef, useState } from 'react';
import type { CustomBlockNoteEditor } from '../../registry/noteEditorComposition';

const EDGE_ANCHOR_ITEM_COUNT = 2;
const SCROLL_EDGE_TOLERANCE = 1;

interface ScrollEdges {
  canScrollDown: boolean;
  canScrollUp: boolean;
}

interface UseSlashMenuNavigationProps {
  editor: CustomBlockNoteEditor;
  items: DefaultReactSuggestionItem[];
  onItemClick?: (item: DefaultReactSuggestionItem) => void;
}

export function getSlashMenuItemId(index: number) {
  return `bn-suggestion-menu-item-${index}`;
}

function getScrollEdges(viewport: HTMLDivElement): ScrollEdges {
  const maxScrollTop = Math.max(0, viewport.scrollHeight - viewport.clientHeight);
  return {
    canScrollUp: viewport.scrollTop > SCROLL_EDGE_TOLERANCE,
    canScrollDown: viewport.scrollTop < maxScrollTop - SCROLL_EDGE_TOLERANCE,
  };
}

function syncAvailableHeight(viewport: HTMLDivElement) {
  const menuShell = viewport.parentElement;
  const floatingLayer = menuShell?.parentElement;
  if (!menuShell || !floatingLayer) return false;

  const floatingMaxHeight = Number.parseFloat(floatingLayer.style.maxHeight);
  if (!Number.isFinite(floatingMaxHeight) || floatingMaxHeight <= 0) return false;
  const menuShellBorderHeight = menuShell.offsetHeight - menuShell.clientHeight;
  const availableHeight = `${Math.max(0, floatingMaxHeight - menuShellBorderHeight)}px`;
  if (menuShell.style.getPropertyValue('--note-slash-menu-available-height') === availableHeight) {
    return false;
  }
  menuShell.style.setProperty('--note-slash-menu-available-height', availableHeight);
  return true;
}

function isSameScrollEdges(current: ScrollEdges, next: ScrollEdges) {
  return current.canScrollUp === next.canScrollUp && current.canScrollDown === next.canScrollDown;
}

function getMenuItem(viewport: HTMLDivElement, index: number) {
  return viewport.querySelector<HTMLElement>(`[data-slash-menu-index="${index}"]`);
}

function scrollItemIntoAnchor(viewport: HTMLDivElement, index: number) {
  const item = getMenuItem(viewport, index);
  if (!item) return;

  const viewportRect = viewport.getBoundingClientRect();
  const itemRect = item.getBoundingClientRect();
  const maxEdgeInset = Math.max(0, (viewport.clientHeight - itemRect.height) / 2);
  const edgeInset = Math.min(itemRect.height * EDGE_ANCHOR_ITEM_COUNT, maxEdgeInset);
  const anchorTop = viewportRect.top + edgeInset;
  const anchorBottom = viewportRect.bottom - edgeInset;
  let nextScrollTop = viewport.scrollTop;

  if (itemRect.top < anchorTop) {
    nextScrollTop -= anchorTop - itemRect.top;
  } else if (itemRect.bottom > anchorBottom) {
    nextScrollTop += itemRect.bottom - anchorBottom;
  }

  const maxScrollTop = Math.max(0, viewport.scrollHeight - viewport.clientHeight);
  viewport.scrollTop = Math.min(maxScrollTop, Math.max(0, nextScrollTop));
}

function positionKeyboardFrame(viewport: HTMLDivElement, index: number) {
  const menuShell = viewport.parentElement;
  const item = getMenuItem(viewport, index);
  if (!menuShell || !item) return;

  const menuShellRect = menuShell.getBoundingClientRect();
  const itemRect = item.getBoundingClientRect();
  menuShell.style.setProperty(
    '--note-slash-menu-frame-left',
    `${itemRect.left - menuShellRect.left}px`
  );
  menuShell.style.setProperty(
    '--note-slash-menu-frame-top',
    `${itemRect.top - menuShellRect.top}px`
  );
  menuShell.style.setProperty('--note-slash-menu-frame-width', `${itemRect.width}px`);
  menuShell.style.setProperty('--note-slash-menu-frame-height', `${itemRect.height}px`);
}

function stopMenuKeyboardEvent(event: KeyboardEvent) {
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
}

export function useSlashMenuNavigation({
  editor,
  items,
  onItemClick,
}: UseSlashMenuNavigationProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const hoveredIndexRef = useRef(0);
  const keyboardIndexRef = useRef<number | undefined>(undefined);
  const mousePositionRef = useRef<{ clientX: number; clientY: number } | undefined>(undefined);
  const [hoveredIndex, setHoveredIndex] = useState(0);
  const [isKeyboardNavigating, setIsKeyboardNavigating] = useState(false);
  const [scrollEdges, setScrollEdges] = useState<ScrollEdges>({
    canScrollDown: false,
    canScrollUp: false,
  });

  const updateScrollEdges = useMemoizedFn(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const nextScrollEdges = getScrollEdges(viewport);
    setScrollEdges((current) =>
      isSameScrollEdges(current, nextScrollEdges) ? current : nextScrollEdges
    );
  });

  const syncEditorActiveDescendant = useMemoizedFn((index: number) => {
    editor.domElement?.setAttribute('aria-activedescendant', getSlashMenuItemId(index));
  });

  const activateKeyboardItem = useMemoizedFn((index: number) => {
    keyboardIndexRef.current = index;
    const viewport = viewportRef.current;
    if (viewport) {
      scrollItemIntoAnchor(viewport, index);
      positionKeyboardFrame(viewport, index);
      updateScrollEdges();
    }
    setIsKeyboardNavigating(true);
    syncEditorActiveDescendant(index);
  });

  const moveKeyboardSelection = useMemoizedFn((offset: number) => {
    const baseIndex = keyboardIndexRef.current ?? hoveredIndexRef.current;
    activateKeyboardItem((baseIndex + offset + items.length) % items.length);
  });

  const handleItemMouseMove = (index: number, event: MouseEvent) => {
    const previousPosition = mousePositionRef.current;
    const hasActualMovement = previousPosition
      ? previousPosition.clientX !== event.clientX || previousPosition.clientY !== event.clientY
      : event.movementX !== 0 || event.movementY !== 0;
    mousePositionRef.current = event;

    if (keyboardIndexRef.current !== undefined && !hasActualMovement) return;
    if (keyboardIndexRef.current === undefined && hoveredIndexRef.current === index) return;
    hoveredIndexRef.current = index;
    keyboardIndexRef.current = undefined;
    setHoveredIndex(index);
    setIsKeyboardNavigating(false);
    syncEditorActiveDescendant(index);
  };

  /**
   * @wisepen-manual-effect
   * 执行时机：斜杠菜单挂载或候选项变化时绑定键盘导航与可视区观察。
   * 不可替代原因：BlockNote 键盘事件、滚动位置和 ResizeObserver 都属于外部 DOM 状态。
   * cleanup：移除事件监听、断开观察器并取消待执行帧。
   */
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const editorElement = editor.domElement;
      if (!(event.target instanceof Node) || !editorElement?.contains(event.target)) return;

      if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        stopMenuKeyboardEvent(event);
        moveKeyboardSelection(event.key === 'ArrowUp' ? -1 : 1);
        return;
      }

      if (event.key === 'PageUp' || event.key === 'PageDown') {
        stopMenuKeyboardEvent(event);
        activateKeyboardItem(event.key === 'PageUp' ? 0 : items.length - 1);
        return;
      }

      if (event.key !== 'Enter' || event.isComposing) return;
      stopMenuKeyboardEvent(event);
      const selectedIndex = keyboardIndexRef.current ?? hoveredIndexRef.current;
      onItemClick?.(items[selectedIndex]);
    };

    const animationFrame = requestAnimationFrame(() => {
      syncAvailableHeight(viewport);
      updateScrollEdges();
      syncEditorActiveDescendant(hoveredIndexRef.current);
    });
    const floatingLayer = viewport.parentElement?.parentElement;
    const keepActiveItemAnchored = () => {
      const activeIndex = keyboardIndexRef.current ?? hoveredIndexRef.current;
      scrollItemIntoAnchor(viewport, activeIndex);
      if (keyboardIndexRef.current !== undefined) {
        positionKeyboardFrame(viewport, activeIndex);
      }
      updateScrollEdges();
    };
    const handleViewportResize = () => {
      syncAvailableHeight(viewport);
      keepActiveItemAnchored();
    };
    const resizeObserver = new ResizeObserver(handleViewportResize);
    resizeObserver.observe(viewport);
    if (floatingLayer) {
      resizeObserver.observe(floatingLayer);
    }
    document.addEventListener('keydown', handleKeyDown, true);

    return () => {
      cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
      document.removeEventListener('keydown', handleKeyDown, true);
      editor.domElement?.removeAttribute('aria-activedescendant');
    };
  }, [
    activateKeyboardItem,
    editor,
    items,
    moveKeyboardSelection,
    onItemClick,
    syncEditorActiveDescendant,
    updateScrollEdges,
  ]);

  return {
    ...scrollEdges,
    handleItemMouseMove,
    handleScroll: updateScrollEdges,
    hoveredIndex,
    isKeyboardNavigating,
    viewportRef,
  };
}
