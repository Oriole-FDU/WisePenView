import type { RefObject } from 'react';
import { useEffect } from 'react';
import type { PanelImperativeHandle } from 'react-resizable-panels';

type ResizablePanelSize = number | string;

interface UseResizablePanelSizeOptions {
  panelRef: RefObject<PanelImperativeHandle | null>;
  size: ResizablePanelSize;
  enabled?: boolean;
}

/** 同步外部折叠状态到 react-resizable-panels 的命令式尺寸模型。 */
export function useResizablePanelSize({
  panelRef,
  size,
  enabled = true,
}: UseResizablePanelSizeOptions) {
  /**
   * @wisepen-manual-effect
   * 执行时机：受控尺寸或启用状态变化时，同步命令式面板尺寸。
   * 不可替代原因：react-resizable-panels 通过 imperative handle 管理布局，不属于 React 渲染输出。
   * cleanup：取消下一帧的补偿 resize，避免卸载或新尺寸生效后执行过期命令。
   */
  useEffect(() => {
    if (!enabled) return;
    const resizePanel = () => panelRef.current?.resize(size);
    resizePanel();
    const resizeFrame = window.requestAnimationFrame(resizePanel);
    return () => window.cancelAnimationFrame(resizeFrame);
  }, [enabled, panelRef, size]);
}
