import type { RefObject } from 'react';
import { useEffect, useRef } from 'react';
import type { PanelImperativeHandle } from 'react-resizable-panels';

import { PANEL_RESIZE_DURATION_MS } from '@/constants/layoutMotion';

type ResizablePanelSize = number | string;

interface UseResizablePanelSizeOptions {
  panelRef: RefObject<PanelImperativeHandle | null>;
  size: ResizablePanelSize;
  enabled?: boolean;
  /** 程序化改尺寸时是否缓动（拖拽分栏勿开） */
  animate?: boolean;
  /** 缓动时长 ms，仅 animate 时生效 */
  durationMs?: number;
  /**
   * 本次尺寸同步结束（插值到达目标或瞬时写入完成）。
   * 经 ref 读取，不进入 resize effect 依赖。
   */
  onComplete?: () => void;
}

// 两端速度归零，避免收起时加速撞边或提前吸附。
const easeInOut = (t: number): number => t * t * (3 - 2 * t);

const toPixelSize = (size: ResizablePanelSize): number | null =>
  typeof size === 'number' && Number.isFinite(size) ? size : null;

export function useResizablePanelSize({
  panelRef,
  size,
  enabled = true,
  animate = false,
  durationMs = PANEL_RESIZE_DURATION_MS,
  onComplete,
}: UseResizablePanelSizeOptions) {
  const frameRef = useRef<number | null>(null);
  const onCompleteRef = useRef(onComplete);

  /**
   * @wisepen-manual-effect
   * 执行时机：回调引用变化时更新 ref，供 resize 动画帧读取最新回调。
   * 不可替代原因：不能把回调放进 resize effect 依赖，否则会打断插值。
   * cleanup：无。
   */
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  /**
   * @wisepen-manual-effect
   * 执行时机：受控尺寸或启用状态变化时，同步命令式面板尺寸。
   * 不可替代原因：react-resizable-panels 通过 imperative handle 管理布局，不属于 React 渲染输出。
   * cleanup：取消进行中的 rAF 动画，避免卸载后改尺寸。
   */
  useEffect(() => {
    if (!enabled) return;

    const cancelFrame = () => {
      if (frameRef.current != null) {
        window.cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };

    const finish = () => {
      frameRef.current = window.requestAnimationFrame(() => {
        frameRef.current = null;
        onCompleteRef.current?.();
      });
    };

    const resizeTo = (next: ResizablePanelSize) => {
      const nextPx = toPixelSize(next);
      if (nextPx != null) {
        const current = panelRef.current?.getSize().inPixels;
        if (current != null && Math.abs(current - nextPx) < 0.5) {
          return;
        }
      }
      panelRef.current?.resize(next);
    };

    const panel = panelRef.current;
    if (!panel) {
      frameRef.current = window.requestAnimationFrame(() => {
        resizeTo(size);
        finish();
      });
      return cancelFrame;
    }

    const targetPx = toPixelSize(size);
    const currentPx = panel.getSize().inPixels;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (
      !animate ||
      reducedMotion ||
      durationMs <= 0 ||
      targetPx == null ||
      !Number.isFinite(currentPx)
    ) {
      resizeTo(size);
      finish();
      return cancelFrame;
    }

    const endPx = Math.round(targetPx);
    const startPx = currentPx;
    const delta = endPx - startPx;
    if (Math.abs(delta) < 0.5) {
      resizeTo(endPx);
      finish();
      return cancelFrame;
    }

    let startedAt: number | null = null;
    let lastRounded = Math.round(startPx);
    const tick = (now: number) => {
      if (startedAt == null) startedAt = now;
      const progress = Math.min(1, (now - startedAt) / durationMs);
      const next = startPx + delta * easeInOut(progress);

      if (progress >= 1) {
        if (lastRounded !== endPx) {
          lastRounded = endPx;
          resizeTo(endPx);
        }
        finish();
        return;
      }

      const rounded = Math.round(next);
      if (rounded !== lastRounded) {
        lastRounded = rounded;
        resizeTo(rounded);
      }
      frameRef.current = window.requestAnimationFrame(tick);
    };

    frameRef.current = window.requestAnimationFrame(tick);
    return cancelFrame;
  }, [animate, durationMs, enabled, panelRef, size]);
}
