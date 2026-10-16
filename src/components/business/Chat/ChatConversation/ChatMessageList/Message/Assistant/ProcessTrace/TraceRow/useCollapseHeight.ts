import { useCallback, useLayoutEffect, useRef } from 'react';

const COLLAPSE_MS = 200;
const COLLAPSE_EASE = 'cubic-bezier(0.32, 0.72, 0, 1)';

/**
 * 折叠面板的高度控制，返回挂到面板上的 ref。
 *
 * 面板会在折叠状态下后挂载：流式时先只有单节点正文，随后才切成多节点的明细列表。
 * 因此初始高度必须由 ref 回调在元素挂载当帧补齐——只依赖 open 的副作用不会因为元素出现而重跑，
 * 漏掉初始化时面板会一直保持 auto 高度，折叠态看起来始终是展开的。
 */
export function useCollapseHeight(open: boolean) {
  const elementRef = useRef<HTMLDivElement | null>(null);
  const openRef = useRef(open);

  /**
   * @wisepen-manual-memo
   * 为什么：ref 回调的身份是 React 的挂载契约，身份变化时 React 会先以 null 卸载再重新挂载，
   * 直接把刚写好的折叠高度重置成 auto；而展开/收起恰好发生在组件重渲染期间。
   * 收益：回调只在面板挂载、卸载时执行，可以在元素后挂载当帧补齐初始高度，同时不打断收起动画。
   * 失效条件：改用 useRef 对象或让回调依赖 open 时，元素后挂载不会再执行初始化，
   * 折叠态会一直保持 auto 高度而始终展开。
   */
  const attachPanel = useCallback((element: HTMLDivElement | null) => {
    elementRef.current = element;
    if (!element) return;

    element.style.overflow = 'hidden';
    element.style.transition = 'none';
    element.style.height = openRef.current ? 'auto' : '0px';
  }, []);

  useLayoutEffect(() => {
    const element = elementRef.current;

    if (!element) {
      // 面板尚未挂载：只记录最新展开态，等挂载当帧由 ref 回调初始化高度
      openRef.current = open;
      return;
    }

    // ref 已负责挂载初始化；后挂载面板的首次展开也必须走状态切换，不能再跳过一次。
    if (openRef.current === open) return;
    openRef.current = open;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduceMotion) {
      element.style.transition = 'none';
      element.style.height = open ? 'auto' : '0px';
      return;
    }

    let cancelled = false;
    let endTimer = 0;

    const clearTransition = () => {
      if (cancelled) return;
      element.style.transition = '';
    };

    if (open) {
      element.style.overflow = 'hidden';
      element.style.height = '0px';
      element.style.transition = 'none';
      // 强制 reflow，再开启动画
      void element.offsetHeight;
      const target = element.scrollHeight;
      if (target === 0) {
        // 子节点尚未完成布局时 scrollHeight 可能暂时为 0，不能把已展开面板锁死。
        element.style.height = 'auto';
        return;
      }
      element.style.transition = `height ${COLLAPSE_MS}ms ${COLLAPSE_EASE}`;
      element.style.height = `${target}px`;
      endTimer = window.setTimeout(() => {
        if (cancelled || !openRef.current) return;
        element.style.height = 'auto';
        clearTransition();
      }, COLLAPSE_MS);
    } else {
      const current = element.scrollHeight;
      element.style.overflow = 'hidden';
      element.style.height = `${current}px`;
      element.style.transition = 'none';
      void element.offsetHeight;
      element.style.transition = `height ${COLLAPSE_MS}ms ${COLLAPSE_EASE}`;
      element.style.height = '0px';
      endTimer = window.setTimeout(clearTransition, COLLAPSE_MS);
    }

    return () => {
      cancelled = true;
      window.clearTimeout(endTimer);
      // 动画被重新执行或卸载打断时，先落到本次目标态，避免保留临时像素高度。
      element.style.height = open ? 'auto' : '0px';
      element.style.transition = '';
    };
  }, [open]);

  return attachPanel;
}
