import { LAYOUT_DENSITY, resolveLayoutDensity, type LayoutDensity } from '@/constants/layoutScale';
import { useMemoizedFn } from 'ahooks';
import type { Dispatch, SetStateAction } from 'react';
import { useEffect, useRef, useState } from 'react';

interface UseCompactSidebarCollapseOptions {
  sidebarCollapsed: boolean;
  setSidebarCollapsed: Dispatch<SetStateAction<boolean>>;
  /** 密度自动收起前调用（例如持久化当前侧栏像素宽） */
  onAutoCollapse?: () => void;
}

interface UseCompactSidebarCollapseResult {
  density: LayoutDensity;
  /**
   * 用户手动点切换时调用：
   */
  markSidebarUserOverride: () => void;
}

/**
 * 窄屏（compact）自动收起侧栏
 */
export const useCompactSidebarCollapse = ({
  sidebarCollapsed: _sidebarCollapsed,
  setSidebarCollapsed,
  onAutoCollapse,
}: UseCompactSidebarCollapseOptions): UseCompactSidebarCollapseResult => {
  const [density, setDensity] = useState<LayoutDensity>(() =>
    typeof window === 'undefined' ? LAYOUT_DENSITY.NORMAL : resolveLayoutDensity(window.innerWidth)
  );
  const collapsedByDensityRef = useRef(density === LAYOUT_DENSITY.COMPACT);
  const runAutoCollapse = useMemoizedFn(() => onAutoCollapse?.());

  /**
   * @wisepen-manual-effect
   * 执行时机：组件挂载及浏览器 resize 时重新判定侧栏布局密度。
   * 不可替代原因：window 宽度是 React 外部状态，并需协调侧栏折叠与用户覆盖标记。
   * cleanup：组件卸载时移除 resize 监听器。
   */
  useEffect(() => {
    const syncDensity = () => {
      const nextDensity = resolveLayoutDensity(window.innerWidth);

      setDensity((prev) => {
        if (prev === nextDensity) return prev;

        if (nextDensity === LAYOUT_DENSITY.COMPACT) {
          setSidebarCollapsed((collapsed) => {
            if (!collapsed) {
              runAutoCollapse();
              collapsedByDensityRef.current = true;
              return true;
            }
            // 已收起：视为由密度接管，宽屏回来时可自动展开
            collapsedByDensityRef.current = true;
            return collapsed;
          });
        } else if (collapsedByDensityRef.current) {
          collapsedByDensityRef.current = false;
          setSidebarCollapsed(false);
        }

        return nextDensity;
      });
    };

    syncDensity();
    window.addEventListener('resize', syncDensity);
    return () => window.removeEventListener('resize', syncDensity);
  }, [runAutoCollapse, setSidebarCollapsed]);

  const markSidebarUserOverride = useMemoizedFn(() => {
    collapsedByDensityRef.current = false;
  });

  return {
    density,
    markSidebarUserOverride,
  };
};
