import type { RefObject } from 'react';
import { useLayoutEffect, useRef } from 'react';
import createGlassHelix from './createGlassHelix';
import styles from './style.module.less';

type GlassBackdropProps = {
  /** 背景带上端 section（#ai） */
  fromRef: RefObject<HTMLElement | null>;
  /** 背景带下端 section（#faq） */
  toRef: RefObject<HTMLElement | null>;
};

export default function GlassBackdrop({ fromRef, toRef }: GlassBackdropProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  /**
   * @wisepen-manual-effect 依赖为稳定 ref 对象，仅在挂载时装配一次
   * 挂载后初始化 three.js 磨砂玻璃螺旋背景带（createGlassHelix 全生命周期）。
   * 不可替代原因：GL 生命周期（context loss、RAF、observers）只在挂载时装配一次；
   * cleanup 停 RAF、断开 observers、移除监听、释放 renderer/几何/材质；
   * 不 loseContext 以保护 HMR。
   *
   * 时序说明：本组件是 `<main>` 的首个子元素，其 useLayoutEffect 先于后续兄弟
   * section（#ai/#faq）的 ref 附着执行——同步读 ref 必为 null。因此改用 RAF 逐帧
   * 重试直到两个 section ref 就绪再初始化（首个可用的下一帧即完成，无视觉闪烁）。
   */
  useLayoutEffect(() => {
    let disposed = false;
    let rafId = 0;
    let stop: (() => void) | undefined;
    let attempts = 0;

    const tryInit = () => {
      if (disposed) return;
      const canvas = canvasRef.current;
      const fromEl = fromRef.current;
      const toEl = toRef.current;
      if (canvas && fromEl && toEl) {
        stop = createGlassHelix(canvas, fromEl, toEl);
        return;
      }
      if (++attempts > 120) {
        // 约 2 秒内兄弟 section 仍未挂载 → 装饰性静默降级，不阻塞页面。
        console.warn('[GlassBackdrop] 等待 #ai/#faq section 挂载超时，跳过装饰背景。');
        return;
      }
      rafId = requestAnimationFrame(tryInit);
    };
    rafId = requestAnimationFrame(tryInit);

    return () => {
      disposed = true;
      cancelAnimationFrame(rafId);
      if (stop) stop();
    };
  }, [fromRef, toRef]);

  return <canvas ref={canvasRef} className={styles.glassBackdrop} aria-hidden="true" />;
}
