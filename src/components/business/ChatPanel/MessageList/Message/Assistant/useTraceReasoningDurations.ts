import { useEffect, useRef, useState } from 'react';

import type { TraceItem } from './traceModel';

/**
 * 本地兜底测量推理耗时。
 *
 * 后端只在历史 metadata 里透出 `reasoningDurationSeconds`，实时流没有该字段，
 * 因此这里按推理节点开始 / 结束的时钟差值补一个秒数，供折叠后的过程行展示“思考了 N 秒”。
 */
export function useTraceReasoningDurations(items: readonly TraceItem[]): Record<string, number> {
  const startedAtRef = useRef<Record<string, number>>({});
  const [durations, setDurations] = useState<Record<string, number>>({});

  /**
   * @wisepen-manual-effect
   * 执行时机：推理节点开始流式或结束流式时读取时钟。
   * 不可替代原因：耗时依赖真实时钟区间，无法在渲染期从 props 派生；事件回调里拿不到节点结束时机。
   * cleanup：不订阅外部资源，无需清理。
   */
  useEffect(() => {
    const startedAt = startedAtRef.current;
    const now = Date.now();
    const settled: Record<string, number> = {};

    items.forEach((item) => {
      if (item.kind !== 'reasoning') return;
      if (item.streaming) {
        if (startedAt[item.key] === undefined) startedAt[item.key] = now;
        return;
      }
      const start = startedAt[item.key];
      if (start === undefined) return;
      delete startedAt[item.key];
      settled[item.key] = Math.max(1, Math.round((now - start) / 1000));
    });

    if (Object.keys(settled).length === 0) return;
    setDurations((current) => ({ ...current, ...settled }));
  }, [items]);

  return durations;
}
