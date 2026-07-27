import {
  LAYOUT_DENSITY,
  LAYOUT_HEIGHT_DENSITY,
  resolveLayoutDensity,
  resolveLayoutHeightDensity,
  type LayoutDensity,
  type LayoutHeightDensity,
} from '@/constants/layoutScale';
import { syncViewportLayoutScale } from '@/layouts/_common/applyLayoutScaleCssVars';
import { useEffect, useState } from 'react';

interface ViewportLayoutScale {
  widthDensity: LayoutDensity;
  heightDensity: LayoutHeightDensity;
}

/**
 * 将视口宽高密度同步到 documentElement（data-layout-* + CSS 变量）。
 */
export const useViewportLayoutScale = (): ViewportLayoutScale => {
  const [scale, setScale] = useState<ViewportLayoutScale>(() => {
    if (typeof window === 'undefined') {
      return {
        widthDensity: LAYOUT_DENSITY.NORMAL,
        heightDensity: LAYOUT_HEIGHT_DENSITY.NORMAL,
      };
    }
    return {
      widthDensity: resolveLayoutDensity(window.innerWidth),
      heightDensity: resolveLayoutHeightDensity(window.innerHeight),
    };
  });

  /**
   * @wisepen-manual-effect
   * 执行时机：组件挂载时读取视口，并在浏览器 resize 后更新布局密度。
   * 不可替代原因：window 尺寸是 React 外部可变状态，只能通过浏览器事件订阅。
   * cleanup：组件卸载时移除 resize 监听器。
   */
  useEffect(() => {
    const sync = () => {
      const next = syncViewportLayoutScale();
      setScale((prev) =>
        prev.widthDensity === next.widthDensity && prev.heightDensity === next.heightDensity
          ? prev
          : next
      );
    };

    sync();
    window.addEventListener('resize', sync);
    return () => window.removeEventListener('resize', sync);
  }, []);

  return scale;
};
