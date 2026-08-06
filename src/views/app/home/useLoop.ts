import { useEffect, useRef, useState } from 'react';

/**
 * 检测系统是否开启了「减少动态效果」。
 * 用于：偏好开启时跳过动画循环、数字滚动直接显示终值。
 */
export function usePrefersReducedMotion(): boolean {
  // 初始值在渲染时一次性读取，避免在 effect 体内同步 setState
  const [reduced, setReduced] = useState(
    () =>
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );

  /**
   * @wisepen-manual-effect
   * 执行时机：组件挂载后注册系统减弱动效偏好监听，偏好变化时更新状态。
   * 不可替代原因：matchMedia 是浏览器外部系统，只能通过 change 事件感知偏好变化。
   * cleanup：移除本轮注册的 change 监听器，避免卸载后 setState。
   */
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(mq.matches);
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  return reduced;
}

/**
 * 类阶段时间轴：按 durations 逐段推进 step 索引。
 * - paused：离开视口时冻结计时器，保持当前阶段
 * - reduced：不做循环，直接返回终态（最后一段索引）
 */
export function useLoop(
  durations: number[],
  { paused = false, repeat = true }: { paused?: boolean; repeat?: boolean } = {}
): number {
  const reduced = usePrefersReducedMotion();
  // durations 视为挂载时确定、不随渲染变化的常量，用 ref 稳定引用以免计时器被每次渲染重置
  const durationsRef = useRef(durations);
  const [step, setStep] = useState(0);

  /**
   * @wisepen-manual-effect
   * 执行时机：paused/reduced 变化或挂载时，按 durations 启动 setTimeout 链推进阶段。
   * 不可替代原因：循环演出必须按固定时长推进阶段，setTimeout 是唯一的时序来源。
   * cleanup：置 stopped 标志并清除未决定时器，避免卸载后 setState。
   */
  useEffect(() => {
    if (reduced || paused) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const tick = (s: number) => {
      timer = setTimeout(() => {
        if (stopped) return;
        const next = s + 1;
        if (next >= durationsRef.current.length) {
          if (!repeat) return;
          setStep(0);
          tick(0);
          return;
        }
        setStep(next);
        tick(next);
      }, durationsRef.current[s] ?? 1000);
    };
    // 用 0ms 定时器归零起点，避免在 effect 体内同步 setState
    timer = setTimeout(() => {
      setStep(0);
      tick(0);
    }, 0);
    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
    };
  }, [paused, reduced, repeat]);

  // reduced 时不做循环演出，直接停在终态（全部可见）
  return reduced ? durations.length - 1 : step;
}
