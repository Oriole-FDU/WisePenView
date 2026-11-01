import type { DefaultReactSuggestionItem } from '@blocknote/react';
import { useMemoizedFn } from 'ahooks';
import { useEffect, useRef, useState } from 'react';

import type { CustomBlockNoteEditor } from '../../registry/noteEditorComposition';

const EDGE_ANCHOR_ITEM_COUNT = 2;
const SCROLL_EDGE_TOLERANCE = 1;

interface NavigationState {
  mode: 'keyboard' | 'mouse';
  index: number | undefined;
}

interface MousePosition {
  clientX: number;
  clientY: number;
}

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
  const [navigation, setNavigation] = useState<NavigationState>({ mode: 'keyboard', index: 0 });
  const navigationRef = useRef(navigation);
  const mousePositionRef = useRef<MousePosition | undefined>(undefined);
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

  const updateNavigation = useMemoizedFn((next: NavigationState) => {
    const current = navigationRef.current;
    navigationRef.current = next;
    if (current.mode !== next.mode || current.index !== next.index) {
      setNavigation(next);
    }
    if (next.index === undefined) {
      editor.domElement?.removeAttribute('aria-activedescendant');
    } else {
      editor.domElement?.setAttribute('aria-activedescendant', getSlashMenuItemId(next.index));
    }
  });

  const activateKeyboardItem = useMemoizedFn((index: number) => {
    if (!items[index]) return;
    updateNavigation({ mode: 'keyboard', index });
    const viewport = viewportRef.current;
    if (viewport) {
      scrollItemIntoAnchor(viewport, index);
      updateScrollEdges();
    }
  });

  const moveKeyboardSelection = useMemoizedFn((offset: number) => {
    const itemCount = items.length;
    if (itemCount === 0) return;

    const activeIndex = navigationRef.current.index;
    if (activeIndex === undefined) {
      activateKeyboardItem(offset > 0 ? 0 : itemCount - 1);
      return;
    }
    activateKeyboardItem((activeIndex + offset + itemCount) % itemCount);
  });

  const syncMouseItem = useMemoizedFn(() => {
    const viewport = viewportRef.current;
    const position = mousePositionRef.current;
    const target =
      position && viewport?.ownerDocument.elementFromPoint(position.clientX, position.clientY);
    const item = target?.closest<HTMLElement>('[data-slash-menu-index]');
    const index =
      item && viewport?.contains(item) ? Number(item.dataset.slashMenuIndex) : undefined;
    updateNavigation({ mode: 'mouse', index });
  });

  const handleMouseMove = (event: MouseEvent) => {
    const previousPosition = mousePositionRef.current;
    const hasActualMovement = previousPosition
      ? previousPosition.clientX !== event.clientX || previousPosition.clientY !== event.clientY
      : event.movementX !== 0 || event.movementY !== 0;
    mousePositionRef.current = { clientX: event.clientX, clientY: event.clientY };

    // 键盘滚动可能让静止指针下的元素变化，只有真实移动才交还鼠标导航。
    if (navigationRef.current.mode === 'keyboard' && !hasActualMovement) return;
    syncMouseItem();
  };

  const handleMouseLeave = () => {
    mousePositionRef.current = undefined;
    if (navigationRef.current.mode === 'mouse') {
      updateNavigation({ mode: 'mouse', index: undefined });
    }
  };

  const handleWheel = (event: WheelEvent) => {
    mousePositionRef.current = { clientX: event.clientX, clientY: event.clientY };
    syncMouseItem();
  };

  const handleScroll = () => {
    updateScrollEdges();
    // 滚轮和惯性滚动不产生鼠标移动事件，需要重新命中指针下的选项。
    if (navigationRef.current.mode === 'mouse') syncMouseItem();
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
      const selectedIndex = navigationRef.current.index;
      const selectedItem = selectedIndex === undefined ? undefined : items[selectedIndex];
      if (selectedItem) {
        onItemClick?.(selectedItem);
      }
    };

    const animationFrame = requestAnimationFrame(() => {
      syncAvailableHeight(viewport);
      const { mode, index } = navigationRef.current;
      if (mode === 'keyboard' && index !== undefined) {
        activateKeyboardItem(index);
      } else {
        syncMouseItem();
      }
      updateScrollEdges();
    });
    const floatingLayer = viewport.parentElement?.parentElement;
    const keepActiveItemAnchored = () => {
      const { mode, index } = navigationRef.current;
      if (mode === 'keyboard' && index !== undefined) {
        scrollItemIntoAnchor(viewport, index);
      } else {
        syncMouseItem();
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
    syncMouseItem,
    updateScrollEdges,
  ]);

  return {
    ...scrollEdges,
    activeIndex: navigation.index,
    handleMouseMove,
    handleMouseLeave,
    handleWheel,
    handleScroll,
    viewportRef,
  };
}
