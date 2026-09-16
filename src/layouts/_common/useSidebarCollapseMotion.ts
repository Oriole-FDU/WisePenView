import { type RefObject, useEffect, useRef } from 'react';

import { SIDEBAR_MAX_WIDTH, SIDEBAR_MIN_WIDTH } from '@/constants/layoutScale';

export const SIDEBAR_COLLAPSE_DURATION_MS = 220;

interface UseSidebarCollapseMotionOptions {
  collapsed: boolean;
  expandedWidth: number;
  collapsedWidth: number;
  minSize?: number;
  maxSize?: number;
  /** panel group 上挂 data-sidebar-motion，供 CSS 显隐窄轨 */
  panelGroupId?: string;
}

interface SidebarCollapseMotion {
  panelSize: number;
  minSize: number;
  maxSize: number;
  isMotionLockedRef: RefObject<boolean>;
  notifyAnimationComplete: () => void;
}

/** 侧栏开合：放宽 Panel 约束；结束时清锁并摘 motion 标记，不 setState。 */
export function useSidebarCollapseMotion({
  collapsed,
  expandedWidth,
  collapsedWidth,
  minSize = SIDEBAR_MIN_WIDTH,
  maxSize = SIDEBAR_MAX_WIDTH,
  panelGroupId,
}: UseSidebarCollapseMotionOptions): SidebarCollapseMotion {
  const isMotionLockedRef = useRef(false);
  const isFirstCollapsedEffectRef = useRef(true);

  /**
   * @wisepen-manual-effect
   * 执行时机：折叠态切换时锁定运动并标记 panel group。
   * 不可替代原因：插值期间挡住布局回写；motion 标记驱动 CSS 显隐，不能用 setState。
   * cleanup：无。
   */
  useEffect(() => {
    if (isFirstCollapsedEffectRef.current) {
      isFirstCollapsedEffectRef.current = false;
      return;
    }
    isMotionLockedRef.current = true;
    if (panelGroupId) {
      document.getElementById(panelGroupId)?.setAttribute('data-sidebar-motion', 'true');
    }
  }, [collapsed, panelGroupId]);

  return {
    panelSize: collapsed ? collapsedWidth : expandedWidth,
    minSize: collapsed ? 0 : minSize,
    maxSize,
    isMotionLockedRef,
    notifyAnimationComplete: () => {
      isMotionLockedRef.current = false;
      if (panelGroupId) {
        document.getElementById(panelGroupId)?.removeAttribute('data-sidebar-motion');
      }
    },
  };
}
