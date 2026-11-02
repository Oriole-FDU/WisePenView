import { useEffect, useRef, useState } from 'react';
import type {
  Layout,
  LayoutChangedMeta,
  PanelImperativeHandle,
  PanelSize,
} from 'react-resizable-panels';

import { clampSidebarWidth, SIDEBAR_MAX_WIDTH, SIDEBAR_MIN_WIDTH } from '@/constants/layoutScale';
import { useResizablePanelSize } from '@/hooks/useResizablePanelSize';

import { useSystemLayoutStore } from './_store/useSystemLayoutStore';
import { focusVisibleSidebarToggle } from './focusSidebarToggle';
import { useSidebarCollapseMotion } from './useSidebarCollapseMotion';

type SidebarMotionPhase = 'expanded' | 'collapsing' | 'collapsed' | 'expanding';

interface UseSystemSidebarPanelOptions {
  collapsedWidth: number;
  enabled?: boolean;
}

export function useSystemSidebarPanel({
  collapsedWidth,
  enabled = true,
}: UseSystemSidebarPanelOptions) {
  const collapsed = useSystemLayoutStore((state) => state.sidebarCollapsed);
  const setCollapsed = useSystemLayoutStore((state) => state.setSidebarCollapsed);
  const storedWidth = useSystemLayoutStore((state) => state.sidebarWidth);
  const setWidth = useSystemLayoutStore((state) => state.setSidebarWidth);
  const panelRef = useRef<PanelImperativeHandle | null>(null);
  const pendingWidthRef = useRef<number | null>(null);
  const pendingFocusToggleRef = useRef(false);
  const [motionPhase, setMotionPhase] = useState<SidebarMotionPhase>(
    collapsed ? 'collapsed' : 'expanded'
  );
  const width = clampSidebarWidth(storedWidth);
  const { panelSize, minSize, maxSize, isMotionLockedRef, notifyAnimationComplete } =
    useSidebarCollapseMotion({
      collapsed,
      transitioning: motionPhase === 'collapsing' || motionPhase === 'expanding',
      expandedWidth: width,
      collapsedWidth,
      minSize: SIDEBAR_MIN_WIDTH,
      maxSize: SIDEBAR_MAX_WIDTH,
    });

  const persistWidthFromPanel = () => {
    const currentWidth = panelRef.current?.getSize().inPixels;
    if (currentWidth == null) return;
    setWidth(currentWidth);
  };

  const handleAnimationComplete = () => {
    notifyAnimationComplete();
    setMotionPhase(collapsed ? 'collapsed' : 'expanded');
    if (!pendingFocusToggleRef.current || !collapsed) return;
    pendingFocusToggleRef.current = false;
    focusVisibleSidebarToggle();
  };

  useResizablePanelSize({
    panelRef,
    size: panelSize,
    enabled,
    animate: true,
    onComplete: handleAnimationComplete,
  });

  /**
   * @wisepen-manual-effect
   * 执行时机：侧栏从折叠切回展开后，把焦点归还给侧栏内切换按钮。
   * 不可替代原因：展开态按钮在面板内容中，需等待 React 提交后再 focus。
   * cleanup：无。
   */
  useEffect(() => {
    if (!pendingFocusToggleRef.current) return;
    if (collapsed) return;
    pendingFocusToggleRef.current = false;
    focusVisibleSidebarToggle();
  }, [collapsed]);

  const toggle = () => {
    pendingFocusToggleRef.current = true;
    if (!collapsed) {
      persistWidthFromPanel();
      setMotionPhase('collapsing');
    } else {
      setMotionPhase('expanding');
    }
    setCollapsed(!collapsed);
  };

  const handleResize = (size: PanelSize) => {
    if (!enabled) return;
    if (collapsed || isMotionLockedRef.current) return;
    pendingWidthRef.current = clampSidebarWidth(size.inPixels);
  };

  const handleLayoutChanged = (_layout: Layout, meta: LayoutChangedMeta) => {
    if (!enabled) return;
    const pendingWidth = pendingWidthRef.current;
    pendingWidthRef.current = null;
    if (collapsed || isMotionLockedRef.current) return;

    if (meta.isUserInteraction && pendingWidth != null) {
      setWidth(pendingWidth);
      panelRef.current?.resize(pendingWidth);
      return;
    }

    const currentWidth = panelRef.current?.getSize().inPixels;
    if (currentWidth == null || currentWidth >= SIDEBAR_MIN_WIDTH - 0.5) return;
    panelRef.current?.resize(SIDEBAR_MIN_WIDTH);
  };

  return {
    collapsed,
    handleLayoutChanged,
    handleResize,
    maxSize,
    minSize,
    motionPhase,
    panelRef,
    panelSize,
    toggle,
  };
}
