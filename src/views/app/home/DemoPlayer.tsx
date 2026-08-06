import { useEffect, useState } from 'react';
import { useLoop } from './useLoop';

type DemoPlayerProps = {
  /** 目标 demo 容器上的 data-demo 值，例如 'hero'、'ai' */
  target: string;
  /** 每段演出时长（ms），最后一段即「完成/全部可见」终态 */
  steps: number[];
  repeat?: boolean;
};

/**
 * 演示循环编排器：给目标容器打 data-step 阶段标记（渲染为空节点，不影响布局），
 * 由 CSS 后代选择器按阶段驱动动画。循环只在视口内运行，离开即暂停。
 * 目标通过 data-demo 属性定位（类名编译后会哈希，不能用 querySelector 匹配类名）。
 */
export default function DemoPlayer({ target, steps, repeat = true }: DemoPlayerProps) {
  // 无 IntersectionObserver 环境视为始终在视口内，直接让循环运行
  const ioUnavailable = typeof IntersectionObserver === 'undefined';
  const [inView, setInView] = useState(ioUnavailable);
  const step = useLoop(steps, { paused: !inView, repeat });

  /**
   * @wisepen-manual-effect
   * 执行时机：挂载时按 data-demo 定位目标并用 IO 跟踪可见性，驱动循环启停。
   * 不可替代原因：循环启停必须随视口可见性变化，IO 是唯一可靠方式。
   * cleanup：断开观察器。
   */
  useEffect(() => {
    if (ioUnavailable) return;
    const el = document.querySelector<HTMLElement>(`[data-demo="${target}"]`);
    if (!el) return;
    const observer = new IntersectionObserver((entries) => setInView(entries[0].isIntersecting), {
      threshold: 0.15,
      rootMargin: '0px 0px -8% 0px',
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [ioUnavailable, target]);

  /**
   * @wisepen-manual-effect
   * 执行时机：step 变化时把阶段标记写到目标容器。
   * 不可替代原因：演出由 CSS [data-step] 选择器驱动，需直接操作 DOM 属性，不参与渲染。
   * cleanup：无需额外清理（数据属性随 DOM 一起移除）。
   */
  useEffect(() => {
    const el = document.querySelector<HTMLElement>(`[data-demo="${target}"]`);
    if (el) el.setAttribute('data-step', String(step));
  }, [step, target]);

  return null;
}
