import { type RefObject, useEffect, useRef } from 'react';

import { SIDEBAR_MAX_WIDTH, SIDEBAR_MIN_WIDTH } from '@/constants/layoutScale';

interface UseSidebarCollapseMotionOptions {
  collapsed: boolean;
  transitioning: boolean;
  expandedWidth: number;
  collapsedWidth: number;
  minSize?: number;
  maxSize?: number;
}

interface SidebarCollapseMotion {
  panelSize: number;
  minSize: number;
  maxSize: number;
  isMotionLockedRef: RefObject<boolean>;
  notifyAnimationComplete: () => void;
}

/** 侧栏开合：过渡期间放宽面板下限，结束后解除尺寸回写锁。 */
export function useSidebarCollapseMotion({
  collapsed,
  transitioning,
  expandedWidth,
  collapsedWidth,
  minSize = SIDEBAR_MIN_WIDTH,
  maxSize = SIDEBAR_MAX_WIDTH,
}: UseSidebarCollapseMotionOptions): SidebarCollapseMotion {
  const isMotionLockedRef = useRef(false);
  const isFirstCollapsedEffectRef = useRef(true);

  /**
   * @wisepen-manual-effect
   * 执行时机：折叠态切换时锁定运动。
   * 不可替代原因：插值期间挡住布局回写，避免动画帧尺寸被持久化为用户拖拽宽度。
   * cleanup：无。
   */
  useEffect(() => {
    if (isFirstCollapsedEffectRef.current) {
      isFirstCollapsedEffectRef.current = false;
      return;
    }
    isMotionLockedRef.current = true;
  }, [collapsed]);

  return {
    panelSize: collapsed ? collapsedWidth : expandedWidth,
    minSize: collapsed || transitioning ? collapsedWidth : minSize,
    maxSize,
    isMotionLockedRef,
    notifyAnimationComplete: () => {
      isMotionLockedRef.current = false;
    },
  };
}
