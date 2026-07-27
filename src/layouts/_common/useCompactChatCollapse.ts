import { LAYOUT_DENSITY, type LayoutDensity } from '@/constants/layoutScale';
import { useMemoizedFn } from 'ahooks';
import { useEffect, useRef } from 'react';

interface UseCompactChatCollapseOptions {
  density: LayoutDensity;
  /** 当前是否有可展示的 Chat */
  shouldRenderChatPanel: boolean;
  chatPanelCollapsed: boolean;
  setChatPanelCollapsed: (collapsed: boolean) => void;
}

interface UseCompactChatCollapseResult {
  /** 用户手动唤出/收起 Chat 时调用，避免密度逻辑立刻再次收起或误展开 */
  markChatUserOverride: () => void;
}

/**
 * 跟随宽屏密度：进入 compact 自动收起 Chat
 */
export const useCompactChatCollapse = ({
  density,
  shouldRenderChatPanel,
  chatPanelCollapsed,
  setChatPanelCollapsed,
}: UseCompactChatCollapseOptions): UseCompactChatCollapseResult => {
  const collapsedByDensityRef = useRef(density === LAYOUT_DENSITY.COMPACT);
  const prevDensityRef = useRef(density);

  /**
   * @wisepen-manual-effect
   * 执行时机：布局密度变化时按自动折叠来源同步聊天面板 store。
   * 不可替代原因：密度与聊天面板分别由不同 hook/store 管理，还需保留用户覆盖标记。
   * cleanup：没有订阅或延迟任务，无需清理。
   */
  useEffect(() => {
    const prevDensity = prevDensityRef.current;
    if (prevDensity === density) return;
    prevDensityRef.current = density;

    if (density === LAYOUT_DENSITY.COMPACT) {
      collapsedByDensityRef.current = true;
      if (shouldRenderChatPanel && !chatPanelCollapsed) {
        setChatPanelCollapsed(true);
      }
      return;
    }

    if (collapsedByDensityRef.current && shouldRenderChatPanel) {
      collapsedByDensityRef.current = false;
      setChatPanelCollapsed(false);
    }
  }, [chatPanelCollapsed, density, setChatPanelCollapsed, shouldRenderChatPanel]);

  const markChatUserOverride = useMemoizedFn(() => {
    collapsedByDensityRef.current = false;
  });

  return { markChatUserOverride };
};
