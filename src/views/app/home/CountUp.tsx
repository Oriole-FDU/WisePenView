import { useEffect, useRef, useState } from 'react';
import { usePrefersReducedMotion } from './useLoop';

type CountUpProps = {
  to: number;
  duration?: number;
  className?: string;
};

/**
 * 数字滚动：进入视口后从 0 滚到目标值（ease-out）。
 * 系统减弱动效 / 无 IntersectionObserver 环境直接显示终值。
 */
export default function CountUp({ to, duration = 1100, className }: CountUpProps) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const reduced = usePrefersReducedMotion();
  // 减弱动效或无 IO 时不滚动，直接渲染终值
  const canAnimate = !reduced && typeof IntersectionObserver !== 'undefined';
  const [value, setValue] = useState(0);

  /**
   * @wisepen-manual-effect
   * 执行时机：可滚动且挂载时，用 IO 观察数字，进入视口后以 rAF 从 0 滚到目标值。
   * 不可替代原因：计数动画须在 IO 回调里手动驱动 rAF 帧循环，无事件可替代。
   * cleanup：断开观察器并取消未决 rAF，避免卸载后 setState。
   */
  useEffect(() => {
    if (!canAnimate) return;
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting) return;
        observer.disconnect();
        const start = performance.now();
        const tick = (now: number) => {
          const p = Math.min(1, (now - start) / duration);
          const eased = 1 - Math.pow(1 - p, 3);
          setValue(Math.round(to * eased));
          if (p < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      },
      { threshold: 0.4 }
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [canAnimate, to, duration]);

  return (
    <span ref={ref} className={className}>
      {canAnimate ? value : to}
    </span>
  );
}
