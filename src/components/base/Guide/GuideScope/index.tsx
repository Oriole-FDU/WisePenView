import { useEffect } from 'react';

import { GUIDE_TOURS } from '@/constants/tour';

import { registerPageTour } from '../activePageTourStore';
import { findGuideTarget } from '../findGuideTarget';
import type { GuideScopeProps } from './index.type';

const TARGET_READY_POLL_MS = 100;

/** 页面出口上的薄层：按 tourId 登记当前页的指引，不渲染 Joyride。 */
export function GuideScope({ tourId, readyToolId, children }: GuideScopeProps) {
  /**
   * @wisepen-manual-effect
   * 执行时机：页面挂载或 tourId 变化时等待就绪锚点可见，再登记指引。
   * 不可替代原因：路由边界会早于页面内容和锚点挂载；Joyride 找不到首步目标时会自动跳到下一步，
   * 必须等页面真正具备引导条件后再启动。DOM 可见性是异步资源加载完成的直接信号。
   * cleanup：取消目标轮询并撤销登记，避免离开页面后继续播放该页指引。
   */
  useEffect(() => {
    if (!tourId) return undefined;

    const targetId = readyToolId ?? GUIDE_TOURS[tourId].steps[0]?.toolId;
    if (!targetId || findGuideTarget(targetId)) {
      return registerPageTour(tourId);
    }

    let pollTimer = 0;
    let unregister: (() => void) | undefined;
    const registerWhenReady = () => {
      if (!findGuideTarget(targetId)) {
        pollTimer = window.setTimeout(registerWhenReady, TARGET_READY_POLL_MS);
        return;
      }
      unregister = registerPageTour(tourId);
    };
    registerWhenReady();

    return () => {
      window.clearTimeout(pollTimer);
      unregister?.();
    };
  }, [readyToolId, tourId]);

  return children;
}
